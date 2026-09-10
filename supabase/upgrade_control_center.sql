-- CYBERSTAT CONTROL CENTER upgrade
-- Run after the existing schema.sql in Supabase SQL Editor.

ALTER TABLE public.survey_settings
  ADD COLUMN IF NOT EXISTS hero_description text DEFAULT 'Yakuniy bosqichda o‘zingiz munosib deb bilgan finalistga ovoz bering.',
  ADD COLUMN IF NOT EXISTS site_badge text DEFAULT 'FINAL EVENT',
  ADD COLUMN IF NOT EXISTS public_notice text DEFAULT 'Ommaga faqat finalistlarning loyiha ma’lumotlari, reytingi, ovozlari va joriy o‘rni ko‘rsatiladi.',
  ADD COLUMN IF NOT EXISTS footer_left text DEFAULT 'CYBERSTAT FINAL ARENA',
  ADD COLUMN IF NOT EXISTS footer_right text DEFAULT 'SECURE • CENTRAL • REAL-TIME';

UPDATE public.survey_settings SET
  hero_description = COALESCE(hero_description,'Yakuniy bosqichda o‘zingiz munosib deb bilgan finalistga ovoz bering.'),
  site_badge = COALESCE(site_badge,'FINAL EVENT'),
  public_notice = COALESCE(public_notice,'Ommaga faqat finalistlarning loyiha ma’lumotlari, reytingi, ovozlari va joriy o‘rni ko‘rsatiladi.'),
  footer_left = COALESCE(footer_left,'CYBERSTAT FINAL ARENA'),
  footer_right = COALESCE(footer_right,'SECURE • CENTRAL • REAL-TIME')
WHERE id=1;

CREATE OR REPLACE FUNCTION public.get_public_state()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_candidates jsonb; v_settings jsonb; v_participants integer;
BEGIN
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',id,'name',name,'bio',bio,'active',active,'image_url',image_url,
  'project_logo_url',project_logo_url,'author_name',author_name,'rating',rating,'votes',votes
 ) ORDER BY votes DESC,created_at ASC),'[]'::jsonb)
 INTO v_candidates FROM public.candidates WHERE active=true;
 SELECT jsonb_build_object(
  'project_name',project_name,'tagline',tagline,'hero_description',hero_description,
  'site_badge',site_badge,'public_notice',public_notice,'footer_left',footer_left,
  'footer_right',footer_right,'status',status,'results_visible',results_visible,'countdown_end',countdown_end
 ) INTO v_settings FROM public.survey_settings WHERE id=1;
 SELECT participants INTO v_participants FROM public.survey_stats WHERE id=1;
 RETURN jsonb_build_object('candidates',v_candidates,'settings',coalesce(v_settings,'{}'::jsonb),'participants',coalesce(v_participants,0));
END; $$;
REVOKE ALL ON FUNCTION public.get_public_state() FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_state() TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_content(
 p_project_name text, p_tagline text, p_hero_description text, p_site_badge text,
 p_public_notice text, p_footer_left text, p_footer_right text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF length(trim(coalesce(p_project_name,''))) < 2 THEN RAISE EXCEPTION 'PROJECT_NAME_REQUIRED'; END IF;
 UPDATE public.survey_settings SET
  project_name=trim(p_project_name), tagline=trim(coalesce(p_tagline,'')),
  hero_description=trim(coalesce(p_hero_description,'')), site_badge=trim(coalesce(p_site_badge,'')),
  public_notice=trim(coalesce(p_public_notice,'')), footer_left=trim(coalesce(p_footer_left,'')),
  footer_right=trim(coalesce(p_footer_right,'')), updated_at=now()
 WHERE id=1;
 INSERT INTO public.audit_logs(actor,action,target,detail)
 VALUES('ADMIN','SAYT_KONTENTI_YANGILANDI','PUBLIC_CONTENT','Public sahifa matnlari yangilandi.');
 RETURN jsonb_build_object('ok',true);
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_content(text,text,text,text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_set_content(text,text,text,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_analytics()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_total integer; v_participants integer; v_avg numeric; v_top_delta integer; v_daily jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 SELECT COALESCE(sum(votes),0) INTO v_total FROM public.candidates;
 SELECT COALESCE(participants,0) INTO v_participants FROM public.survey_stats WHERE id=1;
 SELECT COALESCE(avg(votes),0) INTO v_avg FROM public.candidates;
 SELECT COALESCE(count(*),0)::integer INTO v_top_delta
 FROM public.audit_logs
 WHERE action IN ('OVOZ_QOSHILDI','OVOZ_AYIRILDI')
   AND created_at >= now() - interval '24 hours';
 SELECT coalesce(jsonb_agg(jsonb_build_object('day',day,'votes',votes) ORDER BY day),'[]'::jsonb) INTO v_daily
 FROM (
   SELECT to_char(d::date,'DD.MM') AS day, COALESCE(sum(CASE WHEN v.id IS NOT NULL THEN 1 ELSE 0 END),0)::integer AS votes
   FROM generate_series(current_date-6,current_date,interval '1 day') d
   LEFT JOIN public.votes v ON v.created_at::date=d::date
   GROUP BY d::date
 ) q;
 RETURN jsonb_build_object('ok',true,'total_votes',v_total,'participants',v_participants,'average_votes',round(v_avg,1),'top_delta',v_top_delta,'daily',v_daily);
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_analytics() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics() TO authenticated;

-- If your existing admin delete function still uses p_id, keep it; the frontend now calls p_candidate_id.
DROP FUNCTION IF EXISTS public.admin_delete_candidate(text);
CREATE OR REPLACE FUNCTION public.admin_delete_candidate(p_candidate_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_name text; v_votes integer;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 SELECT name,votes INTO v_name,v_votes FROM public.candidates WHERE id=p_candidate_id FOR UPDATE;
 IF v_name IS NULL THEN RAISE EXCEPTION 'CANDIDATE_NOT_FOUND'; END IF;
 IF v_votes>0 THEN
  UPDATE public.candidates SET active=false,updated_at=now() WHERE id=p_candidate_id;
  INSERT INTO public.audit_logs(actor,action,target,detail) VALUES('ADMIN','NOMZOD_ARXIVLANDI',v_name,'Ovoz mavjudligi sababli o‘chirilmadi, faolsizlantirildi.');
 ELSE
  DELETE FROM public.candidates WHERE id=p_candidate_id;
  INSERT INTO public.audit_logs(actor,action,target,detail) VALUES('ADMIN','NOMZOD_OCHIRILDI',v_name,'Nomzod ovozlari 0 bo‘lgan holatda o‘chirildi.');
 END IF;
 RETURN jsonb_build_object('ok',true,'archived',v_votes>0);
END; $$;
REVOKE ALL ON FUNCTION public.admin_delete_candidate(text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_delete_candidate(text) TO authenticated;
