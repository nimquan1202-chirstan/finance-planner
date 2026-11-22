# AI_LOG – Nhật ký sử dụng AI
> Mức AI của bài này: Mức 3 (AI cộng tác).
> Khai báo trung thực không bị trừ điểm. Không khai báo = vi phạm liêm chính học thuật.

| Ngày | Công cụ | Việc nhờ AI | Prompt (tóm tắt) | Kết quả dùng thế nào | Mình đã kiểm chứng / sửa gì | Commit/PR |
|---|---|---|---|---|---|---|
| 2026-11-10 | Copilot / Claude | Khởi tạo cấu trúc schema và seed 30 giao dịch | Viết seed-data.ts 30 rows giao dịch và prisma.config.ts | Dùng làm dữ liệu ban đầu cho milestone fp1 | Kiểm tra lại kiểu dữ liệu và chạy npx prisma db seed | #fp1 |
| 2026-11-17 | Antigravity (Gemini 3.8 Flash) | Hoàn thiện milestone fp2 theo đề bài và lab tuần 9 | CRUD giao dịch, filter URL, unit test Vitest, xuất CSV | Áp dụng trọn vẹn vào actions, components và test | Chạy tsc --noEmit, vitest run 10 test xanh và build thành công | #fp2 |

## Tự đánh giá cuối bài
- Phần mình tự làm hoàn toàn: Cấu trúc ứng dụng, chạy migration kết nối Neon DB, kiểm tra giao diện và logic lọc URL.
- Phần AI giúp nhiều nhất và mình đã hiểu nó thế nào: Viết các test case ca biên (tháng 1 đổi năm, số dư âm) trong Vitest và xử lý Next.js 16 Promise searchParams.
- Một lần AI sai và cách mình phát hiện: AI gợi ý cú pháp @apply trong Tailwind v4 gây warning Turbopack, mình đã chuyển sang CSS chuẩn.
