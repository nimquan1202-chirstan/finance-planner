import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDateRange } from "@/lib/finance";
import { transactionFilterSchema } from "@/lib/validation";
import { getSession } from "@/lib/dal";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  // Yêu cầu xác thực: chưa đăng nhập thì trả 401 Unauthorized
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: "Chưa đăng nhập" },
      { status: 401 },
    );
  }

  const parsed = transactionFilterSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return Response.json(
      { error: "Tham số lọc không hợp lệ" },
      { status: 400 },
    );
  }

  const { range, q, sort, ...rest } = parsed.data;
  const where: Prisma.TransactionWhereInput = {
    userId: session.user.id,
    date: getDateRange(range),
    ...rest,
  };

  if (q) {
    where.description = { contains: q, mode: "insensitive" };
  }

  const rows = await prisma.transaction.findMany({
    where,
    orderBy: { date: sort || "desc" },
  });

  const format = request.nextUrl.searchParams.get("format");
  if (format === "csv") {
    const headers = ["id", "type", "amount", "description", "category", "date"];
    const csvLines = rows.map((r) =>
      [
        r.id,
        r.type,
        r.amount,
        `"${(r.description ?? "").replace(/"/g, '""')}"`,
        r.category,
        new Date(r.date).toISOString(),
      ].join(","),
    );
    const csvContent = "\uFEFF" + [headers.join(","), ...csvLines].join("\n");
    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="transactions.csv"',
      },
    });
  }

  return Response.json(rows);
}
