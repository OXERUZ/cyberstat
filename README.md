# CYBERSTAT — Vercel'ga joylashtirish

Bu papka sizning tayyor `cyberstat.jsx` dizayningizni **Next.js 14** loyihasiga
o'rab qo'ygan, Vercel'da bir necha daqiqada ishga tushiriladigan holatga
keltirilgan.

## ⚠️ Muhim cheklov (albatta o'qing)

Original komponent `window.storage` deb nomlangan xotiraga yozadi — bu faqat
Claude.ai Artifacts ichida mavjud bo'lgan maxsus API. Oddiy saytda bunday API
yo'q, shuning uchun `app/storagePolyfill.js` fayli uni **localStorage** bilan
almashtiradi.

Bu degani:
- Sayt **darhol ishlaydi**, ovoz berish, natijalar, admin panel — hammasi ko'rinadi.
- Lekin ovozlar faqat **shu brauzerda** saqlanadi — boshqa odam boshqa
  qurilmadan kirsa, boshqa (o'z) hisobini ko'radi. Ya'ni bu **hozircha
  ko'p foydalanuvchili umumiy baza emas**, faqat dizayn/UX'ni jonli ko'rish
  uchun demo rejim.
- Haqiqiy, hammaga umumiy ishlaydigan tizim uchun (loyiha texnik topshirig'ining
  17-bandida yozilganidek) **Supabase** yoki **Vercel Postgres** ulanishi va
  `/api/vote`, `/api/candidates` kabi server route'lari yozilishi kerak. Buni
  keyingi bosqichda birga qilishimiz mumkin — shunchaki ayting.

## Nomzod profil rasmlari

Admin panel → **Nomzodlar** → nomzodni qo'shish/tahrirlash oynasida endi rasm
yuklash mumkin. Yuklangan rasm brauzerda avtomatik kvadrat shaklga kesiladi
va kichraytiriladi (max 480×480, siqilgan JPEG), so'ng `localStorage`'ga
matn (base64) sifatida saqlanadi — chunki hozircha haqiqiy fayl-server yo'q
(yuqoridagi cheklovga qarang). Shu sababli juda katta yoki juda ko'p sonli
nomzod rasmlari brauzer xotirasi chegarasiga (odatda ~5–10MB) yaqinlashishi
mumkin; Supabase/serverga o'tilganda rasmlar alohida fayl-saqlash (masalan,
Supabase Storage) orqali saqlanishi tavsiya etiladi.

## 1-usul: GitHub orqali (eng oson, tavsiya etiladi)

1. Bu papkadagi barcha fayllarni o'z kompyuteringizga tushiring va yangi
   GitHub repositoriyga yuklang:
   ```bash
   git init
   git add .
   git commit -m "CYBERSTAT boshlang'ich versiya"
   git branch -M main
   git remote add origin https://github.com/FOYDALANUVCHI_NOMI/cyberstat.git
   git push -u origin main
   ```
2. https://vercel.com ga kiring (GitHub hisobingiz bilan).
3. **"Add New" → "Project"** tugmasini bosing.
4. GitHub'dagi `cyberstat` repositoriyasini tanlang → **Import**.
5. Framework avtomatik **Next.js** deb aniqlanadi — hech narsani o'zgartirmang.
6. **Deploy** tugmasini bosing. 1-2 daqiqadan so'ng sizga
   `https://cyberstat-xxxx.vercel.app` manzili beriladi.

## 2-usul: Vercel CLI orqali (GitHub'siz, terminal'dan to'g'ridan-to'g'ri)

```bash
npm i -g vercel
cd cyberstat
vercel
```

Savollarga javob bering (loyiha nomi, papka va h.k.), keyin:

```bash
vercel --prod
```

## Lokal (o'z kompyuteringizda) sinab ko'rish

```bash
npm install
npm run dev
```

So'ngra brauzerda `http://localhost:3000` manzilini oching.

## Loyiha tuzilishi

```
cyberstat/
├── app/
│   ├── layout.js          → sahifa asosi (til, sarlavha)
│   ├── page.js             → CyberStatApp'ni chaqiradi
│   ├── CyberStatApp.jsx    → sizning original dizayningiz (o'zgarishsiz)
│   ├── storagePolyfill.js  → window.storage → localStorage moslashtiruvchisi
│   └── globals.css         → Tailwind ulanishi
├── package.json
├── next.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Keyingi qadam: haqiqiy umumiy baza (Supabase)

Agar barcha foydalanuvchilar bir xil ovoz sonini ko'rishi kerak bo'lsa
(real loyiha uchun shart), quyidagilar kerak bo'ladi:

1. supabase.com'da bepul loyiha ochish.
2. `users`, `candidates`, `votes`, `audit_logs`, `campaign_settings`
   jadvallarini yaratish (texnik topshiriqning 17-bandida ro'yxati bor).
3. `storagePolyfill.js` o'rniga Supabase client va `/api/vote` kabi Next.js
   API route'lari yozish, RLS (Row Level Security) qoidalarini sozlash.

Bu — alohida, kattaroq bosqich. Tayyor bo'lsangiz, shu loyihani bazaga
ulashda ham yordam bera olaman.
