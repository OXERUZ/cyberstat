# NOVA Academy — Premium Platform

Nova Academy uchun Next.js + Supabase asosidagi public website, student platform va admin CRM.

## Ishga tushirish

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` ichiga Supabase project URL va anon/publishable key kiriting.

## Supabase sozlash

1. Supabase SQL Editor oching.
2. `supabase/schema.sql` faylining hammasini bir marta ishga tushiring.
3. Authentication > Users orqali birinchi admin user yarating.
4. O‘sha user UUID'sini olib quyidagini SQL Editor'da ishga tushiring:

```sql
update public.profiles set role='admin' where id='ADMIN_USER_UUID';
```

5. Keyingi o‘quvchilar `/signup` orqali account yaratishi mumkin. Ular default `student` rolida yaratiladi.
6. Admin o‘quvchini guruhga biriktirish uchun `enrollments` jadvaliga yozuv qo‘shadi.

## Sahifalar

- `/` — public landing page
- `/login` — student login
- `/signup` — student registration
- `/dashboard` — student CRM/platform
- `/admin` — admin CRM

## Reyting modeli

Student rating `profiles.rating_points`da saqlanadi. Student o‘z ballini o‘zgartira olmaydi. Admin `adjust_student_rating` yoki `set_student_rating` RPC orqali ballni o‘zgartiradi; har bir o‘zgarish `rating_transactions` tarixiga sabab, admin va balans bilan yoziladi.

Student ranking `get_my_group_ranking()` RPC orqali faqat o‘zi a’zo bo‘lgan guruh bo‘yicha qaytariladi.

## Production tavsiya

- Supabase email confirmation/password recovery'ni yoqing.
- Admin role'ni faqat ishonchli accountlarga bering.
- `service_role` keyni browserga bermang.
- Real attendance, schedule, payments va lesson/task modullarini keyingi CRM bosqichida ulang.
