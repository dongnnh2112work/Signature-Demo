-- 005_demo_anon_delete.sql
-- DEMO ONLY. Cho phép anon/authenticated DELETE trên public.signatures để nút
-- "Xoá tất cả lời chúc" chạy trong DEMO MODE khi chưa có SUPABASE_SERVICE_ROLE_KEY.
-- Hệ quả: BẤT KỲ AI có anon key (đã public trong bundle web) đều xoá được mọi lời chúc.
-- PHẢI GỠ TRƯỚC SỰ KIỆN THẬT (trước hoặc cùng lúc chạy 004).
-- Không đụng event_state, không đổi grant.
--
-- Rollback:
--   drop policy if exists "Demo anon can delete signatures" on public.signatures;

create policy "Demo anon can delete signatures"
  on public.signatures
  for delete
  to anon, authenticated
  using (true);
