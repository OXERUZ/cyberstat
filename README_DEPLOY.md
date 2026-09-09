# CYBERSTAT — Production + Admin Panel

Bu versiya Vercel + Next.js + Supabase PostgreSQL/Auth/Realtime uchun tayyorlangan.

## Nimalar ishlaydi

- Public CYBERSTAT sahifasi
- KIBERXAVFSIZLIK MARKAZI tomonidan o‘tkazilayotganini ko‘rsatuvchi rasmiy banner
- Supabase Anonymous Auth orqali bir qurilma/sessiya uchun ovoz berish
- Server-side `cast_vote` RPC
- Bir voter uchun server darajasida 1 ta ovoz
- Admin Email/Password login
- Admin role `app_metadata.role = admin`
- Nomzod qo‘shish, tahrirlash, faollashtirish/nofaollashtirish, o‘chirish/arxivlash
- Ovoz qo‘shish/ayirish — faqat admin RPC orqali
- Ovozlar jurnali + CSV export
- So‘rovnoma holatini FAOL / TO‘XTATILGAN / YAKUNLANGAN qilish
- Public natijalarni ko‘rsatish/yashirish
- Rasmiy tashkilot nomi va matnini admin paneldan o‘zgartirish
- Barcha o‘zgarishlarni audit logga yozish
- So‘rovnomani xavfsiz reset qilish
- Supabase Realtime: admin o‘zgartirgan ma’lumotlar public foydalanuvchilarga avtomatik yangilanadi

## 1. Supabase

1. Supabase'da yangi project yarating.
2. `supabase/schema.sql` faylini SQL Editor'da to‘liq ishga tushiring.
3. Authentication → Providers → Anonymous Sign-Ins ni yoqing.
4. Authentication → Providers → Email/Password ni yoqing.
5. Authentication → Users → Add user orqali admin account yarating.
6. SQL Editor'da admin role bering:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role','admin')
where email = 'YOUR_ADMIN_EMAIL';
```

Admin account uchun aynan shu email/parol bilan `/` saytiga kirib, footer'dagi yashirin admin tugmasi orqali boshqaruv panelini ochish mumkin.

## 2. Vercel Environment Variables

Vercel → Project → Settings → Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Production, Preview va Development uchun kerak bo‘lsa alohida belgilang.

**Hech qachon Supabase `service_role` keyini frontendga yoki `NEXT_PUBLIC_*` variable'ga qo‘ymang.**

## 3. GitHub

Loyiha root papkasida:

```bash
git add .
git commit -m "CYBERSTAT production admin realtime"
git push origin main
```

## 4. Vercel

GitHub repository'ni Vercel project bilan ulang va Deploy/Redeploy qiling.

Framework: `Next.js`

Build command:

```bash
npm run build
```

## 5. Muhim arxitektura

```text
                 CYBERSTAT
                     |
          +----------+----------+
          |                     |
      PUBLIC SITE           ADMIN PANEL
          |                     |
          +----------+----------+
                     |
               Supabase Auth
                     |
              PostgreSQL DB
                     |
       +-------------+-------------+
       |             |             |
   candidates      votes       settings
       |                           |
       +-------------+-------------+
                     |
                  Realtime
                     |
               barcha clientlar
```

Admin o‘zgartirgan nomzod, ovoz, status yoki rasmiy matn browser localStorage'ida emas, markaziy database'da saqlanadi. Realtime kanal orqali public sahifalar yangilanadi.

## 6. Eski schema ustiga o‘rnatish

`schema.sql` mavjud jadvallarni o‘chirib yubormaydi. U kerakli yangi ustunlarni qo‘shadi va eski xavfli write-policy'larni olib tashlaydi. Ishlab turgan production database'da SQL'ni ishga tushirishdan oldin backup oling.

## 7. Admin panel bo‘limlari

- Dashboard — umumiy statistika
- Nomzodlar — CRUD va holat boshqaruvi
- Ovoz boshqaruvi — admin tuzatishlari
- Ovozlar jurnali — real ovozlar va CSV export
- O‘zgarishlar tarixi — audit log
- Tizim sozlamalari — status, public natijalar, tashkilot matni, reset

## 8. Production eslatma

Bu platforma rasmiy so‘rovnoma uchun ishlatilsa, real identifikatsiya, anti-fraud, CAPTCHA/rate-limit, maxfiylik siyosati, huquqiy talablar va audit talablari alohida ko‘rib chiqilishi kerak. Anonymous Auth bir odamning bir nechta qurilma yoki sessiyadan qayta ovoz berishini to‘liq isbotlamaydi.
