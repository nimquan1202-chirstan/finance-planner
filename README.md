# Finance Planner - PHY10615

Ứng dụng quản lý tài chính cá nhân full-stack giúp theo dõi thu chi, số dư ngân sách và lập kế hoạch tiết kiệm cho các mục tiêu wishlist. Được xây dựng với Next.js 16 App Router, Prisma ORM 7 và PostgreSQL (Neon).

## 🚀 Hướng dẫn chạy cục bộ (Local Development)

Yêu cầu môi trường: **Node.js 24**, npm.

```bash
# 1. Cài đặt dependencies
npm ci

# 2. Tạo file môi trường từ mẫu
cp .env.example .env
# Cập nhật DATABASE_URL và DATABASE_URL_UNPOOLED từ Neon Console

# 3. Chạy migration và seed dữ liệu mẫu
npx prisma migrate dev
npx prisma db seed

# 4. Chạy môi trường phát triển
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

## 🧪 Kiểm thử (Testing)

```bash
# Chạy bộ kiểm thử đơn vị (Vitest)
npm test

# Kiểm tra kiểu dữ liệu TypeScript
npm run typecheck

# Build kiểm tra production
npm run build
```

## 📋 Checklist tính năng theo đề bài

### Tính năng cốt lõi (Tuần 8 - 11)
- [x] Schema cơ sở dữ liệu PostgreSQL + Prisma ORM 7 (`fp1`)
- [x] Nạp dữ liệu mẫu ($\ge 30$ giao dịch) (`fp1`)
- [x] Dashboard hiển thị tổng thu, chi, số dư và danh mục (`fp1`)
- [x] Quản lý giao dịch: Thêm mới với Server Action (`fp2`)
- [x] Quản lý giao dịch: Xoá giao dịch có xác nhận (`fp2`)
- [x] Validate dữ liệu phía server bằng Zod 4 và hiển thị lỗi từng ô (`fp2`)
- [x] Lọc giao dịch trên URL `searchParams` theo thời gian, loại, danh mục (`fp2`)
- [x] Route Handler `GET /api/transactions` (JSON & xuất CSV) (`fp2`)
- [x] Bộ kiểm thử đơn vị với Vitest ($\ge 6$ test, hiện có 10 test có ca biên) (`fp2`)
- [ ] Xác thực người dùng bằng Better Auth (Email/Pass + GitHub) *(Tuần 10 - `fp3`)*
- [ ] Phân quyền dữ liệu theo `userId` với `requireUser()` *(Tuần 10 - `fp3`)*
- [ ] Quản lý Wishlist CRUD *(Tuần 11 - `v1.0`)*
- [ ] Biểu đồ shadcn Chart & Thông báo mốc tiết kiệm *(Tuần 11 - `v1.0`)*

## 🛠️ Công nghệ sử dụng
- **Framework:** Next.js 16.4 App Router, React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Database & ORM:** PostgreSQL (Neon) + Prisma ORM 7
- **Validation:** Zod 4
- **Testing:** Vitest 5
- **Tài liệu AI:** Xem chi tiết tại [AI_LOG.md](./AI_LOG.md)
