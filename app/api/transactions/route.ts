import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDateRange } from "@/lib/finance";
import { transactionFilterSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const parsed = transactionFilterSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return Response.json(
      { error: "Tham số lọc không hợp lệ" },
      { status: 400 },
    );
  }
  const { range, ...rest } = parsed.data;
  const rows = await prisma.transaction.findMany({
    where: { date: getDateRange(range), ...rest },
    orderBy: { date: "desc" },
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
