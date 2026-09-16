create extension if not exists pgcrypto;

-- ===================== APPLICATIONS =====================
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(), application_number text unique not null,
  full_name text not null, phone text not null, telegram text, age integer, city text,
  education text, experience_level text, course text not null, study_format text,
  goal text, source text, message text,
  status text not null default 'new' check (status in ('new','contacted','interview','accepted','rejected','studying','completed')),
  admin_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create or replace function public.set_application_number() returns trigger language plpgsql as $$ declare seq bigint; begin if new.application_number is null or new.application_number='' then select count(*)+1 into seq from public.applications; new.application_number:='NOVA-'||extract(year from now())::int||'-'||lpad(seq::text,6,'0'); end if; return new; end; $$;
drop trigger if exists applications_number_trigger on public.applications; create trigger applications_number_trigger before insert on public.applications for each row execute function public.set_application_number();
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists applications_updated_trigger on public.applications; create trigger applications_updated_trigger before update on public.applications for each row execute function public.touch_updated_at();

-- ===================== USERS / CRM =====================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Nova Student', phone text, role text not null default 'student' check(role in ('student','admin')),
  rating_points integer not null default 0 check(rating_points >= 0), avatar_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(), name text not null, course text not null,
  level text not null, capacity integer not null default 20, active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade, active boolean not null default true,
  joined_at timestamptz not null default now(), unique(student_id,group_id)
);
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null, assessment text not null default 'Baholash', score integer not null check(score between 0 and 100),
  created_at timestamptz not null default now()
);
create table if not exists public.rating_transactions (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null, delta integer not null,
  balance_after integer not null check(balance_after >= 0), reason text not null, month_key date not null default date_trunc('month',now())::date,
  created_at timestamptz not null default now()
);
create table if not exists public.rating_months (
  month_key date primary key, label text not null, starts_at timestamptz not null, ends_at timestamptz not null,
  winner_student_id uuid references public.profiles(id) on delete set null, reward text, finalized boolean not null default false
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(), name text unique not null, category text not null, description text not null,
  url text, status text not null default 'active', created_at timestamptz not null default now()
);

-- ===================== SECURITY HELPERS =====================
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;
revoke all on function public.is_admin() from public; grant execute on function public.is_admin() to authenticated;

-- New auth users become students. Promote trusted admins manually in SQL.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,full_name) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'Nova Student')) on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users; create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ===================== RATING RPC =====================
create or replace function public.adjust_student_rating(p_student_id uuid,p_delta integer,p_reason text)
returns table(new_balance integer) language plpgsql security definer set search_path=public as $$
declare b integer;
begin
  if not public.is_admin() then raise exception 'Faqat admin ballni o‘zgartira oladi.'; end if;
  if p_delta=0 then raise exception 'Ball o‘zgarishi 0 bo‘lishi mumkin emas.'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Sabab yozilishi kerak.'; end if;
  update public.profiles set rating_points=greatest(0,rating_points+p_delta),updated_at=now() where id=p_student_id returning rating_points into b;
  if b is null then raise exception 'O‘quvchi topilmadi.'; end if;
  insert into public.rating_transactions(student_id,admin_id,delta,balance_after,reason) values(p_student_id,auth.uid(),p_delta,b,trim(p_reason));
  return query select b;
end; $$;
revoke all on function public.adjust_student_rating(uuid,integer,text) from public; grant execute on function public.adjust_student_rating(uuid,integer,text) to authenticated;

create or replace function public.set_student_rating(p_student_id uuid,p_points integer,p_reason text)
returns table(new_balance integer) language plpgsql security definer set search_path=public as $$
declare old integer; d integer;
begin
  if not public.is_admin() then raise exception 'Faqat admin ballni o‘zgartira oladi.'; end if;
  if p_points<0 then raise exception 'Ball manfiy bo‘lishi mumkin emas.'; end if;
  select rating_points into old from public.profiles where id=p_student_id for update;
  if old is null then raise exception 'O‘quvchi topilmadi.'; end if;
  d:=p_points-old;
  update public.profiles set rating_points=p_points,updated_at=now() where id=p_student_id;
  if d<>0 then insert into public.rating_transactions(student_id,admin_id,delta,balance_after,reason) values(p_student_id,auth.uid(),d, p_points,trim(coalesce(p_reason,'Admin tomonidan ball belgilandi'))); end if;
  return query select p_points;
end; $$;
revoke all on function public.set_student_rating(uuid,integer,text) from public; grant execute on function public.set_student_rating(uuid,integer,text) to authenticated;

create or replace function public.get_my_group_ranking()
returns table(rank bigint,student_id uuid,full_name text,rating_points integer) language sql stable security definer set search_path=public as $$
with my_group as (select group_id from public.enrollments where student_id=auth.uid() and active=true limit 1), ranked as (
 select p.id,p.full_name,p.rating_points,row_number() over(order by p.rating_points desc,p.full_name asc) r
 from public.profiles p join public.enrollments e on e.student_id=p.id
 where e.active=true and e.group_id=(select group_id from my_group) and p.role='student')
select r,p.id,p.full_name,p.rating_points from ranked p order by r;
$$;
revoke all on function public.get_my_group_ranking() from public; grant execute on function public.get_my_group_ranking() to authenticated;

