import * as z from "zod";
import {
  Category, TransactionType,
} from "@/generated/prisma/enums";

export const transactionSchema = z.object({
  type: z.enum(TransactionType, { error: "Chọn loại giao dịch" }),
  amount: z.coerce.number()
    .int({ error: "Phải là số nguyên" })
    .positive({ error: "Phải lớn hơn 0" }),
  description: z.string().trim()
    .min(1, { error: "Nhập mô tả" })
    .max(120, { error: "Tối đa 120 ký tự" }),
  category: z.enum(Category, { error: "Chọn danh mục" }),
  date: z.iso.date({ error: "Ngày không hợp lệ" }),
});

export const updateTransactionSchema = transactionSchema.extend({
  id: z.string().min(1, { error: "Thiếu ID giao dịch" }),
});

type Field = keyof z.infer<typeof transactionSchema>;
type Values = Partial<Record<Field, string>>;

// Kết quả action trả về cho form sau mỗi lần gửi
export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Partial<Record<Field, string[]>>;
  values?: Values;
};

// FormData → object chuỗi (để trả lại form khi lỗi)
export function readValues(data: FormData): Values {
  const fields = Object.keys(transactionSchema.shape);
  return Object.fromEntries(
    fields.map((f) => [f, String(data.get(f) ?? "")]),
  );
}

// Bộ lọc đọc từ URL: /transactions?range=…&type=…&category=…&q=…&sort=…
export const RANGES = ["this-month", "last-month", "all"] as const;

export const transactionFilterSchema = z.object({
  range: z.enum(RANGES).default("this-month"),
  type: z.enum(TransactionType).optional(),
  category: z.enum(Category).optional(),
  q: z.string().optional(),
  sort: z.enum(["desc", "asc"]).default("desc"),
});

export type Filters = z.infer<typeof transactionFilterSchema>;
