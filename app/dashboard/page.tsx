import { prisma } from '@/lib/prisma';
import { formatVND } from '@/lib/finance';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [thu, chi, theo] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'INCOME' },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'EXPENSE' },
    }),
    prisma.transaction.groupBy({
      by: ['category'],
      _sum: { amount: true },
      where: { type: 'EXPENSE' },
      orderBy: { _sum: { amount: 'desc' } },
    }),
  ]);

  const soDu =
    (thu._sum.amount ?? 0) - (chi._sum.amount ?? 0);

  return (
    <main className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="space-y-2">
        <p>Tổng thu: {formatVND(thu._sum.amount ?? 0)}</p>
        <p>Tổng chi: {formatVND(chi._sum.amount ?? 0)}</p>
        <p className="font-bold text-lg">
          Số dư: {formatVND(soDu)}
        </p>
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">Chi tiêu theo danh mục:</h2>
      <ul className="mt-2 list-disc list-inside space-y-1">
        {theo.map((d) => (
          <li key={d.category}>
            <span className="font-medium">{d.category}</span>: {formatVND(d._sum.amount ?? 0)}
          </li>
        ))}
      </ul>
    </main>
  );
}
