# Key Moment — Gửi lời chúc, góp sắc tương lai

Web gửi lời chúc trên điện thoại; mỗi lời chúc hiện trên màn LED như một dải ruy-băng, vây quanh ngôi sao trung tâm.

## Trang

- `/` — trang điều hướng (admin / gửi chúc / LED)
- `/admin` — quản lý lời chúc (PIN lấy từ `ADMIN_PIN`, không có mã mặc định)
- `/sign` — khách nhập lời chúc trên điện thoại (QR trỏ tới đây)
- `/wall` — màn LED fullscreen
- `/qr` — mã QR cho ban tổ chức

## Setup

1. Tạo project [Supabase](https://supabase.com). SQL đã chạy trên project **Signature Demo**:
   - [`supabase/migrations/001_signatures.sql`](supabase/migrations/001_signatures.sql) — `signatures` SELECT + INSERT (anon)
   - [`supabase/migrations/003_event_state.sql`](supabase/migrations/003_event_state.sql) — `event_state` SELECT + INSERT + UPDATE (anon), Realtime
   - **Không chạy** [`002_signatures_delete.sql`](supabase/migrations/002_signatures_delete.sql) — policy đó cho phép ai cũng xóa hết chữ ký/lời chúc bằng anon key.
2. Realtime: bảng `signatures` và `event_state` nằm trong publication `supabase_realtime`.
3. Copy `.env.example` thành `.env.local` và điền:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable / anon)
   - `NEXT_PUBLIC_APP_URL` (URL production cho QR; local: `http://localhost:3000`)
   - `ADMIN_PIN` — bắt buộc. Không có PIN mặc định; thiếu thì trang admin fail closed.
   - `ADMIN_SESSION_SECRET` — secret HMAC ký cookie admin. Nên khác `ADMIN_PIN`. Nếu bỏ trống, server dùng `ADMIN_PIN` làm khóa ký.
   - `SUPABASE_SERVICE_ROLE_KEY` — **server-only**. Dùng cho admin xóa lời chúc và (sau migration 004) ghi Key Moment. Không bao giờ `NEXT_PUBLIC_*`. Có thể dùng `SUPABASE_SECRET_KEY` nếu dashboard cấp secret key thay vì service role.
4. `npm run dev` — mở `/` để chọn luồng.

Sửa copy sự kiện, nguồn video, và **emblem placeholder** (`/emblem.svg`) trong [`lib/event.ts`](lib/event.ts). Đổi `event.emblemSrc` khi có logo chính thức — không commit logo khách hàng vào repo trừ khi đã có sẵn.

## Deploy Vercel

Các biến **đã có** trên Vercel (mọi environment): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Agent không đụng env/settings.

Owner cần **tự thêm** (server-only, Production + Preview):

| Name | Required | Notes |
| --- | --- | --- |
| `ADMIN_PIN` | Yes | No fallback. Admin login returns 503 if missing |
| `ADMIN_SESSION_SECRET` | Strongly recommended | HMAC key for the admin cookie. Falls back to `ADMIN_PIN` if unset |
| `SUPABASE_SERVICE_ROLE_KEY` | For admin deletes; required after 004 | Service role / secret key. Never expose to the client. Also accepted: `SUPABASE_SECRET_KEY` |
| `NEXT_PUBLIC_APP_URL` | Yes | Production origin for QR, no trailing slash |

Sau khi deploy PR này:

1. Thêm `ADMIN_PIN`, `ADMIN_SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` trên Vercel (không commit).
2. Redeploy để cookie HMAC và service role có hiệu lực.
3. **Rồi mới** chạy [`supabase/migrations/004_lock_admin_writes.sql`](supabase/migrations/004_lock_admin_writes.sql) trên SQL Editor. File này gỡ INSERT/UPDATE anon trên `event_state`. Wall vẫn SELECT + Realtime. Nếu chạy 004 trước khi có service role key, nút Key Moment sẽ 503.

Trước khi có `SUPABASE_SERVICE_ROLE_KEY` và trước 004: LED + gửi chúc + bật Key Moment vẫn chạy (anon UPDATE còn hiệu lực). Xóa lời chúc trên `/admin` sẽ báo cần service role — xóa trên Dashboard vẫn được.

In QR từ `/qr` trên domain production.

## Video Key Visual

`public/key-visual.mp4` giữ nguyên (không re-encode trong repo). Nên thay bằng bản nén hơn trước sự kiện:

- H.264 + AAC, `+faststart`, 1920×1080
- 4–8 Mbps, mục tiêu khoảng 2–5 MB
- Cache header đã set `public, max-age=86400, stale-while-revalidate=604800`
