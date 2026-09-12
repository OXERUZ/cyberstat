# CYBERSTAT — Production (Supabase + GitHub + Vercel)

Bu paket endi **markazlashgan** ishlaydi: admin panelda (`admin.html`) qilingan har qanday
o'zgarish — topshiriq belgilash, VIP, Final 1 natijalari, sozlamalar — **barcha tashrif
buyuruvchilarga real vaqtda** ko'rinadi (Supabase Realtime orqali). Endi bitta brauzer bilan
cheklanmaysiz.

Xavfsizlik: `index.html` (public sayt) faqat **o'qiydi**. Yozish faqat `admin.html`'da
**login qilgan** admin uchun ochiq (Supabase Auth + Row Level Security orqali).

---

## 1-QADAM — Supabase loyihasini yaratish

1. https://supabase.com ga kiring, akkaunt oching, **"New project"** tugmasini bosing.
2. Loyihaga nom bering (masalan `cyberstat`), parol o'rnating, region tanlang, **Create project**.
3. Loyiha tayyor bo'lgach, chap menyudan **SQL Editor** ni oching → **New query**.
4. Ushbu paketdagi `supabase-schema.sql` faylining **hammasini** nusxalab, shu yerga joylashtiring
   va **Run** tugmasini bosing. (Bu jadval, xavfsizlik siyosatlari va boshlang'ich ma'lumotlarni yaratadi.)

## 2-QADAM — Admin hisobini yaratish

1. Chap menyudan **Authentication → Users** ga o'ting.
2. **Add user → Create new user** tugmasini bosing.
3. O'zingizning email va parolingizni kiriting (masalan `admin@cyberstat.uz`).
   **"Auto Confirm User"** belgisini albatta yoqing (aks holda tasdiqlash email talab qilinadi).
4. Shu email/parol bilan keyinchalik `admin.html` sahifasiga kirasiz.

> Bir nechta admin kerak bo'lsa, shu bo'limdan yana foydalanuvchi qo'shishingiz mumkin.

## 3-QADAM — Kalitlarni config.js ga qo'yish

1. Supabase loyihasida **Project Settings → API** bo'limiga o'ting.
2. **Project URL** ni nusxalang.
3. **Project API keys** ichidan **anon / public** kalitni nusxalang (bu kalit brauzerda
   ochiq bo'lishi mo'ljallangan — yozish huquqi RLS orqali baribir cheklangan).
4. Ushbu paketdagi `config.js` faylini oching va quyidagicha to'ldiring:

```js
window.SUPABASE_URL = "https://xxxxxxxx.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOi....";
```

## 4-QADAM — GitHub'ga yuklash

1. https://github.com da yangi bo'sh repository yarating (masalan `cyberstat`).
2. Shu papkadagi barcha fayllarni (`index.html`, `admin.html`, `app.js`, `styles.css`,
   `config.js`, `assets/`, va h.k.) o'sha repoga yuklang:

```bash
git init
git add .
git commit -m "CYBERSTAT production"
git branch -M main
git remote add origin https://github.com/USERNAME/cyberstat.git
git push -u origin main
```

(Yoki GitHub veb-saytida "Add file → Upload files" orqali ham yuklashingiz mumkin.)

## 5-QADAM — Vercel'ga deploy

1. https://vercel.com ga GitHub hisobingiz bilan kiring.
2. **Add New → Project** → GitHub repongizni tanlang (`cyberstat`).
3. **Framework Preset: Other**, **Build Command** va **Output Directory** bo'sh qoldirilsin
   (bu statik sayt — build kerak emas).
4. **Deploy** tugmasini bosing. Bir necha soniyada sayt tayyor bo'ladi
   (masalan `https://cyberstat.vercel.app`).
5. Admin panel: `https://cyberstat.vercel.app/admin.html`

Shundan keyin har safar GitHub'ga `git push` qilsangiz, Vercel avtomatik qayta deploy qiladi.

---

## Ishlatish

- **Public sayt** (`index.html`) — hamma ko'radi, faqat progress va ochiq ma'lumotlar
  ko'rsatiladi (10 ta topshiriq mazmuni hech qachon publicga chiqmaydi).
- **Admin panel** (`admin.html`) — 2-qadamda yaratgan email/parol bilan kiring:
  - Har bir finalist uchun 10 ta doiracha bor — bosib yoqing/o'chiring, progress
    avtomatik hisoblanadi va **barcha foydalanuvchilarga darhol** ko'rinadi.
  - VIP status switch orqali boshqariladi (bir vaqtda faqat bitta VIP bo'lishi mumkin).
  - Final 1 nomzodlari, reyting va ovozlar sonini tahrirlash mumkin.
  - JSON export/import orqali zaxira nusxa olish mumkin.
  - **Chiqish** tugmasi orqali sessiyadan chiqasiz.

## Texnik eslatmalar

- **(TUZATILDI) Rasm yuklash endi Supabase Storage orqali ishlaydi.** Avvalgi versiyada
  rasm to'g'ridan-to'g'ri base64 formatda `cyberstat_state` jadvaliga yozilar edi —
  bir nechta rasm bilan bu qator hajmi tez orada bir necha megabaytga chiqib, HAR
  QANDAY keyingi saqlash (hatto oddiy switch bosish ham) xato bilan tugab, o'zgarish
  saytga (globalga) yetib bormas edi. Aynan shu — sizda kuzatilgan "admin panelda
  o'zgartirilsa globalga yetib bormayapti" xatosining sababi edi. Endi rasm alohida
  `candidate-photos` bucket'iga yuklanadi, jadvalda esa faqat kichik URL saqlanadi.
  **Bu ishlashi uchun `supabase-schema.sql` faylini SQL Editor'da qayta ishga
  tushiring** (bucket va uning ruxsatlarini shu skript yaratadi).
- Mobil va PC uchun butun sayt (bosh sahifa, Final 2 arena, Final 1 natijalari,
  admin panel) responsive qilib tekshirildi va sozlandi.
- Agar `config.js` to'ldirilmagan bo'lsa, sayt local rejimda (faqat shu brauzerda)
  ishlashda davom etadi — hech narsa buzilmaydi, lekin markazlashgan sinxronizatsiya
  ishlamaydi.
- Agar `supabase-schema.sql`'ni qayta ishga tushirsangiz, u Final 1/Final 2
  ma'lumotlarini oxirgi yuborilgan skrinshotdagi holatga (rasmlar + bio + ovozlar)
  qaytaradi — bu ataylab shunday qilingan.
