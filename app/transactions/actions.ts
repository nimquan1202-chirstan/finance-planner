"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import {
  readValues,
  transactionSchema,
  updateTransactionSchema,
  type FormState,
} from "@/lib/validation";

export async function createTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const values = readValues(formData);
  const parsed = transactionSchema.safeParse(values);

  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return { errors: flat.fieldErrors, values };
  }

  await prisma.transaction.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
      userId: user.id,
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { ok: true, message: "Đã thêm giao dịch thành công" };
}

export async function updateTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const id = formData.get("id") as string;
  const values = readValues(formData);
  const parsed = updateTransactionSchema.safeParse({ ...values, id });

  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return { errors: flat.fieldErrors, values };
  }

  // Chống IDOR: updateMany theo id và userId của người dùng hiện tại
  await prisma.transaction.updateMany({
    where: { id: parsed.data.id, userId: user.id },
    data: {
      amount: parsed.data.amount,
      type: parsed.data.type,
      category: parsed.data.category,
      description: parsed.data.description,
      date: new Date(parsed.data.date),
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { ok: true, message: "Đã cập nhật giao dịch" };
}

export async function deleteTransaction(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id") as string;
  if (!id) return;

  // Chống IDOR: deleteMany với where: { id, userId: user.id }
  await prisma.transaction.deleteMany({
    where: { id, userId: user.id },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}
