# CYBERSTAT — Final Real-Time Voting

This version replaces browser-only vote storage with Supabase PostgreSQL + Anonymous Auth + Realtime.

## Required Supabase setup
1. Enable Authentication → Providers → Anonymous.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Create `.env.local` from `.env.example` with the Supabase URL and anon key.
4. Deploy to Vercel with the same two environment variables.

Important: public anonymous voting is not a perfect identity system. It provides one vote per authenticated anonymous user/session, while the database unique index prevents duplicate `voter_id` records. For a high-stakes election, use verified identity authentication.


## Finalist media fields
Har bir finalist uchun admin panel orqali quyidagilar markaziy Supabase Storage'ga yuklanadi:
- Muallif rasmi — katta hero/finalist ko'rinishida
- Loyiha logosi — pastki loyiha blokida kichik formatda
- Muallif nomi, loyiha nomi, tavsif va admin reytingi

Buning uchun mavjud `candidate-images` PUBLIC bucket ishlatiladi. Bucket ichida `authors/` va `logos/` papkalari avtomatik hosil bo'ladi. Upload faqat admin uchun policy orqali ruxsat etiladi.
