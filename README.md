# Key Moment — Gửi lời chúc, góp sắc tương lai

Web gửi lời chúc trên điện thoại; mỗi lời chúc hiện trên màn LED như một dải ruy-băng, vây quanh ngôi sao trung tâm.

## Trang

- `/` — trang điều hướng (admin / gửi chúc / LED)
- `/admin` — quản lý lời chúc (PIN lấy từ `ADMIN_PIN`; thiếu PIN thì **demo mode** — xem bên dưới)
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
   - `ADMIN_PIN` — khoá `/admin`. Không có PIN mặc định. **Nếu bỏ trống, deployment vào demo mode** (admin mở không PIN, có banner). Đặt PIN là khoá lại ngay.
   - `DEMO_OPEN_ADMIN` — **server-only**, không `NEXT_PUBLIC_`. Chỉ nhận giá trị `1` để ép demo mode dù đã có `ADMIN_PIN`. Bỏ trống = theo `ADMIN_PIN`.
   - `ADMIN_SESSION_SECRET` — secret HMAC ký cookie admin. **Bắt buộc ngoài demo mode** — không còn fallback sang `ADMIN_PIN`. Thiếu thì login PIN trả 503.
   - `SUPABASE_SERVICE_ROLE_KEY` — **server-only**. Dùng cho admin xóa lời chúc và (sau migration 004) ghi Key Moment. Không bao giờ `NEXT_PUBLIC_*`. Có thể dùng `SUPABASE_SECRET_KEY` nếu dashboard cấp secret key thay vì service role.
4. `npm run dev` — mở `/` để chọn luồng.

Sửa copy sự kiện, nguồn video, và **emblem placeholder** (`/emblem.svg`) trong [`lib/event.ts`](lib/event.ts). Đổi `event.emblemSrc` khi có logo chính thức — không commit logo khách hàng vào repo trừ khi đã có sẵn.

## Deploy Vercel

Các biến **đã có** trên Vercel (mọi environment): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Agent không đụng env/settings.

Owner cần **tự thêm** (server-only, Production + Preview):

| Name | Required | Notes |
| --- | --- | --- |
| `ADMIN_PIN` | For the real event | Unset → demo mode (admin opens, banner). Set it to restore PIN login |
| `DEMO_OPEN_ADMIN` | No (temporary demo) | Server-only. `1` forces demo even if `ADMIN_PIN` is set. Unset + PIN set = locked |
| `ADMIN_SESSION_SECRET` | Required outside demo | HMAC key for the admin cookie. No fallback to `ADMIN_PIN`. Missing → 503 on PIN login |
| `SUPABASE_SERVICE_ROLE_KEY` | For admin deletes; required after 004 | Service role / secret key. Never expose to the client. Also accepted: `SUPABASE_SECRET_KEY` |
| `NEXT_PUBLIC_APP_URL` | Yes | Production origin for QR, no trailing slash |

Sau khi deploy PR này:

1. Thêm `ADMIN_PIN`, `ADMIN_SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` trên Vercel (không commit).
2. Redeploy để cookie HMAC và service role có hiệu lực.
3. **Rồi mới** chạy [`supabase/migrations/004_lock_admin_writes.sql`](supabase/migrations/004_lock_admin_writes.sql) trên SQL Editor. File này gỡ INSERT/UPDATE anon trên `event_state`. Wall vẫn SELECT + Realtime. Nếu chạy 004 trước khi có service role key, nút Key Moment sẽ 503.

Trước khi có `SUPABASE_SERVICE_ROLE_KEY` và trước 004: LED + gửi chúc + bật Key Moment vẫn chạy (anon UPDATE còn hiệu lực). Trong demo mode, nút **Xoá tất cả lời chúc** dùng anon DELETE (cần [`005_demo_anon_delete.sql`](supabase/migrations/005_demo_anon_delete.sql) trên project). Ngoài demo, DELETE vẫn cần cookie; có service role thì luôn cần cookie.

In QR từ `/qr` trên domain production.

## Demo mode (tạm — demo khách hôm nay)

Một cờ **server-only** (`DEMO_OPEN_ADMIN`), **không** `NEXT_PUBLIC_`. Mặc định khi cờ **không** set: nếu đã có `ADMIN_PIN` thì vẫn bắt PIN (hành vi an toàn của PR này).

**Bật (không cần sửa env trên Vercel):** không đặt `ADMIN_PIN` (trạng thái hiện tại). `/admin` mở thẳng, hiện banner `DEMO MODE – admin không khoá. Đặt ADMIN_PIN trước sự kiện thật.` Key Moment bật/tắt được (ghi qua route server: service role nếu có, không thì anon UPDATE trên `event_state` — migration 004 chưa chạy; local store nếu không có Supabase).

**Bật tường minh:** `DEMO_OPEN_ADMIN=1` (server-only). Có hiệu lực cả khi đã có `ADMIN_PIN`.

**Tắt / về sự kiện thật:** đặt `ADMIN_PIN` và **không** để `DEMO_OPEN_ADMIN=1`. Request sau đó bắt PIN ngay. Redeploy sau khi thêm env trên Vercel.

**Xoá trong demo (không có service role):** `DELETE /api/signatures` được phép và đi qua anon server client. Có `SUPABASE_SERVICE_ROLE_KEY` thì vẫn bắt cookie. Ngoài demo luôn bắt cookie. Rate limit POST lời chúc: khoảng 1 lần / 2 giây, burst 5. Giới hạn 200 ký tự. `/sign` cho gửi lại ngay, không khoá localStorage.

Wall nhận Key Moment realtime (Supabase Realtime khi có `NEXT_PUBLIC_SUPABASE_*`; không thì poll local).

## Video Key Visual

`public/key-visual.mp4` giữ nguyên (không re-encode trong repo). Nên thay bằng bản nén hơn trước sự kiện:

- H.264 + AAC, `+faststart`, 1920×1080
- 4–8 Mbps, mục tiêu khoảng 2–5 MB
- Cache header đã set `public, max-age=86400, stale-while-revalidate=604800`
