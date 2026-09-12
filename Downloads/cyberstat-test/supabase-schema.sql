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

-- Jadval darajasidagi huquqlar (RLS'dan oldingi qatlam). Ba'zi loyihalarda
-- "anon"/"authenticated" rollariga standart GRANT avtomatik berilmay qolishi
-- mumkin — shu qatorlar buni aniq ta'minlaydi. Yo'q bo'lsa "permission denied
-- for table cyberstat_state" (kod 42501) xatosi chiqadi.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.cyberstat_state to authenticated;
grant select on public.cyberstat_state to anon;

-- Yozish vaqti chegarasi (ba'zi loyihalarda standart juda past bo'lishi
-- mumkin, katta rasm(lar) saqlanganda "57014 statement timeout" xatosiga
-- olib keladi). Bu qator o'zgarishi kuchga kirishi uchun Supabase
-- Dashboard -> Project Settings -> General -> Restart project qiling.
alter role authenticated set statement_timeout = '30s';

-- Real-time yangilanishlarni yoqish (admin o'zgartirsa, sayt darhol yangilanadi).
-- Agar jadval publication'ga avvalroq qo'shilgan bo'lsa oddiy ALTER PUBLICATION
-- xato qaytaradi ("already member") va SKRIPTNI TO'XTATIB QO'YADI — shuning
-- uchun bu yerda xatoni "yutib yuboradigan" DO blokidan foydalanamiz, script
-- har doim oxirigacha (INSERT'gacha) davom etadi.
do $$
begin
  alter publication supabase_realtime add table public.cyberstat_state;
exception when duplicate_object then
  null;
end $$;

-- Boshlang'ich ma'lumot (app.js ichidagi defaults bilan bir xil, Final 1
-- natijalari va Final 2 bio'lari — screenshotdagi bilan bir xil qilib
-- qo'yilgan). "on conflict do update" ataylab shunday: bu skriptni qayta
-- ishga tushirganingizda rasmlar/bio/natijalar screenshotdagi holatga
-- qaytariladi. Agar admin panelda buni tahrirlab bo'lgach FAQAT
-- to'g'irlashni (masalan rasm yo'llarini) qayta yurgizmoqchi bo'lsangiz,
-- bu INSERT blokini ishga tushirmang — pastdagi Storage qismini yetarli.
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
    {"id":"auto_c1","candidateId":"c1","name":"XOSHIMOV XOSHIMXON","project":"VANGUARD-X","bio":"Kiberxavfsizlik yo‘nalishidagi amaliy loyiha. Final 1 g‘olibi va Final 2 VIP nominanti.","image":"assets/c1-xoshimxon.jpg","vip":true,"color":"gold","tasks":[true,true,true,true,true,true,false,false,false,false]},
    {"id":"auto_c2","candidateId":"c2","name":"JULIYEV MUHAMMAD","project":"NEURAL SHIELD","bio":"Cybersecurity loyihasi.","image":"assets/c2-muhammad.jpg","vip":false,"color":"blue","tasks":[true,true,true,true,false,false,false,false,false,false]},
    {"id":"auto_c3","candidateId":"c3","name":"NAZAROVA NILUFAR","project":"PHOENIX","bio":"Cybersecurity loyihasi.","image":"assets/c3-nilufar.jpg","vip":false,"color":"purple","tasks":[true,true,false,false,false,false,false,false,false,false]}
  ],
  "final1": [
    {"id":"c1","name":"XOSHIMOV XOSHIMXON","project":"VIP NOMZOD","vip":true,"rating":5.0,"bio":"Mobil qurilmalar va foydalanuvchilarning shaxsiy ma’lumotlarini kiber-xavflardan real vaqt rejimida himoya qilish uchun mo‘ljallangan, sun’iy intellekt (AI) texnologiyalariga asoslangan zamonaviy Android xavfsizlik tizimi.","image":"assets/c1-xoshimxon.jpg","votes":8889},
    {"id":"c2","name":"JULIYEV MUHAMMAD","project":"VANGUARD-X","vip":false,"rating":5.0,"bio":"Yangi va noma’lum kiber-tahdidlarni barvaqt aniqlovchi va yangi paydo bo‘layotgan kiber-tahdidlar haqida oldindan ogohlantiruvchi dastur. Interaktiv simulyatorlar orqali odamlarga so‘nggi firibgarlik usullaridan himoyalanishni o‘rgatadi.","image":"assets/c2-muhammad.jpg","votes":8885},
    {"id":"c3","name":"NAZAROVA NILUFAR","project":"AEGIS PRO","vip":false,"rating":5.0,"bio":"Mobil qurilmalar va ilovalar uchun kompleks qalqon. Mobil qurilmalarni kiber-xujumlar, zararli APK fayllar, SMS-firibgarliklar va soxta ilovalardan doimiy himoya qiladi. Oddiy tugmani bir bosish orqali to‘liq xavfsizlikni ta’minlaydi.","image":"assets/c3-nilufar.jpg","votes":8883}
  ],
  "updatedAt": null
}'::jsonb)
on conflict (id) do update set data = excluded.data;

-- =====================================================================
-- ASOSIY TUZATISH: rasm fayllari uchun Storage bucket
-- =====================================================================
-- ILGARI: admin panelda "Rasm yuklash" bosilganda rasm base64 matn
-- sifatida to'g'ridan-to'g'ri yuqoridagi "cyberstat_state" jadvaliga
-- (jsonb ustuniga) yozilar edi. Bir nechta rasm bilan bu qator hajmi
-- tez orada bir necha megabaytga chiqib ketadi — natijada HAR QANDAY
-- keyingi saqlash (hatto oddiy matn/switch o'zgarishi ham!) statement
-- timeout yoki tarmoq xatosi bilan tugab, o'zgarishlar saytga (globalga)
-- yetib bormay qolar edi. Shuning uchun rasmlar endi alohida Storage
-- bucket'ga yuklanadi, state ichida esa faqat kichkina URL saqlanadi.
insert into storage.buckets (id, name, public)
values ('candidate-photos','candidate-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "public read candidate photos" on storage.objects;
create policy "public read candidate photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'candidate-photos');

drop policy if exists "authenticated upload candidate photos" on storage.objects;
create policy "authenticated upload candidate photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'candidate-photos');

drop policy if exists "authenticated update candidate photos" on storage.objects;
create policy "authenticated update candidate photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'candidate-photos')
  with check (bucket_id = 'candidate-photos');

drop policy if exists "authenticated delete candidate photos" on storage.objects;
create policy "authenticated delete candidate photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'candidate-photos');