-- ===================== RLS =====================
alter table public.applications enable row level security; alter table public.profiles enable row level security; alter table public.groups enable row level security; alter table public.enrollments enable row level security; alter table public.grades enable row level security; alter table public.rating_transactions enable row level security; alter table public.rating_months enable row level security; alter table public.projects enable row level security;

drop policy if exists "public can submit applications" on public.applications; create policy "public can submit applications" on public.applications for insert to anon,authenticated with check(length(trim(full_name))>=2 and length(trim(phone))>=7 and course in ('Dasturlash','Sun’iy intellekt','Professional kiberxavfsizlik') and status='new');
drop policy if exists "admin reads applications" on public.applications; create policy "admin reads applications" on public.applications for select to authenticated using(public.is_admin());
drop policy if exists "admin updates applications" on public.applications; create policy "admin updates applications" on public.applications for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "admin deletes applications" on public.applications; create policy "admin deletes applications" on public.applications for delete to authenticated using(public.is_admin());

drop policy if exists "student reads own profile" on public.profiles; create policy "student reads own profile" on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
drop policy if exists "admin manages profiles" on public.profiles; create policy "admin manages profiles" on public.profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "student reads own group" on public.groups; create policy "student reads own group" on public.groups for select to authenticated using(public.is_admin() or exists(select 1 from public.enrollments e where e.group_id=groups.id and e.student_id=auth.uid() and e.active=true));
drop policy if exists "admin manages groups" on public.groups; create policy "admin manages groups" on public.groups for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "student reads own enrollment" on public.enrollments; create policy "student reads own enrollment" on public.enrollments for select to authenticated using(student_id=auth.uid() or public.is_admin());
drop policy if exists "admin manages enrollments" on public.enrollments; create policy "admin manages enrollments" on public.enrollments for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "student reads own grades" on public.grades; create policy "student reads own grades" on public.grades for select to authenticated using(student_id=auth.uid() or public.is_admin());
drop policy if exists "admin manages grades" on public.grades; create policy "admin manages grades" on public.grades for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "student reads own rating history" on public.rating_transactions; create policy "student reads own rating history" on public.rating_transactions for select to authenticated using(student_id=auth.uid() or public.is_admin());
drop policy if exists "admin reads rating history" on public.rating_transactions; create policy "admin reads rating history" on public.rating_transactions for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "authenticated reads months" on public.rating_months; create policy "authenticated reads months" on public.rating_months for select to authenticated using(true);
drop policy if exists "admin manages months" on public.rating_months; create policy "admin manages months" on public.rating_months for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "public projects read" on public.projects; create policy "public projects read" on public.projects for select to anon,authenticated using(true);
drop policy if exists "admin projects manage" on public.projects; create policy "admin projects manage" on public.projects for all to authenticated using(public.is_admin()) with check(public.is_admin());

create or replace function public.submit_application(p_full_name text,p_phone text,p_telegram text default null,p_age integer default null,p_city text default null,p_education text default null,p_experience_level text default null,p_course text default null,p_study_format text default null,p_goal text default null,p_source text default null,p_message text default null)
returns text language plpgsql security definer set search_path=public as $$ declare new_number text; begin if length(trim(coalesce(p_full_name,'')))<2 then raise exception 'Ism va familiya kiritilishi kerak.'; end if; if length(trim(coalesce(p_phone,'')))<7 then raise exception 'Telefon raqami noto‘g‘ri.'; end if; if p_course not in ('Dasturlash','Sun’iy intellekt','Professional Kiberxavfsizlik') then raise exception 'Yo‘nalish noto‘g‘ri.'; end if; insert into public.applications(full_name,phone,telegram,age,city,education,experience_level,course,study_format,goal,source,message) values(trim(p_full_name),trim(p_phone),nullif(trim(p_telegram),''),p_age,nullif(trim(p_city),''),nullif(trim(p_education),''),nullif(trim(p_experience_level),''),p_course,p_study_format,nullif(trim(p_goal),''),nullif(trim(p_source),''),nullif(trim(p_message),'')) returning application_number into new_number; return new_number; end; $$;
revoke all on function public.submit_application(text,text,text,integer,text,text,text,text,text,text,text,text) from public; grant execute on function public.submit_application(text,text,text,integer,text,text,text,text,text,text,text,text) to anon,authenticated;

-- ===================== STARTER DATA =====================
insert into public.groups(name,course,level,capacity) values
('Frontend F-01','Dasturlash','Beginner',20),
('Python P-01','Dasturlash','Beginner',20),
('AI A-01','Sun’iy intellekt','Beginner',20),
('Cyber C-01','Professional Kiberxavfsizlik','Beginner',20)
on conflict do nothing;
insert into public.projects(name,category,description,status) values
('NOVA GUARD','SECURITY PLATFORM','Xavfsizlik monitoringi va himoya jarayonlarini birlashtiruvchi texnologik loyiha.','active'),
('NOVA TRACE','INTELLIGENCE','Tahlil, kuzatuv va ma’lumotlar bilan ishlash uchun ishlab chiqilayotgan platforma.','active'),
('NOVA SECURITY','SECURITY SERVICE','Bizneslar uchun zamonaviy xavfsizlik xizmatlari va security assessment yo‘nalishi.','active')
on conflict (name) do nothing;

-- FIRST ADMIN SETUP:
-- 1) Supabase Authentication > Users orqali admin email bilan user yarating.
-- 2) Quyidagi buyruqni o‘sha user UUID bilan ishga tushiring:
-- update public.profiles set role='admin' where id='ADMIN_USER_UUID';
