import Link from "next/link";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
  showText?: boolean;
}

export function Logo({
  className = "",
  size = "md",
  href = "/dashboard",
  showText = true,
}: LogoProps) {
  const iconDimensions = {
    sm: "w-6 h-6",
    md: "w-7 h-7",
    lg: "w-9 h-9",
  }[size];

  const textSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }[size];

  const content = (
    <div className={`flex items-center gap-2.5 group select-none ${className}`}>
      {/* Biểu tượng thương hiệu hình học độc quyền: Khối mầm tài chính và khiên tích lũy */}
      <div
        className={`${iconDimensions} rounded-[9px] bg-[#183d2e] text-emerald-100 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-[#204e3b] transition duration-200 p-1.5`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full text-emerald-300"
        >
          {/* Cấu trúc hình học két an toàn và cung tăng trưởng tài chính */}
          <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
          <circle cx="12" cy="12" r="2.5" className="fill-emerald-400/40" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-semibold text-zinc-900 tracking-tight leading-tight ${textSize}`}
          >
            Finance Planner
          </span>
          <span className="text-[10px] text-zinc-400 font-medium tracking-normal hidden sm:block">
            Quản lý tài chính cá nhân
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
