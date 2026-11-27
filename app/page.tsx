import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8">
      {/* Khối chính tập trung vào chức năng thực tế */}
      <div className="bg-white border border-[#e6e4dc] rounded-2xl p-6 sm:p-10 space-y-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="space-y-3">
          <Logo size="lg" href="/" />
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight font-display pt-2">
            Quản lý dòng tiền cá nhân có mục tiêu
          </h1>
          <p className="text-zinc-600 text-sm leading-relaxed max-w-xl">
            Ghi chép thu chi nhanh chóng, kiểm soát ngân sách theo tỷ lệ tùy chỉnh và đánh giá khả năng mua sắm dựa trên số dư thực tế.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/login"
            className="px-4 py-2.5 rounded-[10px] bg-[#183d2e] hover:bg-[#204e3b] text-white font-semibold text-xs transition shadow-xs"
          >
            Bắt đầu sử dụng &rarr;
          </Link>
          <Link
            href="/login"
            className="px-4 py-2.5 rounded-[10px] border border-[#e2dfd5] bg-[#faf9f6] hover:bg-white text-zinc-800 font-medium text-xs transition shadow-2xs"
          >
            Tài khoản Demo có sẵn dữ liệu
          </Link>
        </div>
      </div>

      {/* 3 chức năng cốt lõi rõ ràng, không quảng cáo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#e6e4dc] space-y-2 shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
          <div className="w-8 h-8 rounded-lg bg-[#edf4ef] text-[#183d2e] flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-xs font-bold text-zinc-900 font-display">
            Sổ thu chi & Lọc URL
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            CRUD giao dịch tức thì, lọc theo tháng/danh mục/loại trên URL và xuất file CSV an toàn.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#e6e4dc] space-y-2 shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
          <div className="w-8 h-8 rounded-lg bg-[#edf4ef] text-[#183d2e] flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h2 className="text-xs font-bold text-zinc-900 font-display">
            Ngân sách & Tỷ lệ tùy chỉnh
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Phân bổ Thiết yếu, Mong muốn, Tích lũy (50/30/20, 60/20/20...) kèm cảnh báo hạn mức 80%/100%.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#e6e4dc] space-y-2 shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
          <div className="w-8 h-8 rounded-lg bg-[#edf4ef] text-[#183d2e] flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h2 className="text-xs font-bold text-zinc-900 font-display">
            Đánh giá khả năng mua
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Thuật toán ước tính thời gian tích lũy, tốc độ tiết kiệm mỗi ngày và cảnh báo hạn chót.
          </p>
        </div>
      </div>
    </main>
  );
}
