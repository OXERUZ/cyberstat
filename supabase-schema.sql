-- =====================================================================
-- CYBERSTAT — Supabase schema
-- Buni Supabase Dashboard -> SQL Editor -> New query ichiga qo'yib,
-- "Run" tugmasini bosing (bir marta ishga tushirish kifoya).
-- =====================================================================

create table if not exists public.cyberstat_state (
  id int primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.cyberstat_state enable row level security;

-- Hamma (public sayt) faqat O'QIY oladi
drop policy if exists "public read state" on public.cyberstat_state;
create policy "public read state"
  on public.cyberstat_state
  for select
  to anon, authenticated
  using (true);

-- Faqat LOGIN qilgan admin YOZA oladi (insert/update)
drop policy if exists "authenticated write state" on public.cyberstat_state;
create policy "authenticated write state"
  on public.cyberstat_state
  for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated update state" on public.cyberstat_state;
create policy "authenticated update state"
  on public.cyberstat_state
  for update
  to authenticated
  using (true)
  with check (true);

-- Real-time yangilanishlarni yoqish (admin o'zgartirsa, sayt darhol yangilanadi)
alter publication supabase_realtime add table public.cyberstat_state;

-- Boshlang'ich ma'lumot (app.js ichidagi defaults bilan bir xil).
-- Anon foydalanuvchi yoza olmagani uchun (RLS), sayt ilk marta ochilganda
-- ham ma'lumot bo'lishi uchun shu yerda to'g'ridan-to'g'ri seed qilamiz.
-- Admin panelga kirib birinchi saqlashda bu qator yangilanadi.
insert into public.cyberstat_state (id, data)
values (1, '{
  "schema": "v4",
  "settings": {
    "siteName": "CYBERSTAT",
    "subtitle": "DIGITAL COMPETITION ARENA",
    "live": true,
    "final2Open": true,
    "publicTasks": false,
    "heroTitle": "02",
    "heroSub": "LAST DEFENSE",
    "heroLine": "KIBERXAVFSIZLIK × INNOVATSIYA × KELAJAK"
  },
  "finalists": [
    {"id":"auto_c1","candidateId":"c1","name":"XOSHIMOV XOSHIMXON","project":"VANGUARD-X","bio":"Kiberxavfsizlik yo‘nalishidagi amaliy loyiha. Final 1 g‘olibi va Final 2 VIP nominanti.","image":"assets/portrait-gold.svg","vip":true,"color":"gold","tasks":[true,true,true,true,true,true,false,false,false,false]},
    {"id":"auto_c2","candidateId":"c2","name":"JULIYEV MUHAMMAD","project":"NEURAL SHIELD","bio":"Cybersecurity loyihasi.","image":"assets/portrait-blue.svg","vip":false,"color":"blue","tasks":[true,true,true,true,false,false,false,false,false,false]},
    {"id":"auto_c3","candidateId":"c3","name":"NAZAROVA NILUFAR","project":"PHOENIX","bio":"Cybersecurity loyihasi.","image":"assets/portrait-purple.svg","vip":false,"color":"purple","tasks":[true,true,false,false,false,false,false,false,false,false]}
  ],
  "final1": [
    {"id":"c1","name":"XOSHIMOV XOSHIMXON","project":"VIP NOMZOD","vip":true,"rating":5.0,"bio":"Mobil qurilmalar va foydalanuvchilarning shaxsiy ma’lumotlarini kiber-xavflardan real vaqt rejimida himoya qilish uchun mo‘ljallangan, sun’iy intellekt (AI) texnologiyalariga asoslangan zamonaviy Android xavfsizlik tizimi.","image":"assets/portrait-gold.svg","votes":8889},
    {"id":"c2","name":"JULIYEV MUHAMMAD","project":"VANGUARD-X","vip":false,"rating":5.0,"bio":"Yangi va noma’lum kiber-tahdidlarni barvaqt aniqlovchi va yangi paydo bo‘layotgan kiber-tahdidlar haqida oldindan ogohlantiruvchi dastur. Interaktiv simulyatorlar orqali odamlarga so‘nggi firibgarlik usullaridan himoyalanishni o‘rgatadi.","image":"assets/portrait-blue.svg","votes":8885},
    {"id":"c3","name":"NAZAROVA NILUFAR","project":"AEGIS PRO","vip":false,"rating":5.0,"bio":"Mobil qurilmalar va ilovalar uchun kompleks qalqon. Mobil qurilmalarni kiber-xujumlar, zararli APK fayllar, SMS-firibgarliklar va soxta ilovalardan doimiy himoya qiladi. Oddiy tugmani bir bosish orqali to‘liq xavfsizlikni ta’minlaydi.","image":"assets/portrait-purple.svg","votes":8883}
  ],
  "updatedAt": null
}'::jsonb)
on conflict (id) do nothing;
