# Key Moment — Cam kết 2026–2027

Web ký cam kết trên điện thoại, chữ ký hiện realtime trên màn LED.

## Trang

- `/` — khách quét QR, ký trên điện thoại
- `/wall` — mở fullscreen trên máy kết nối LED
- `/qr` — mã QR cho ban tổ chức (in hoặc chiếu)

## Setup

1. Tạo project [Supabase](https://supabase.com), mở SQL Editor, chạy [`supabase/migrations/001_signatures.sql`](supabase/migrations/001_signatures.sql).
2. Copy `.env.example` thành `.env.local`, điền `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. `NEXT_PUBLIC_APP_URL` là URL production (dùng cho QR). Local: `http://localhost:3000`.
4. `npm run dev` — thử `/`, `/wall`, `/qr`.

Sửa tên sự kiện và đoạn cam kết trong [`lib/event.ts`](lib/event.ts).

## Deploy Vercel

Kết nối repo, thêm cùng các biến môi trường, deploy. In QR từ `/qr` trên domain production.

Xóa chữ ký thử nghiệm: xóa row trong bảng `signatures` trên Supabase Dashboard.
