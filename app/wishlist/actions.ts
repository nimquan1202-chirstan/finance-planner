"use server";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  wishlistSchema,
  updateWishlistSchema,
  readValues,
  type FormState,
} from "@/lib/validation";
import * as z from "zod";
import { revalidatePath } from "next/cache";

export async function createWishlistItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const values = readValues(formData);
  const parsed = wishlistSchema.safeParse(values);

  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return { errors: flat.fieldErrors, values };
  }

  await prisma.wishlistItem.create({
    data: {
      name: parsed.data.name,
      price: parsed.data.price,
      priority: parsed.data.priority,
      link: parsed.data.link || null,
      userId: user.id,
    },
  });

  revalidatePath("/wishlist");
  revalidatePath("/dashboard");
  return { ok: true, message: "Đã thêm mục tiêu mua sắm mới!" };
}

export async function updateWishlistItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const values = readValues(formData);
  const parsed = updateWishlistSchema.safeParse({ ...values, id });

  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return { errors: flat.fieldErrors, values };
  }

  // Chống IDOR: updateMany theo id và userId
  await prisma.wishlistItem.updateMany({
    where: { id: parsed.data.id, userId: user.id },
    data: {
      name: parsed.data.name,
      price: parsed.data.price,
      priority: parsed.data.priority,
      link: parsed.data.link || null,
    },
  });

  revalidatePath("/wishlist");
  revalidatePath("/dashboard");
  return { ok: true, message: "Đã cập nhật mục tiêu" };
}

export async function deleteWishlistItem(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  if (!id) return;

  // Chống IDOR: deleteMany với where: { id, userId: user.id }
  await prisma.wishlistItem.deleteMany({
    where: { id, userId: user.id },
  });

  revalidatePath("/wishlist");
  revalidatePath("/dashboard");
}
