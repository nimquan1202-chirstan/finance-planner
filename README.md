# Finance Planner - PHY10615

Ứng dụng quản lý tài chính cá nhân full-stack giúp theo dõi thu chi, số dư ngân sách, phân tích quy tắc 50/30/20 và lập kế hoạch tiết kiệm cho các mục tiêu wishlist có hạn chót.

Dự án được xây dựng tuân thủ chặt chẽ chương trình WebLab Tuần 1–10 (Next.js 16 App Router, React 19, Prisma ORM 7, Better Auth 1.7, Zod 4, Tailwind CSS v4, Vitest 5).

---

## 👤 Thông tin sinh viên & Môn học
- **Môn học:** PHY10615 – Phát triển ứng dụng Web (HK1 2026–2027), HCMUS
- **Sinh viên:** Quân (`nimquan1202@gmail.com`)
- **Tài khoản Demo có sẵn dữ liệu:**
  - **Email:** `demo@phy10615.vn`
  - **Mật khẩu:** `Demo@123456`

---

## 🚀 Hướng dẫn chạy cục bộ (Local Development)

Yêu cầu môi trường: **Node.js 24**, npm.

```bash
# 1. Cài đặt dependencies
npm install

# 2. Cấu hình file môi trường (.env)
# Điền DATABASE_URL và DATABASE_URL_UNPOOLED từ Neon Console
# Điền BETTER_AUTH_SECRET (hoặc chuỗi ngẫu nhiên 32 ký tự)

# 3. Chạy migration và nạp dữ liệu mẫu
npx prisma migrate deploy
npx tsx prisma/seed.ts

# 4. Chạy môi trường phát triển
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

---

## 🧪 Kiểm thử & Build (Testing & Production Build)

```bash
# Chạy toàn bộ 30 bài kiểm thử đơn vị với Vitest
npm test

# Kiểm tra an toàn kiểu dữ liệu TypeScript
npm run typecheck

