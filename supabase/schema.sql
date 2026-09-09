create extension if not exists pgcrypto;

-- CYBERSTAT production schema
-- Run this file in a fresh Supabase project SQL Editor.

create table if not exists public.candidates (
  id text primary key,
  name text not null,
  bio text not null default '',
  active boolean not null default true,
  votes integer not null default 0 check (votes >= 0),
  admin_votes integer not null default 0 check (admin_votes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.survey_settings (
  id integer primary key default 1 check (id = 1),
  project_name text not null default 'CYBERSTAT',
  tagline text not null default 'Kelajakning raqamli ovoz berish tizimi',
  organizer_name text not null default 'KIBERXAVFSIZLIK MARKAZI',
  organizer_text text not null default 'Ushbu so‘rovnoma KIBERXAVFSIZLIK MARKAZI tomonidan o‘tkazilmoqda.',
  status text not null default 'FAOL' check (status in ('FAOL','TOXTATILGAN','YAKUNLANGAN')),
  votes_per_user integer not null default 1 check (votes_per_user between 1 and 1),
  show_results boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Backward-compatible additions for an already-created CYBERSTAT database.
alter table public.survey_settings add column if not exists organizer_name text not null default 'KIBERXAVFSIZLIK MARKAZI';
alter table public.survey_settings add column if not exists organizer_text text not null default 'Ushbu so‘rovnoma KIBERXAVFSIZLIK MARKAZI tomonidan o‘tkazilmoqda.';
alter table public.survey_settings add column if not exists show_results boolean not null default true;

create table if not exists public.survey_stats (
  id integer primary key default 1 check (id = 1),
  participants integer not null default 0 check (participants >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  candidate_id text not null references public.candidates(id) on delete restrict,
  voter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists votes_one_per_voter on public.votes(voter_id);
create index if not exists votes_candidate_idx on public.votes(candidate_id);
create index if not exists votes_created_at_idx on public.votes(created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null default 'ADMIN',
  action text not null,
  target text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists audit_created_at_idx on public.audit_logs(created_at desc);

insert into public.candidates(id,name,bio,active,votes,admin_votes) values
('c1','Nomzod #01','Raqamli infratuzilma va shaharsozlik yo‘nalishi bo‘yicha tashabbuskor.',true,4281,0),
('c2','Nomzod #02','Ta’lim va yoshlar salohiyatini rivojlantirish dasturlari muallifi.',true,3654,0),
('c3','Nomzod #03','Kichik biznes va tadbirkorlikni qo‘llab-quvvatlash bo‘yicha loyihalar rahbari.',true,2390,0),
('c4','Nomzod #04','Ekologiya va yashil energetika sohasidagi muhandis-islohotchi.',true,1622,0),
('c5','Nomzod #05','Sog‘liqni saqlash tizimini raqamlashtirish bo‘yicha ekspert.',true,900,0)
on conflict (id) do nothing;

insert into public.survey_settings(id,project_name,tagline,organizer_name,organizer_text,status,votes_per_user,show_results)
values(1,'CYBERSTAT','Kelajakning raqamli ovoz berish tizimi','KIBERXAVFSIZLIK MARKAZI','Ushbu so‘rovnoma KIBERXAVFSIZLIK MARKAZI tomonidan o‘tkazilmoqda.','FAOL',1,true)
on conflict (id) do nothing;

insert into public.survey_stats(id,participants) values(1,8421) on conflict (id) do nothing;

alter table public.candidates enable row level security;
alter table public.survey_settings enable row level security;
alter table public.survey_stats enable row level security;
alter table public.votes enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path=public
as $$
  select coalesce((auth.jwt()->'app_metadata'->>'role') = 'admin', false);
$$;

-- Remove old broad policies if this schema is being applied over the previous version.
drop policy if exists "public read candidates" on public.candidates;
drop policy if exists "public read settings" on public.survey_settings;
drop policy if exists "public read stats" on public.survey_stats;
drop policy if exists "authenticated read votes" on public.votes;
drop policy if exists "admin candidates" on public.candidates;
drop policy if exists "admin settings" on public.survey_settings;
drop policy if exists "admin stats" on public.survey_stats;
drop policy if exists "admin audit read" on public.audit_logs;
drop policy if exists "admin audit insert" on public.audit_logs;

create policy "public read candidates" on public.candidates for select using (true);
create policy "public read settings" on public.survey_settings for select using (true);
create policy "public read stats" on public.survey_stats for select using (true);
-- Individual vote rows are private. Public results use candidate counters instead.
create policy "admin read votes" on public.votes for select to authenticated using (public.is_admin());
create policy "admin audit read" on public.audit_logs for select to authenticated using (public.is_admin());

-- All writes go through security-definer functions. This prevents a browser from
-- directly changing vote counters, settings or audit history.
revoke all on public.candidates from anon, authenticated;
revoke all on public.survey_settings from anon, authenticated;
revoke all on public.survey_stats from anon, authenticated;
revoke all on public.votes from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;
grant select on public.candidates to anon, authenticated;
grant select on public.survey_settings to anon, authenticated;
grant select on public.survey_stats to anon, authenticated;

create or replace function public.cast_vote(p_candidate_id text)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_status text;
  v_name text;
  v_votes integer;
  v_participants integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select status into v_status from public.survey_settings where id=1;
  if v_status <> 'FAOL' then raise exception 'VOTING_NOT_ACTIVE'; end if;
  if exists(select 1 from public.votes where voter_id=v_user) then raise exception 'ALREADY_VOTED'; end if;

  select name into v_name from public.candidates where id=p_candidate_id and active=true for update;
  if v_name is null then raise exception 'CANDIDATE_NOT_FOUND'; end if;

  insert into public.votes(candidate_id,voter_id) values(p_candidate_id,v_user);
  update public.candidates set votes=votes+1, updated_at=now() where id=p_candidate_id returning votes into v_votes;
  update public.survey_stats set participants=participants+1, updated_at=now() where id=1 returning participants into v_participants;
  return jsonb_build_object('ok',true,'candidate_id',p_candidate_id,'votes',v_votes,'participants',v_participants);
end;
$$;
revoke all on function public.cast_vote(text) from public;
grant execute on function public.cast_vote(text) to anon, authenticated;

create or replace function public.admin_save_candidate(
  p_id text,
  p_name text,
  p_bio text,
  p_active boolean
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_id text := nullif(trim(coalesce(p_id,'')), '');
  v_name text := trim(coalesce(p_name,''));
  v_old text;
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'INVALID_NAME'; end if;

  if v_id is null then
    v_id := 'c_' || replace(gen_random_uuid()::text,'-','');
    insert into public.candidates(id,name,bio,active) values(v_id,v_name,trim(coalesce(p_bio,'')),coalesce(p_active,true));
    insert into public.audit_logs(actor,action,target,detail)
    values(coalesce(auth.jwt()->>'email','ADMIN'),'Nomzod qo‘shildi',v_name,'Yangi nomzod yaratildi.');
  else
    select name into v_old from public.candidates where id=v_id;
    if v_old is null then raise exception 'CANDIDATE_NOT_FOUND'; end if;
    update public.candidates
      set name=v_name,bio=trim(coalesce(p_bio,'')),active=coalesce(p_active,true),updated_at=now()
      where id=v_id;
    insert into public.audit_logs(actor,action,target,detail)
    values(coalesce(auth.jwt()->>'email','ADMIN'),'Nomzod yangilandi',v_name,'Oldingi nom: '||v_old||'.');
  end if;
  return jsonb_build_object('ok',true,'id',v_id);
end;
$$;
revoke all on function public.admin_save_candidate(text,text,text,boolean) from public;
grant execute on function public.admin_save_candidate(text,text,text,boolean) to authenticated;

create or replace function public.admin_remove_candidate(p_id text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_name text;
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select name into v_name from public.candidates where id=p_id for update;
  if v_name is null then raise exception 'CANDIDATE_NOT_FOUND'; end if;
  if exists(select 1 from public.votes where candidate_id=p_id) then
    update public.candidates set active=false,updated_at=now() where id=p_id;
    insert into public.audit_logs(actor,action,target,detail) values(coalesce(auth.jwt()->>'email','ADMIN'),'Nomzod o‘chirildi (arxiv)',v_name,'Ovozlar mavjudligi sababli yozuv arxivlandi va yashirildi.');
  else
    delete from public.candidates where id=p_id;
    insert into public.audit_logs(actor,action,target,detail) values(coalesce(auth.jwt()->>'email','ADMIN'),'Nomzod o‘chirildi',v_name,'Nomzod va uning ma’lumotlari o‘chirildi.');
  end if;
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.admin_remove_candidate(text) from public;
grant execute on function public.admin_remove_candidate(text) to authenticated;

create or replace function public.admin_adjust_votes(p_candidate_id text,p_delta integer,p_reason text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_name text; v_new integer; v_delta integer := p_delta;
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if v_delta=0 or abs(v_delta)>1000000 or length(trim(coalesce(p_reason,'')))<3 then raise exception 'INVALID_ADMIN_CHANGE'; end if;
  select name into v_name from public.candidates where id=p_candidate_id for update;
  if v_name is null then raise exception 'CANDIDATE_NOT_FOUND'; end if;
  update public.candidates set votes=greatest(0,votes+v_delta),admin_votes=greatest(0,admin_votes+greatest(v_delta,0)),updated_at=now() where id=p_candidate_id returning votes into v_new;
  insert into public.audit_logs(actor,action,target,detail)
  values(coalesce(auth.jwt()->>'email','ADMIN'),case when v_delta>0 then 'Ovoz qo‘shildi' else 'Ovoz ayirildi' end,v_name,concat('O‘zgarish: ',v_delta,' · Sabab: ',trim(p_reason)));
  return jsonb_build_object('ok',true,'votes',v_new);
end;
$$;
revoke all on function public.admin_adjust_votes(text,integer,text) from public;
grant execute on function public.admin_adjust_votes(text,integer,text) to authenticated;

create or replace function public.admin_save_settings(
  p_project_name text,
  p_tagline text,
  p_status text,
  p_show_results boolean,
  p_organizer_name text,
  p_organizer_text text
) returns jsonb
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_status not in ('FAOL','TOXTATILGAN','YAKUNLANGAN') then raise exception 'INVALID_STATUS'; end if;
  update public.survey_settings set
    project_name=trim(p_project_name),tagline=trim(p_tagline),status=p_status,
    show_results=coalesce(p_show_results,true),organizer_name=trim(p_organizer_name),
    organizer_text=trim(p_organizer_text),updated_at=now() where id=1;
  insert into public.audit_logs(actor,action,target,detail)
  values(coalesce(auth.jwt()->>'email','ADMIN'),'Sozlamalar yangilandi',trim(p_project_name),'Holat: '||p_status||' · Natijalar: '||case when p_show_results then 'ochiq' else 'yopiq' end);
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.admin_save_settings(text,text,text,boolean,text,text) from public;
grant execute on function public.admin_save_settings(text,text,text,boolean,text,text) to authenticated;

create or replace function public.admin_reset_survey(p_reason text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_count integer;
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'RESET_REASON_REQUIRED'; end if;
  select count(*) into v_count from public.votes;
  delete from public.votes;
  update public.candidates set votes=0,admin_votes=0,updated_at=now();
  update public.survey_stats set participants=0,updated_at=now() where id=1;
  insert into public.audit_logs(actor,action,target,detail)
  values(coalesce(auth.jwt()->>'email','ADMIN'),'So‘rovnoma qayta tiklandi','CYBERSTAT','O‘chirilgan real ovozlar: '||v_count||' · Sabab: '||trim(p_reason));
  return jsonb_build_object('ok',true,'deleted_votes',v_count);
end;
$$;
revoke all on function public.admin_reset_survey(text) from public;
grant execute on function public.admin_reset_survey(text) to authenticated;

-- Realtime: changes made by an admin are immediately broadcast to public clients.
alter table public.candidates replica identity full;
alter table public.survey_settings replica identity full;
alter table public.survey_stats replica identity full;
alter table public.audit_logs replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.candidates;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.survey_settings;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.survey_stats;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.audit_logs;
exception when duplicate_object then null; end $$;
