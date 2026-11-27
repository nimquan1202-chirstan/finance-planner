# AI_LOG – Nhật ký sử dụng AI
> Mức AI của bài này: Mức 3 (AI cộng tác).
> Khai báo trung thực không bị trừ điểm. Không khai báo = vi phạm liêm chính học thuật.

| Ngày | Công cụ | Việc nhờ AI | Prompt (tóm tắt) | Kết quả dùng thế nào | Mình đã kiểm chứng / sửa gì | Commit/PR |
|---|---|---|---|---|---|---|
| 2026-11-10 | Copilot / Claude | Khởi tạo cấu trúc schema và seed 30 giao dịch | Viết seed-data.ts 30 rows giao dịch và prisma.config.ts | Dùng làm dữ liệu ban đầu cho milestone fp1 | Kiểm tra lại kiểu dữ liệu và chạy npx prisma db seed | #fp1 |
| 2026-11-17 | Antigravity (Gemini) | Hoàn thiện milestone fp2 theo đề bài và lab tuần 9 | CRUD giao dịch, filter URL, unit test Vitest, xuất CSV | Áp dụng trọn vẹn vào actions, components và test | Chạy tsc --noEmit, vitest run 10 test xanh và build thành công | #fp2 |
| 2026-11-26 | Antigravity | Tham khảo phân tích các điểm hay từ đồ án tài chính của Ân và Phát | Đọc repo của Ân & Phát, đề xuất các tính năng hữu ích phù hợp đề bài cá nhân | Thêm Rule 50/30/20, Streak, Dự báo cuối tháng, Wishlist deadline, Cảnh báo ngân sách | Đảm bảo chỉ dùng tech tuần 1–10, viết thêm 12 unit tests cho finance.ts | #fp3-peer |
| 2026-11-27 | Antigravity | Hoàn thiện Wishlist targetDate, phòng chống CSV Injection, cập nhật seed demo | Tích hợp targetDate vào WishlistForm & dialog, sanitize CSV, kiểm tra seed và build | Chức năng hoạt động đồng bộ, tài khoản demo nạp đủ data, nâng lên 25 unit tests | Chạy npx tsx prisma/seed.ts thành công, npm test (25/25 pass), npm run build thành công | #fp3-final |
| 2026-11-27 | Antigravity | Tái cấu trúc UI theo phong cách FARE & đáp ứng 7 tiêu chí cải tiến đồ án | Thiết kế logo hình học riêng, Sidebar dọc thay nav ngang, tùy chỉnh tỷ lệ ngân sách linh hoạt, thuật toán đánh giá khả năng mua (`calculateAffordability`), thống kê dòng tiền nâng cao, loại bỏ gradient tím xanh/glassmorphism/emoji | Tích hợp AppLayoutWrapper, Logo SVG, Server Action cập nhật tỷ lệ ngân sách vào User DB, bổ sung 5 unit tests | Vitest 30/30 passed, tsc --noEmit 0 lỗi, next build thành công | #v1.0 |

## Tự đánh giá cuối bài
- **Phần mình tự làm và kiểm soát:** Thiết kế luồng nghiệp vụ, cấu trúc cơ sở dữ liệu trên Neon PostgreSQL, lựa chọn và chắt lọc các tính năng phù hợp từ đồ án của các bạn cùng lớp và ứng dụng thực tế (FARE), kiểm soát trải nghiệm người dùng tối giản, chống "AI smell" (không gradient lòe loẹt, không glassmorphism mờ mịt, thanh điều hướng dọc khoa học).
- **Phần AI giúp nhiều nhất và mình đã hiểu:** 
  1. Xây dựng các hàm tính toán tài chính thuần khiết (`calculate503020Rule`, `calculateStreak`, `calculateMonthEndForecast`, `calculateWishlistPace`, `calculateAffordability`, `sanitizeCsvField`) để dễ viết unit test độc lập.
  2. Viết 30 bài kiểm thử đơn vị với Vitest bao phủ đầy đủ các tình huống biên (vượt ngân sách, quá hạn wishlist, chuỗi streak gián đoạn, ký tự kích hoạt formula trong CSV, tỷ lệ tùy chỉnh và các cấp độ khả năng mua sắm).
  3. Cấu hình Prisma 7 và Better Auth adapter đồng bộ với schema.
  4. Thiết kế thanh điều hướng Sidebar thông minh (`AppLayoutWrapper`) tự động chuyển đổi giữa trang ngoài (Landing, Login) và các trang ứng dụng nội bộ (Dashboard, Transactions, Wishlist).
- **Những lỗi phát sinh và cách giải quyết:**
  1. Ban đầu chữ `đ` bị gạch chân do thẻ `<u>` hoặc định dạng thừa, đã sửa lại dùng mã Unicode chuẩn `đ` với class font monospace `tabular-nums`.
  2. Empty state chiếm không gian quá lớn và màu sắc kết luận sai khi số dư = 0, đã tinh chỉnh lại logic hiển thị thân thiện, màu sắc trực quan (chỉ hiển thị cảnh báo khi thực sự có chi tiêu/thâm hụt).
  3. Xử lý CSV Injection bằng cách tiền tố dấu `'` trước các ký tự nguy hiểm (`=`, `+`, `-`, `@`, `\t`, `\r`) thay vì chỉ escape dấu ngoặc kép.
  4. Lỗi thiếu `prisma generate` trên môi trường build Vercel: khắc phục bằng cách bổ sung `"build": "prisma generate && next build"` và `"postinstall": "prisma generate"` vào `package.json`.