# Build kiểm tra production
npm run build
```

---

## 📋 Checklist tính năng hoàn thiện

### 1. Nền tảng & Xác thực (`fp1` & `fp3`)
- [x] Schema cơ sở dữ liệu PostgreSQL + Prisma ORM 7 (`User`, `Account`, `Session`, `Transaction`, `WishlistItem`, `CategoryBudget`).
- [x] Xác thực người dùng bằng **Better Auth 1.7** (Email/Password + GitHub OAuth fallback).
- [x] Bảo mật chống IDOR: toàn bộ thao tác sửa/xoá đều ràng buộc theo `userId` bằng `updateMany` / `deleteMany`.
- [x] Tối ưu hiệu năng truy vấn qua React `cache(requireUser)` và song song hoá `Promise.all`.

### 2. Quản lý thu chi & Giao dịch (`fp2`)
- [x] CRUD giao dịch đầy đủ với Next.js Server Actions & React 19 `useActionState`.
- [x] Validate dữ liệu chặt chẽ bằng Zod 4 với thông báo lỗi cụ thể từng ô.
- [x] Bộ lọc giao dịch đa chiều lưu trên URL (`searchParams`): thời gian (tháng này, tháng trước, tất cả), loại giao dịch, danh mục, tìm kiếm từ khoá.
- [x] Route Handler `GET /api/transactions` hỗ trợ lọc JSON và xuất file CSV.
- [x] **Bảo vệ chống CSV / Formula Injection:** tự động xử lý và vô hiệu hoá các ký tự nguy hiểm (`=`, `+`, `-`, `@`, `\t`, `\r`) trước khi xuất CSV.

### 3. Tính năng nâng cao & Trực quan hoá tài chính (`v1.0` / Peer & FARE Features)
- [x] **Bố cục Sidebar hiện đại (FARE Layout):** Thanh điều hướng dọc cố định bên trái (Desktop Sidebar) và Mobile Drawer linh hoạt, thay thế thanh ngang truyền thống.
- [x] **Logo thương hiệu hình học riêng:** Biểu tượng két an toàn và mầm tăng trưởng tài chính thay cho ô chữ "FP".
- [x] **Phân tích Quy tắc 50/30/20 & Tùy chỉnh tỷ lệ linh hoạt:** Cho phép người dùng tùy chỉnh tỷ lệ Thiết yếu / Mong muốn / Tích lũy (50/30/20, 60/20/20, 40/30/30...) lưu trực tiếp vào cơ sở dữ liệu.
- [x] **Thuật toán đánh giá khả năng mua (Purchasing Power):** Đánh giá tính khả thi tài chính của từng món wishlist dựa trên số dư khả dụng, hạn chót và dòng tiền tiết kiệm hàng tháng.
- [x] **Thống kê dòng tiền nâng cao trong Sổ giao dịch:** Tổng thu, tổng chi, dòng tiền ròng và danh mục chi tiêu lớn nhất trong kỳ lọc.
- [x] **Chuỗi ngày ghi chép liên tiếp (Streak):** Theo dõi số ngày liên tục người dùng cập nhật tài chính bằng icon SVG đồng nhất.
- [x] **Dự báo số dư cuối tháng (Month-end Forecast):** Dự phóng chi tiêu và số dư cuối tháng dựa trên mức chi trung bình mỗi ngày kèm trạng thái cảnh báo (An toàn / Cảnh báo / Thâm hụt).
- [x] **Mục tiêu mua sắm có Hạn chót (Wishlist Target Date):**
  - Tự động tính % tiến độ tích lũy dựa trên số dư hiện tại.
  - Thông báo khi chạm các mốc tiết kiệm 50%, 75%, 100% (không lặp lại qua LocalStorage).
  - Tính toán số ngày còn lại và tốc độ tiết kiệm cần thiết mỗi ngày (`neededPerDay`), cảnh báo nếu quá hạn.
- [x] **Bảng hỗ trợ tiếp cận (A11y Data Table):** Thay thế biểu đồ thuần hình ảnh bằng bảng dữ liệu chi tiết có thể đọc bởi trình đọc màn hình, tích hợp cảnh báo ngân sách danh mục (mốc 80% cảnh báo, mốc 100% vượt ngân sách).
- [x] **Giao diện tinh gọn:** Hạn chế màu tím xanh, bỏ glassmorphism, bán kính bo góc chuẩn 10px, typography `tabular-nums` hiển thị tiền tệ `đ` chuẩn xác.

---

## 💡 Quyết định kỹ thuật & Đánh đổi (Technical Decisions)

1. **Tách biệt hàm tính toán thuần khiết (Pure Financial Domain):**
   - Mọi thuật toán phân tích (Quy tắc 50/30/20, tính chuỗi Streak liên tiếp, Dự báo số dư cuối tháng, Tốc độ tích lũy Wishlist theo hạn chót, Phòng chống CSV Injection) đều được viết thành các hàm thuần (`lib/finance.ts`) không phụ thuộc vào React hay cơ sở dữ liệu.
   - *Đánh đổi:* Cần truyền tham số tường minh qua lại, nhưng đổi lại việc viết unit test với Vitest đạt tốc độ cực cao (< 70ms) và độ tin cậy tuyệt đối.

2. **Hỗ trợ tiếp cận (A11y) song hành trực quan:**
   - Cung cấp bảng dữ liệu chi tiết ngữ nghĩa (`<table aria-label="...">`) thay thế cho người dùng khiếm thị hoặc công cụ trợ năng bên cạnh biểu đồ Donut trực quan.

3. **Lưu trạng thái bộ lọc trên URL (`searchParams`):**
   - Bỏ toàn bộ thư viện quản lý state client (Zustand) theo đúng định hướng đề bài 2026. Trạng thái lọc thời gian, loại giao dịch, danh mục và từ khóa tìm kiếm nằm hoàn toàn trên URL, hỗ trợ chia sẻ link, bookmark và tận dụng tối đa Server Components.

4. **Bảo mật đa tầng chống IDOR & Formula Injection:**
   - 100% thao tác sửa/xóa được bảo vệ bằng `updateMany` / `deleteMany` với điều kiện kép `{ id, userId }`.
   - File CSV xuất ra được vô hiệu hóa triệt để các ký tự bắt đầu công thức (`=`, `+`, `-`, `@`, `\t`, `\r`) bằng cách chèn tiền tố `'`.

---

## ⚠️ Giới hạn đã biết (Known Limitations)
- Đăng nhập bằng GitHub OAuth yêu cầu người dùng thiết lập `GITHUB_CLIENT_ID` và `GITHUB_CLIENT_SECRET` trong `.env` (hệ thống có cơ chế fallback thông báo thân thiện khi chưa cấu hình).
- Đơn vị tiền tệ lưu trữ dưới dạng số nguyên `Int` VND (không có số thập phân). Nếu ứng dụng mở rộng sang ngoại tệ đa quốc gia (USD, EUR), cần chuyển đổi mô hình dữ liệu sang `Decimal` hoặc lưu theo cents.

---

## 🛠️ Công nghệ sử dụng
- **Framework:** Next.js 16.4 App Router, React 19, TypeScript
- **Styling:** Tailwind CSS v4 (Cấu hình CSS `@theme`)
- **Database & ORM:** PostgreSQL (Neon Cloud) + Prisma ORM 7 (`@prisma/adapter-pg`)
- **Authentication:** Better Auth 1.7 (Email/Password + GitHub OAuth)
- **Validation:** Zod 4
- **Testing:** Vitest 5 (30 unit tests bao phủ các ca biên, logic tài chính, tỷ lệ ngân sách và thuật toán đánh giá khả năng mua)
- **Tài liệu AI:** Xem chi tiết tại [AI_LOG.md](./AI_LOG.md)
