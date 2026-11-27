import * as z from "zod";
import {
  Category,
  TransactionType,
  Priority,
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
  error?: string;
  message?: string;
  errors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
};

// FormData → object chuỗi (để trả lại form khi lỗi)
export function readValues(data: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, val] of data.entries()) {
    obj[key] = String(val);
  }
  return obj;
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

// Wishlist validation
export const wishlistSchema = z.object({
  name: z.string().trim()
    .min(1, { error: "Nhập tên món đồ" })
    .max(100, { error: "Tối đa 100 ký tự" }),
  price: z.coerce.number()
    .int({ error: "Phải là số nguyên" })
    .positive({ error: "Giá phải lớn hơn 0" }),
  priority: z.enum(Priority).default("MEDIUM"),
  link: z.string().trim().optional(),
  targetDate: z.string().optional(),
});

export const updateWishlistSchema = wishlistSchema.extend({
  id: z.string().min(1, { error: "Thiếu ID món đồ" }),
  purchased: z.coerce.boolean().optional(),
});
