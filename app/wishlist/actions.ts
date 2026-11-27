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

  const targetDateVal =
    parsed.data.targetDate && parsed.data.targetDate.trim() !== ""
      ? new Date(parsed.data.targetDate)
      : null;

  await prisma.wishlistItem.create({
    data: {
      name: parsed.data.name,
      price: parsed.data.price,
      priority: parsed.data.priority,
      link: parsed.data.link || null,
      targetDate: targetDateVal,
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
  const rawId = formData.get("id");
  const id = typeof rawId === "string" ? rawId.trim() : "";
  const values = readValues(formData);
  const parsed = updateWishlistSchema.safeParse({ ...values, id });

  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return { ok: false, errors: flat.fieldErrors, values };
  }

  const targetDateVal =
    parsed.data.targetDate && parsed.data.targetDate.trim() !== ""
      ? new Date(parsed.data.targetDate)
      : null;

  // Chống IDOR: updateMany theo id và userId
  const result = await prisma.wishlistItem.updateMany({
    where: { id: parsed.data.id, userId: user.id },
    data: {
      name: parsed.data.name,
      price: parsed.data.price,
      priority: parsed.data.priority,
      link: parsed.data.link || null,
      targetDate: targetDateVal,
    },
  });

  if (result.count === 0) {
    return {
      ok: false,
      error: "Không tìm thấy mục tiêu hoặc bạn không có quyền sửa",
      values,
    };
  }

  revalidatePath("/wishlist");
  revalidatePath("/dashboard");
  return { ok: true, message: "Đã cập nhật mục tiêu" };
}

export async function deleteWishlistItem(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const rawId = formData.get("id");
  const id = typeof rawId === "string" ? rawId.trim() : "";
  if (!id) {
    return { ok: false, error: "Thiếu ID mục tiêu" };
  }

  // Chống IDOR: deleteMany với where: { id, userId: user.id }
  const result = await prisma.wishlistItem.deleteMany({
    where: { id, userId: user.id },
  });

  if (result.count === 0) {
    return {
      ok: false,
      error: "Không tìm thấy mục tiêu hoặc bạn không có quyền xoá",
    };
  }

  revalidatePath("/wishlist");
  revalidatePath("/dashboard");
  return { ok: true };
}
