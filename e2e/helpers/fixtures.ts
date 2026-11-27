import crypto from "node:crypto";

export function uniqueId(prefix = "e2e"): string {
  return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}+${Date.now()}_${crypto.randomUUID().slice(0, 8)}@example.com`;
}

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function daysAgoIso(days: number, now = new Date()): string {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days),
  );
  return d.toISOString().slice(0, 10);
}

export function futureMonthsIso(months: number, now = new Date()): string {
  const targetYear = now.getUTCFullYear();
  const targetMonthIndex = now.getUTCMonth() + months;
  const normalizedYear = targetYear + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(normalizedYear, normalizedMonth + 1, 0),
  ).getUTCDate();
  const day = Math.min(now.getUTCDate(), lastDayOfTargetMonth);
  const d = new Date(Date.UTC(normalizedYear, normalizedMonth, day));
  return d.toISOString().slice(0, 10);
}

export function pastIso(daysBack = 180, now = new Date()): string {
  return daysAgoIso(daysBack, now);
}

export function getCurrentYearMonth(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getPreviousYearMonth(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export interface SampleCsvRowInput {
  date: string;
  type: "INCOME" | "EXPENSE" | string;
  category: string;
  amount: string | number;
  description: string;
}

function quoteRawCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(
  rows: SampleCsvRowInput[],
  header = "date,type,category,amount,description",
): string {
  const lines = rows.map((r) =>
    [
      quoteRawCsvField(r.date),
      quoteRawCsvField(r.type),
      quoteRawCsvField(r.category),
      quoteRawCsvField(String(r.amount)),
      quoteRawCsvField(r.description),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

export function buildValidSampleCsv(now = new Date()): string {
  return buildCsv([
    {
      date: daysAgoIso(2, now),
      type: "INCOME",
      category: "SALARY",
      amount: 5_000_000,
      description: "Lương tháng",
    },
    {
      date: daysAgoIso(1, now),
      type: "EXPENSE",
      category: "FOOD",
      amount: 75_000,
      description: "Cơm trưa văn phòng",
    },
    {
      date: todayIso(now),
      type: "EXPENSE",
      category: "TRANSPORT",
      amount: 45_000,
      description: "Grab đi học",
    },
  ]);
}

export function buildOversizedCsv(minBytes = 1_048_577, now = new Date()): string {
  const header = "date,type,category,amount,description\n";
  const row = `${todayIso(now)},EXPENSE,FOOD,15000,Banh mi saigon ngon tuyet voi moi ngay\n`;
  const rowBytes = Buffer.byteLength(row, "utf8");
  const repeatCount = Math.ceil((minBytes - Buffer.byteLength(header, "utf8")) / rowBytes);
  return header + row.repeat(repeatCount);
}
