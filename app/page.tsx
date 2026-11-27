import Link from "next/link";
import { getSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatVND } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="bg-white border border-[#e6e4dc] rounded-2xl p-6 sm:p-8 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="space-y-2">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-[#183d2e]">
              Quản lý tài chính cá nhân
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight font-display">
              Finance Planner
            </h1>
            <p className="text-zinc-600 text-sm leading-relaxed max-w-xl">
              Sổ quản lý tài chính cá nhân đơn giản, trực quan và bảo mật. Theo dõi thu chi, kiểm soát cơ cấu ngân sách 50/30/20 và lập kế hoạch mục tiêu mua sắm thực tế.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-[#183d2e] hover:bg-[#204e3b] text-white font-medium text-xs transition shadow-xs"
            >
              Đăng nhập / Bắt đầu
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl border border-[#e2dfd5] bg-white hover:bg-[#f3f1ea] text-zinc-800 font-medium text-xs transition shadow-2xs"
            >
              Dùng thử tài khoản Demo
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#e6e4dc] space-y-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="text-xs font-semibold text-zinc-900 block font-display">
              Theo dõi thu chi
            </span>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Ghi nhận nhanh từng khoản thu nhập và chi tiêu theo danh mục, lọc theo tháng và xuất dữ liệu CSV an toàn.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e6e4dc] space-y-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="text-xs font-semibold text-zinc-900 block font-display">
              Ngân sách 50/30/20
            </span>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Phân tích tỷ trọng Thiết yếu, Mong muốn, Tiết kiệm và cảnh báo khi chi tiêu chạm ngưỡng hạn mức tháng.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e6e4dc] space-y-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="text-xs font-semibold text-zinc-900 block font-display">
              Mục tiêu mua sắm
            </span>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Theo dõi tiến độ tích lũy theo số dư khả dụng, đặt hạn mục tiêu và gợi ý mức tiết kiệm hàng tháng.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const userId = session.user.id;
  const [thu, chi, count] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: "INCOME" },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: "EXPENSE" },
    }),
    prisma.transaction.count({
      where: { userId },
    }),
  ]);

  const totalIncome = thu._sum.amount ?? 0;
  const totalExpense = chi._sum.amount ?? 0;
  const balance = totalIncome - totalExpense;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="bg-white border border-[#e6e4dc] rounded-2xl p-6 sm:p-8 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight font-display">
            Finance Planner
          </h1>
          <p className="text-zinc-600 text-sm leading-relaxed max-w-xl">
            Xin chào <strong className="text-zinc-900">{session.user.name}</strong>. Đây là tóm tắt dòng tiền tích lũy của bạn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-[#183d2e] hover:bg-[#204e3b] text-white font-medium text-xs transition shadow-xs"
          >
            Vào bảng tổng quan
          </Link>
          <Link
            href="/transactions"
            className="px-4 py-2 rounded-xl border border-[#e2dfd5] bg-white hover:bg-[#f3f1ea] text-zinc-800 font-medium text-xs transition shadow-2xs"
          >
            Quản lý sổ giao dịch
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#e6e4dc] space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <span className="text-xs font-medium text-zinc-500">Số dư hiện tại</span>
          <p className="text-xl font-bold text-zinc-900 tabular-nums font-sans">
            {formatVND(balance)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e6e4dc] space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <span className="text-xs font-medium text-zinc-500">Tổng thu tích lũy</span>
          <p className="text-xl font-bold text-emerald-700 tabular-nums font-sans">
            +{formatVND(totalIncome)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e6e4dc] space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <span className="text-xs font-medium text-zinc-500">
            Tổng chi ({count} giao dịch)
          </span>
          <p className="text-xl font-bold text-zinc-900 tabular-nums font-sans">
            -{formatVND(totalExpense)}
          </p>
        </div>
      </div>
    </main>
  );
}
