"use server";
import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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
  const values = readValues(formData);
  const parsed = transactionSchema.safeParse(values);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return { errors: flat.fieldErrors, values };
  }
  // Tạm dùng user mẫu; tuần 10 đổi sang requireUser()
  const demo = await prisma.user.findFirstOrThrow({
    where: { email: "demo@phy10615.vn" },
  });
  await prisma.transaction.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
      userId: demo.id,
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
  const id = formData.get("id") as string;
  const values = readValues(formData);
  const parsed = updateTransactionSchema.safeParse({ ...values, id });
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return { errors: flat.fieldErrors, values };
  }
  await prisma.transaction.update({
    where: { id: parsed.data.id },
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
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.transaction.delete({
    where: { id },
  });
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}
