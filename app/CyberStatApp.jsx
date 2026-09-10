"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Zap, Users, BarChart3, ShieldCheck, ChevronRight, X, Check,
  Lock, Unlock, Plus, Minus, Trash2, Pencil, History, Settings,
  LayoutDashboard, Vote, ArrowLeft, TrendingUp, RadioTower, RotateCcw, Download,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { supabase } from "../lib/supabase";

/* ============================================================
   CYBERSTAT — raqamli ovoz berish platformasi
   Demo backend: window.storage (persistent, artifact-ichida)
   ============================================================ */

const SK = {
  candidates: "cyberstat:candidates",
  settings: "cyberstat:settings",
  audit: "cyberstat:audit",
  participants: "cyberstat:participants",
};
const PK = { voted: "cyberstat:voted" };

const DEFAULT_CANDIDATES = [
  { id: "c1", name: "Nomzod #01", bio: "Raqamli infratuzilma va shaharsozlik yo‘nalishi bo‘yicha tashabbuskor.", active: true, votes: 4281, adminVotes: 0 },
  { id: "c2", name: "Nomzod #02", bio: "Ta’lim va yoshlar salohiyatini rivojlantirish dasturlari muallifi.", active: true, votes: 3654, adminVotes: 0 },
  { id: "c3", name: "Nomzod #03", bio: "Kichik biznes va tadbirkorlikni qo‘llab-quvvatlash bo‘yicha loyihalar rahbari.", active: true, votes: 2390, adminVotes: 0 },
  { id: "c4", name: "Nomzod #04", bio: "Ekologiya va yashil energetika sohasidagi muhandis-islohotchi.", active: true, votes: 1622, adminVotes: 0 },
  { id: "c5", name: "Nomzod #05", bio: "Sog‘liqni saqlash tizimini raqamlashtirish bo‘yicha ekspert.", active: true, votes: 900, adminVotes: 0 },
];
const DEFAULT_SETTINGS = {
  projectName: "CYBERSTAT",
  tagline: "Kelajakning raqamli ovoz berish tizimi",
  status: "FAOL", // FAOL | TOXTATILGAN | YAKUNLANGAN
  votesPerUser: 1,
};

function uid() { return Math.random().toString(36).slice(2, 9); }
function fmt(n) { return new Intl.NumberFormat("uz-UZ").format(Math.round(n)); }
function pct(v, total) { return total > 0 ? (v / total) * 100 : 0; }
function nowStr() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ---------------- Supabase data layer ---------------- */
async function ensureVoterSession(){
  const {data:{session}}=await supabase.auth.getSession();
  if(session) return session;
  const {data,error}=await supabase.auth.signInAnonymously();
  if(error) throw error;
  return data.session;
}
async function loadCandidates(){
const {data,error}=await supabase.from("candidates").select("id,name,bio,active,image_url,votes,admin_votes,created_at,updated_at")  
  if(error) throw error;
  return(data||[]).map(c=>({...c,adminVotes:c.admin_votes||0}));
}
async function loadSettings(){
  const {data,error}=await supabase.from("survey_settings").select("project_name,tagline,organizer_name,organizer_text,status,votes_per_user,show_results,updated_at").eq("id",1).single();
  if(error) throw error;
  return{projectName:data.project_name,tagline:data.tagline,organizerName:data.organizer_name,organizerText:data.organizer_text,status:data.status,votesPerUser:data.votes_per_user,showResults:data.show_results};
}
async function loadParticipants(){
  const {data,error}=await supabase.from("survey_stats").select("participants").eq("id",1).single();
  if(error) throw error;
  return data.participants;
}
async function loadAudit(){
  const {data,error}=await supabase.from("audit_logs").select("id,actor,action,target,detail,created_at").order("created_at",{ascending:false}).limit(200);
  if(error) throw error;
  return(data||[]).map(a=>({...a,time:new Date(a.created_at).toLocaleString("uz-UZ")}));
}
async function loadVoteLog(){
  const {data,error}=await supabase.from("votes").select("id,candidate_id,voter_id,created_at,candidates(name)").order("created_at",{ascending:false}).limit(500);
  if(error) throw error;
  return data||[];
}
async function adminSaveCandidate(candidate){
  const {data,error}=await supabase.rpc("admin_save_candidate",{
    p_id:candidate.id || null,
    p_name:candidate.name,
    p_bio:candidate.bio || "",
    p_active:!!candidate.active,
    p_image_url:candidate.image_url || null
  });

  if(error) throw error;

  if(!data?.ok){
    throw new Error("Nomzodni saqlash tasdiqlanmadi");
  }

  return data;
}
async function adminRemoveCandidate(id){
  const {error}=await supabase.rpc("admin_remove_candidate",{p_id:id});
  if(error) throw error;
}
async function adminAdjustVotes(candidateId,delta,reason){
  const {error}=await supabase.rpc("admin_adjust_votes",{p_candidate_id:candidateId,p_delta:delta,p_reason:reason});
  if(error) throw error;
}
async function adminSaveSettings(next){
  const {error}=await supabase.rpc("admin_save_settings",{
    p_project_name:next.projectName,p_tagline:next.tagline,p_status:next.status,
    p_show_results:!!next.showResults,p_organizer_name:next.organizerName,p_organizer_text:next.organizerText
  });
  if(error) throw error;
}
async function adminResetSurvey(reason){
  const {error}=await supabase.rpc("admin_reset_survey",{p_reason:reason});
  if(error) throw error;
}


export default function App() {
  const [view, setView] = useState("home"); // home | vote | results | admin
  const [candidates, setCandidates] = useState(DEFAULT_CANDIDATES);
  const [settings, setSettings] = useState({...DEFAULT_SETTINGS, organizerName:"KIBERXAVFSIZLIK MARKAZI", organizerText:"Ushbu so‘rovnoma KIBERXAVFSIZLIK MARKAZI tomonidan o‘tkazilmoqda.", showResults:true});
  const [audit, setAudit] = useState([]);
  const [participants, setParticipants] = useState(8421);
  const [votedFor, setVotedFor] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(()=>{(async()=>{try{const {data:{session}}=await supabase.auth.getSession();const isAdmin=!!session?.user&&session.user.app_metadata?.role==="admin";setAdminAuthed(isAdmin);const[c,st,p]=await Promise.all([loadCandidates(),loadSettings(),loadParticipants()]);setCandidates(c);setSettings(st);setParticipants(p);if(isAdmin){try{setAudit(await loadAudit());}catch(e){console.error(e);}}}catch(e){console.error(e);}finally{setLoaded(true);}})();},[]);
  useEffect(()=>{
    const channel=supabase.channel("cyberstat-live",{config:{broadcast:{ack:true}}})
      .on("postgres_changes",{event:"*",schema:"public",table:"candidates"},async()=>{
        try{setCandidates(await loadCandidates());setLastUpdate(Date.now());}catch(e){console.error(e);}
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"survey_settings"},async()=>{
        try{setSettings(await loadSettings());setLastUpdate(Date.now());}catch(e){console.error(e);}
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"survey_stats"},async()=>{
        try{setParticipants(await loadParticipants());setLastUpdate(Date.now());}catch(e){console.error(e);}
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"audit_logs"},async()=>{
        try{const {data:{session}}=await supabase.auth.getSession();if(session?.user?.app_metadata?.role==="admin")setAudit(await loadAudit());}catch(e){console.error(e);}
      })
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[]);

  const totalVotes = useMemo(
    () => candidates.reduce((sum, c) => sum + c.votes, 0),
    [candidates]
  );

  const castVote=useCallback(async(candidateId)=>{if(votedFor||settings.status!=="FAOL")return;try{await ensureVoterSession();const{error}=await supabase.rpc("cast_vote",{p_candidate_id:candidateId});if(error)throw error;const[c,p]=await Promise.all([loadCandidates(),loadParticipants()]);setCandidates(c);setParticipants(p);setVotedFor(candidateId);}catch(e){if((e?.message||"").includes("ALREADY_VOTED"))setVotedFor("already-voted");else console.error(e);}},[votedFor,settings.status]);
  const refreshCandidates=useCallback(async()=>{setCandidates(await loadCandidates());setLastUpdate(Date.now());},[]);
  const saveSettings=useCallback(async(next)=>{await adminSaveSettings(next);setSettings(await loadSettings());setLastUpdate(Date.now());},[]);

  if (!loaded) {
    return (
      <div style={rootStyle}>
        <GlobalStyle />
        <div className="min-h-[100dvh] flex items-center justify-center">
          <div className="text-cyan-300 tracking-[0.3em] text-sm animate-pulse">TIZIM YUKLANMOQDA…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={rootStyle}>
      <GlobalStyle />
      <GridBackdrop />
      {view !== "admin" && (
        <PublicNav view={view} setView={setView} projectName={settings.projectName} showResults={settings.showResults} />
      )}

      {view === "home" && (
        <Home
          settings={settings}
          totalVotes={totalVotes}
          candidateCount={candidates.filter((c) => c.active).length}
          participants={participants}
          setView={setView}
        />
      )}
      {view === "vote" && (
        <VotePage
          candidates={candidates.filter((c) => c.active)}
          totalVotes={totalVotes}
          settings={settings}
          votedFor={votedFor}
          onVote={castVote}
        />
      )}
      {view === "results" && settings.showResults !== false && (
        <ResultsPage
          candidates={candidates.filter((c) => c.active)}
          totalVotes={totalVotes}
          participants={participants}
          lastUpdate={lastUpdate}
        />
      )}
      {view === "admin" && (
        <AdminPanel
          authed={adminAuthed}
          setAuthed={setAdminAuthed}
          candidates={candidates}
          refreshCandidates={refreshCandidates}
          settings={settings}
          saveSettings={saveSettings}
          audit={audit}
          setAudit={setAudit}
          totalVotes={totalVotes}
          participants={participants}
          exitAdmin={() => setView("home")}
        />
      )}

      {view !== "admin" && <PublicFooter setView={setView} />}
    </div>
  );
}

const rootStyle = {
  minHeight: "100dvh",
  background: "#03050A",
  color: "#DCEBFF",
  fontFamily: "'Manrope', system-ui, sans-serif",
  position: "relative",
  overflowX: "hidden",
};

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
      .font-display { font-family: 'Rajdhani', sans-serif; letter-spacing: 0.01em; }
      * { box-sizing: border-box; }
      ::selection { background: rgba(0,240,255,0.25); }
      @keyframes gridMove { from { background-position: 0 0; } to { background-position: 64px 64px; } }
      @keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      @keyframes glowIn { from { opacity:0; transform: translateY(10px);} to { opacity:1; transform:none;} }
      @keyframes countReveal { from { opacity: 0; } to { opacity: 1; } }
      @keyframes spinSlow { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
      @keyframes ringPulse { 0% { box-shadow: 0 0 0 0 rgba(0,240,255,0.35);} 100% { box-shadow: 0 0 0 18px rgba(0,240,255,0);} }
      .glow-in { animation: glowIn 0.5s ease both; }
      .glass {
        background: linear-gradient(180deg, rgba(16,22,38,0.7), rgba(9,13,24,0.65));
        border: 1px solid rgba(120,160,255,0.14);
        backdrop-filter: blur(14px);
      }
      .neon-btn {
        position: relative;
        background: linear-gradient(90deg, #00E0FF, #4C7CFF);
        color: #021018;
        font-weight: 700;
        box-shadow: 0 0 24px rgba(0,224,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.25);
        transition: transform .15s ease, box-shadow .2s ease;
      }
      .neon-btn:hover { box-shadow: 0 0 34px rgba(0,224,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.35); transform: translateY(-1px); }
      .neon-btn:active { transform: translateY(0); }
      .ghost-btn {
        border: 1px solid rgba(140,170,255,0.35);
        color: #C9DBFF;
        background: rgba(140,170,255,0.05);
        transition: all .2s ease;
      }
      .ghost-btn:hover { border-color: rgba(0,224,255,0.6); background: rgba(0,224,255,0.08); }
      .candidate-card { transition: border-color .25s ease, box-shadow .25s ease, transform .2s ease; }
      .candidate-card:hover { border-color: rgba(0,224,255,0.55); box-shadow: 0 0 40px rgba(0,224,255,0.14); transform: translateY(-3px); }
      .bar-fill { transition: width 0.8s cubic-bezier(.2,.8,.2,1); }
      input, select, textarea { outline: none; }
      input:focus, select:focus, textarea:focus { border-color: rgba(0,224,255,0.6) !important; }
    `}</style>
  );
}

function GridBackdrop() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage:
          "linear-gradient(rgba(90,140,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(90,140,255,0.06) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        animation: "gridMove 12s linear infinite",
        maskImage: "radial-gradient(ellipse 90% 70% at 50% 0%, black 40%, transparent 100%)",
      }}
    >
      <div style={{
        position: "absolute", top: "-10%", right: "-10%", width: 520, height: 520, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,255,0.16), transparent 70%)", filter: "blur(10px)",
      }} />
      <div style={{
        position: "absolute", bottom: "-15%", left: "-10%", width: 560, height: 560, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,224,255,0.10), transparent 70%)", filter: "blur(10px)",
      }} />
    </div>
  );
}

/* ---------------- Public Nav ---------------- */
function PublicNav({ view, setView, projectName, showResults }) {
  const items = [
    { id: "home", label: "BOSH SAHIFA" },
    { id: "vote", label: "OVOZ BERISH" },
    ...(showResults !== false ? [{ id: "results", label: "NATIJALAR" }] : []),
  ];
  return (
    <div className="relative z-10 sticky top-0" style={{ backdropFilter: "blur(10px)" }}>
      <div className="glass" style={{ borderLeft: "none", borderRight: "none", borderTop: "none" }}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <button onClick={() => setView("home")} className="flex items-center gap-2 shrink-0">
            <span style={{ color: "#00E0FF" }} className="text-lg">◈</span>
            <span className="font-display text-lg font-bold" style={{ color: "#EAF4FF" }}>{projectName}</span>
          </button>
          <nav className="hidden sm:flex items-center gap-1">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => setView(it.id)}
                className="font-display text-sm px-3 py-2 rounded-md transition"
                style={{
                  color: view === it.id ? "#00E0FF" : "#9FB1D6",
                  background: view === it.id ? "rgba(0,224,255,0.08)" : "transparent",
                  letterSpacing: "0.06em",
                }}
              >
                {it.label}
              </button>
            ))}
          </nav>
          <button onClick={() => setView("vote")} className="neon-btn font-display text-sm px-4 py-2.5 rounded-md whitespace-nowrap">
            OVOZ BERISH
          </button>
        </div>
        <div className="sm:hidden flex justify-around border-t px-2 py-2" style={{ borderColor: "rgba(120,160,255,0.12)" }}>
          {items.map((it) => (
            <button key={it.id} onClick={() => setView(it.id)} className="font-display text-xs px-2 py-1"
              style={{ color: view === it.id ? "#00E0FF" : "#9FB1D6" }}>
              {it.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PublicFooter({ setView }) {
  return (
    <footer className="relative z-10 mt-16 border-t" style={{ borderColor: "rgba(120,160,255,0.1)" }}>
      <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm" style={{ color: "#5E6E90" }}>
        <span>© 2026 CYBERSTAT — raqamli ovoz berish tizimi.</span>
        <button onClick={() => setView("admin")} className="opacity-40 hover:opacity-80 transition text-xs">·</button>
      </div>
    </footer>
  );
}

/* ---------------- Count-up number ---------------- */
function CountUp({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const delta = value - start;
    const t0 = performance.now();
    let raf;
    function step(t) {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(start + delta * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else prev.current = value;
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span>{fmt(display)}</span>;
}

/* ---------------- Home ---------------- */
function Home({ settings, setView }) {
  const ended = settings.status === "YAKUNLANGAN";

  return (
    <main className="relative z-10 max-w-6xl mx-auto px-5 pt-14 pb-20">
      <div
        className="glass rounded-2xl px-5 py-4 mb-8"
        style={{
          border: "1px solid rgba(0,224,255,0.2)",
          boxShadow: "0 0 30px rgba(0,224,255,0.08)"
        }}
      >
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={22}
            className="mt-0.5 shrink-0"
            style={{ color: "#33FFB0" }}
          />
          <div>
            <p
              className="font-display font-bold text-sm tracking-[0.08em]"
              style={{ color: "#5FE8FF" }}
            >
              CYBERSTAT
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "#C9DBFF" }}
            >
              Xavfsiz va markazlashtirilgan ovoz berish platformasi.
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "#7181A4" }}
            >
              Barcha ovozlar markaziy server orqali qayd etiladi.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <div className="glow-in">
          <div
            className="inline-flex items-center gap-2 text-xs font-display px-3 py-1.5 rounded-full mb-6"
            style={{
              background: "rgba(0,224,255,0.08)",
              border: "1px solid rgba(0,224,255,0.25)",
              color: "#5FE8FF"
            }}
          >
            <RadioTower size={13} />
            {settings.tagline.toUpperCase()}
          </div>

          <h1
            className="font-display font-bold leading-[1.05] mb-6"
            style={{
              fontSize: "clamp(2.2rem, 5vw, 3.6rem)",
              color: "#F2F8FF"
            }}
          >
            Sizning ovozingiz —<br />
            sizning tanlovingiz
          </h1>

          <p
            className="mb-8 max-w-md leading-relaxed"
            style={{
              color: "#96A6C8",
              fontSize: "1.05rem"
            }}
          >
            Ovoz berish jarayonida ishtirok eting.
            Tanlovingizni xavfsiz tarzda yuboring.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setView("vote")}
              disabled={ended}
              className="neon-btn font-display px-6 py-3.5 rounded-lg flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              OVOZ BERISHNI BOSHLASH
              <ChevronRight size={18} />
            </button>

            {settings.showResults !== false && (
              <button
                onClick={() => setView("results")}
                className="ghost-btn font-display px-6 py-3.5 rounded-lg"
              >
                NATIJALARNI KO‘RISH
              </button>
            )}
          </div>
        </div>

        <div className="hidden md:block" aria-hidden="true" />
      </div>
    </main>
  );
}

function Stat({ label, value, raw }) {
  return (
    <div className="glass rounded-xl px-4 py-3.5">
      <div className="text-[11px] font-display tracking-[0.12em] mb-1" style={{ color: "#5E6E90" }}>{label}</div>
      {raw ? value : <div className="font-display text-xl font-bold" style={{ color: "#EAF4FF" }}>{value}</div>}
    </div>
  );
}

function StatusPill({ status, compact }) {
  const map = {
    FAOL: { c: "#33FFB0", t: "FAOL" },
    TOXTATILGAN: { c: "#FFC24B", t: "TO‘XTATILGAN" },
    YAKUNLANGAN: { c: "#FF5C7A", t: "YAKUNLANGAN" },
  };
  const s = map[status] || map.FAOL;
  return (
    <span className={`font-display font-bold inline-flex items-center gap-1.5 ${compact ? "text-base" : "text-sm"}`} style={{ color: s.c }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.c, animation: "pulseDot 1.6s ease-in-out infinite" }} />
      {s.t}
    </span>
  );
}

function HudPanel({ totalVotes, status }) {
  return (
    <div className="relative glow-in hidden md:flex items-center justify-center" style={{ animationDelay: "0.15s" }}>
      <div style={{
        width: 340, height: 340, borderRadius: "50%",
        border: "1px solid rgba(0,224,255,0.18)", position: "relative",
        animation: "spinSlow 40s linear infinite",
      }}>
        <div style={{ position: "absolute", inset: 24, borderRadius: "50%", border: "1px dashed rgba(139,92,255,0.25)" }} />
        <div style={{ position: "absolute", inset: 60, borderRadius: "50%", border: "1px solid rgba(0,224,255,0.12)" }} />
        {[0, 90, 180, 270].map((deg) => (
          <div key={deg} style={{
            position: "absolute", top: "50%", left: "50%", width: 6, height: 6, borderRadius: "50%",
            background: "#00E0FF", transform: `rotate(${deg}deg) translate(170px) rotate(-${deg}deg)`,
            boxShadow: "0 0 10px #00E0FF",
          }} />
        ))}
      </div>
      <div className="glass absolute rounded-2xl px-6 py-5 text-center" style={{ animation: "ringPulse 2.4s ease-out infinite" }}>
        <div className="text-[11px] font-display tracking-[0.15em] mb-1" style={{ color: "#5E6E90" }}>JAMI OVOZLAR</div>
        <div className="font-display font-bold text-3xl" style={{ color: "#EAF4FF" }}><CountUp value={totalVotes} /></div>
        <div className="mt-2"><StatusPill status={status} /></div>
      </div>
    </div>
  );
}

/* ---------------- Vote page ---------------- */
function VotePage({ candidates, totalVotes, settings, votedFor, onVote }) {
  const [confirming, setConfirming] = useState(null);
  const [justVoted, setJustVoted] = useState(false);
  const ended = settings.status !== "FAOL";

  async function confirm() {
    await onVote(confirming.id);
    setConfirming(null);
    setJustVoted(true);
    setTimeout(() => setJustVoted(false), 2600);
  }

  return (
    <main className="relative z-10 max-w-6xl mx-auto px-5 pt-10 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <h1 className="font-display font-bold text-3xl" style={{ color: "#F2F8FF" }}>Nomzodni tanlang</h1>
        <div className="flex items-center gap-4 text-sm font-display">
          <span style={{ color: "#7C8AA8" }}>OVOZ BERISH HOLATI:</span>
          <StatusPill status={settings.status} />
          <span style={{ color: "#7C8AA8" }}>JAMI OVOZLAR: <b style={{ color: "#EAF4FF" }}>{fmt(totalVotes)}</b></span>
        </div>
      </div>

      {settings.status === "YAKUNLANGAN" && (
        <div className="glass rounded-xl px-5 py-4 mb-8 font-display" style={{ borderColor: "rgba(255,92,122,0.4)", color: "#FF8FA6" }}>
          OVOZ BERISH YAKUNLANGAN
        </div>
      )}
      {votedFor && (
        <div className="rounded-xl px-5 py-4 mb-8 flex items-center gap-2 font-display" style={{ background: "rgba(51,255,176,0.08)", border: "1px solid rgba(51,255,176,0.3)", color: "#7BFFCF" }}>
          <Check size={18} /> Siz allaqachon ovoz bergansiz.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {candidates.map((c, i) => {
          const p = pct(c.votes, totalVotes);
          const isMine = votedFor === c.id;
          return (
            <div key={c.id} className="candidate-card glass rounded-2xl p-5 flex flex-col" style={{ borderColor: isMine ? "rgba(51,255,176,0.5)" : undefined }}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-xs tracking-[0.1em]" style={{ color: "#5FE8FF" }}>NOMZOD #{String(i + 1).padStart(2, "0")}</span>
                {isMine && <span className="text-[11px] font-display flex items-center gap-1" style={{ color: "#33FFB0" }}><Check size={12} /> SIZNING OVOZINGIZ</span>}
              </div>
<div
  className="rounded-xl mb-4 aspect-[4/3] overflow-hidden flex items-center justify-center"
  style={{
    background: "linear-gradient(135deg, rgba(0,224,255,0.10), rgba(139,92,255,0.12))",
    border: "1px solid rgba(120,160,255,0.14)"
  }}
>
  {c.image_url ? (
    <img
      src={c.image_url}
      alt={c.name}
      className="w-full h-full object-cover"
    />
  ) : (
    <span className="font-display font-bold text-4xl" style={{ color: "rgba(220,235,255,0.35)" }}>
      {c.name.split("#")[1] ? `#${c.name.split("#")[1]}` : c.name[0]}
    </span>
  )}
</div>
              <h3 className="font-display font-bold text-lg mb-1.5" style={{ color: "#EAF4FF" }}>{c.name}</h3>
              <p className="text-sm mb-4 leading-relaxed flex-1" style={{ color: "#8C9BC0" }}>{c.bio}</p>
              <div className="flex items-center justify-between text-xs font-display mb-1.5" style={{ color: "#6E7EA0" }}>
                <span>JAMI OVOZLAR: <b style={{ color: "#C9DBFF" }}>{fmt(c.votes)}</b></span>
                <span>{p.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: "rgba(120,160,255,0.1)" }}>
                <div className="bar-fill h-full rounded-full" style={{ width: `${p}%`, background: "linear-gradient(90deg,#00E0FF,#8B5CFF)" }} />
              </div>
              <button
                disabled={!!votedFor || ended}
                onClick={() => setConfirming(c)}
                className="neon-btn font-display py-3 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                OVOZ BERISH
              </button>
            </div>
          );
        })}
      </div>

      {confirming && (
        <ConfirmModal candidate={confirming} onCancel={() => setConfirming(null)} onConfirm={confirm} />
      )}
      {justVoted && <SuccessToast />}
    </main>
  );
}

function ConfirmModal({ candidate, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(2,4,10,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="glass rounded-2xl max-w-sm w-full p-6 glow-in" style={{ borderColor: "rgba(0,224,255,0.3)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg" style={{ color: "#EAF4FF" }}>Ovoz berishni tasdiqlash</h3>
          <button onClick={onCancel} style={{ color: "#6E7EA0" }}><X size={20} /></button>
        </div>
        <p className="text-sm mb-6" style={{ color: "#96A6C8" }}>
          <b style={{ color: "#C9DBFF" }}>{candidate.name}</b> nomzodiga ovoz berishni tasdiqlaysizmi? Bu amalni keyin bekor qilib bo‘lmaydi.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="ghost-btn font-display flex-1 py-3 rounded-lg">BEKOR QILISH</button>
          <button onClick={onConfirm} className="neon-btn font-display flex-1 py-3 rounded-lg">TASDIQLASH</button>
        </div>
      </div>
    </div>
  );
}

function SuccessToast() {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 glow-in">
      <div className="glass rounded-full px-6 py-3.5 flex items-center gap-2.5 font-display font-bold"
        style={{ borderColor: "rgba(51,255,176,0.4)", color: "#7BFFCF" }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(51,255,176,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={14} />
        </span>
        OVOZINGIZ MUVAFFAQIYATLI QABUL QILINDI
      </div>
    </div>
  );
}

/* ---------------- Results page ---------------- */
function ResultsPage({ candidates, totalVotes, participants, lastUpdate }) {
  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
  const chartData = sorted.map((c, i) => ({ name: `#${i + 1}`, ovoz: c.votes, full: c.name }));
  const secondsAgo = Math.max(0, Math.round((Date.now() - lastUpdate) / 1000));

  return (
    <main className="relative z-10 max-w-6xl mx-auto px-5 pt-10 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="font-display font-bold text-3xl" style={{ color: "#F2F8FF" }}>Joriy natijalar</h1>
        <span className="text-xs font-display" style={{ color: "#5E6E90" }}>
          Oxirgi yangilanish: {secondsAgo < 5 ? "hozirgina" : `${secondsAgo} soniya oldin`}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 my-8 max-w-lg">
        <Stat label="JAMI OVOZLAR" value={<CountUp value={totalVotes} />} />
        <Stat label="NOMZODLAR" value={candidates.length} />
        <Stat label="ISHTIROKCHILAR" value={<CountUp value={participants} />} />
      </div>

      <div className="glass rounded-2xl p-5 mb-8">
        <h2 className="font-display font-bold text-sm tracking-[0.1em] mb-4" style={{ color: "#5FE8FF" }}>NOMZODLAR OVOZLARI</h2>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,160,255,0.1)" vertical={false} />
              <XAxis dataKey="name" stroke="#5E6E90" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#5E6E90" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(0,224,255,0.06)" }}
                contentStyle={{ background: "#0B0F1A", border: "1px solid rgba(0,224,255,0.3)", borderRadius: 10, fontSize: 13 }}
                labelStyle={{ color: "#5FE8FF" }}
                formatter={(v, n, p) => [fmt(v), p.payload.full]}
              />
              <Bar dataKey="ovoz" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#00E0FF" : "rgba(139,92,255,0.55)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((c, i) => {
          const p = pct(c.votes, totalVotes);
          return (
            <div key={c.id} className="glass rounded-xl px-5 py-4 flex items-center gap-4">
              <span className="font-display font-bold text-lg w-9 shrink-0" style={{ color: i === 0 ? "#00E0FF" : "#6E7EA0" }}>
                #{String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-display font-bold truncate" style={{ color: "#EAF4FF" }}>{c.name}</span>
                  <span className="text-sm font-display shrink-0 ml-3" style={{ color: "#8C9BC0" }}>{fmt(c.votes)} ovoz · {p.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(120,160,255,0.1)" }}>
                  <div className="bar-fill h-full rounded-full" style={{ width: `${p}%`, background: i === 0 ? "linear-gradient(90deg,#00E0FF,#8B5CFF)" : "rgba(139,92,255,0.5)" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

/* ============================================================
   ADMIN PANEL
   ============================================================ */


function AdminLogin({onSuccess,exitAdmin}){const[email,setEmail]=useState("");const[pwd,setPwd]=useState("");const[err,setErr]=useState("");const[busy,setBusy]=useState(false);async function login(){if(!email.trim()||!pwd)return setErr("Email va parolni kiriting.");setBusy(true);setErr("");const{error}=await supabase.auth.signInWithPassword({email:email.trim(),password:pwd});setBusy(false);if(error)return setErr("Login yoki parol noto‘g‘ri.");const{data:{user}}=await supabase.auth.getUser();if(user?.app_metadata?.role!=="admin"){await supabase.auth.signOut();return setErr("Bu hisob administrator huquqiga ega emas.");}onSuccess();}return <div className="relative z-10 min-h-[100dvh] flex items-center justify-center px-4"><div className="glass rounded-2xl p-8 max-w-sm w-full glow-in"><div className="flex items-center gap-2 mb-1"><Lock size={18} style={{color:"#00E0FF"}}/><h2 className="font-display font-bold text-xl" style={{color:"#EAF4FF"}}>Administrator kirishi</h2></div><p className="text-sm mb-6" style={{color:"#7C8AA8"}}>CYBERSTAT boshqaruv tizimi.</p><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Admin email" className="w-full rounded-lg px-4 py-3 mb-3 text-sm" style={{background:"rgba(120,160,255,0.06)",border:"1px solid rgba(120,160,255,0.2)",color:"#EAF4FF"}}/><input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="Admin paroli" onKeyDown={e=>e.key==='Enter'&&login()} className="w-full rounded-lg px-4 py-3 mb-3 text-sm" style={{background:"rgba(120,160,255,0.06)",border:"1px solid rgba(120,160,255,0.2)",color:"#EAF4FF"}}/>{err&&<p className="text-xs mb-3" style={{color:"#FF8FA6"}}>{err}</p>}<button onClick={login} disabled={busy} className="neon-btn font-display w-full py-3 rounded-lg mb-3 disabled:opacity-50">{busy?"TEKSHIRILMOQDA…":"KIRISH"}</button><button onClick={exitAdmin} className="ghost-btn font-display w-full py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"><ArrowLeft size={14}/> Saytga qaytish</button><p className="text-[11px] mt-4 text-center" style={{color:"#4A5878"}}>Admin paroli kodda saqlanmaydi.</p></div></div>}

function AdminPanel(props) {
  const { authed, setAuthed, exitAdmin, setAudit } = props;
  const leaveAdmin=async()=>{await supabase.auth.signOut();setAuthed(false);exitAdmin();};
  const [tab, setTab] = useState("dashboard");
  useEffect(()=>{if(authed){loadAudit().then(setAudit).catch(console.error);}},[authed,setAudit]);

  if (!authed) return <AdminLogin onSuccess={()=>setAuthed(true)} exitAdmin={exitAdmin} />;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "candidates", label: "Nomzodlar", icon: Users },
    { id: "votes", label: "Ovoz boshqaruvi", icon: Vote },
    { id: "vote-log", label: "Ovozlar jurnali", icon: History },
    { id: "history", label: "O‘zgarishlar tarixi", icon: History },
    { id: "settings", label: "Sozlamalar", icon: Settings },
  ];

  return (
    <div className="relative z-10 min-h-[100dvh] flex flex-col md:flex-row">
      <aside className="md:w-64 shrink-0 glass md:min-h-[100dvh] p-4 flex md:flex-col gap-1 overflow-x-auto"
        style={{ borderRight: "1px solid rgba(120,160,255,0.12)" }}>
        <div className="hidden md:flex items-center gap-2 px-2 py-3 mb-2">
          <ShieldCheck size={18} style={{ color: "#00E0FF" }} />
          <span className="font-display font-bold" style={{ color: "#EAF4FF" }}>BOSHQARUV PANELI</span>
        </div>
        {navItems.map((it) => {
          const Icon = it.icon;
          return (
            <button key={it.id} onClick={() => setTab(it.id)}
              className="font-display text-sm px-3 py-2.5 rounded-lg flex items-center gap-2.5 whitespace-nowrap"
              style={{ color: tab === it.id ? "#00E0FF" : "#9FB1D6", background: tab === it.id ? "rgba(0,224,255,0.08)" : "transparent" }}>
              <Icon size={16} /> {it.label}
            </button>
          );
        })}
        <div className="md:mt-auto flex gap-1">
          <button onClick={leaveAdmin} className="ghost-btn font-display text-sm px-3 py-2.5 rounded-lg flex items-center gap-2 whitespace-nowrap">
            <ArrowLeft size={14} /> Saytga qaytish
          </button>
        </div>
      </aside>

      <div className="flex-1 p-5 md:p-8 max-w-5xl">
        {tab === "dashboard" && <AdminDashboard {...props} />}
        {tab === "candidates" && <AdminCandidates {...props} />}
        {tab === "votes" && <AdminVotes {...props} />}
        {tab === "vote-log" && <AdminVoteLog />}
        {tab === "history" && <AdminHistory {...props} />}
        {tab === "settings" && <AdminSettings {...props} />}
      </div>
    </div>
  );
}

function AdminDashboard({ candidates, totalVotes, participants, audit }) {
  const normal = candidates.reduce((s, c) => s + (c.votes - (c.adminVotes || 0)), 0);
  const bonus = candidates.reduce((s, c) => s + (c.adminVotes || 0), 0);
  const today = audit.filter((a) => a.time.startsWith(nowStr().slice(0, 10)));
  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-6" style={{ color: "#EAF4FF" }}>Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="JAMI OVOZLAR" value={fmt(totalVotes)} />
        <Stat label="ODDIY OVOZLAR" value={fmt(normal)} />
        <Stat label="ADMIN OVOZLARI" value={fmt(bonus)} />
        <Stat label="JAMI FOYDALANUVCHILAR" value={fmt(participants)} />
        <Stat label="BUGUNGI O‘ZGARISHLAR" value={today.length} />
        <Stat label="FAOL NOMZODLAR" value={candidates.filter((c) => c.active).length} />
      </div>
      <div className="glass rounded-2xl p-5">
        <h2 className="font-display font-bold text-sm tracking-[0.1em] mb-4" style={{ color: "#5FE8FF" }}>NOMZODLAR BO‘YICHA OVOZLAR</h2>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={candidates.map((c, i) => ({ name: `#${i + 1}`, ovoz: c.votes }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,160,255,0.1)" vertical={false} />
              <XAxis dataKey="name" stroke="#5E6E90" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#5E6E90" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0B0F1A", border: "1px solid rgba(0,224,255,0.3)", borderRadius: 10 }} />
              <Bar dataKey="ovoz" fill="#00E0FF" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function AdminCandidates({ candidates, refreshCandidates }) {
  const [editing, setEditing] = useState(null);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");

  async function remove(c) {
    if(!window.confirm(`“${c.name}” nomzodini o‘chirish/arxivlashni tasdiqlaysizmi?`)) return;
    try{setBusy(true);await adminRemoveCandidate(c.id);setCandidatesAfterAdmin(setMsg);}
    catch(e){setMsg("Amal bajarilmadi: "+(e?.message||"xatolik"));}
    finally{setBusy(false);setTimeout(()=>setMsg(""),3500);}
  }
  async function toggle(c) {
    try{setBusy(true);await adminSaveCandidate({...c,active:!c.active});await setCandidatesAfterAdmin(setMsg);}
    catch(e){setMsg("Amal bajarilmadi: "+(e?.message||"xatolik"));}
    finally{setBusy(false);setTimeout(()=>setMsg(""),3500);}
  }
  async function setCandidatesAfterAdmin(setMessage){
    // Parent callback refreshes the shared state. Calling it with the current list
    // also makes the update visible immediately; realtime then keeps every client synced.
    await refreshCandidates();
    setMessage("O‘zgarish serverga saqlandi va barcha foydalanuvchilarga tarqatildi.");
  }
  async function submitForm(data) {
    try{
      setBusy(true);
      await adminSaveCandidate({...data,active:data.active!==false});
      await refreshCandidates();
      setEditing(null);
      setMsg("Nomzod saqlandi.");
    }catch(e){setMsg("Saqlash amalga oshmadi: "+(e?.message||"xatolik"));}
    finally{setBusy(false);setTimeout(()=>setMsg(""),3500);}
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="font-display font-bold text-2xl" style={{ color: "#EAF4FF" }}>Nomzodlar</h1>
        <button disabled={busy} onClick={() => setEditing("new")} className="neon-btn font-display px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm disabled:opacity-40">
          <Plus size={16} /> Nomzod qo‘shish
        </button>
      </div>
      <p className="text-sm mb-6" style={{color:"#6E7EA0"}}>Bu yerdagi o‘zgarishlar markaziy database'ga yoziladi va public saytga real vaqt rejimida tarqatiladi.</p>
      {msg&&<div className="glass rounded-xl px-4 py-3 mb-4 text-sm" style={{color:msg.includes("amalga oshmadi")||msg.includes("bajarilmadi")?"#FF8FA6":"#33FFB0"}}>{msg}</div>}
      <div className="glass rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead><tr style={{ color: "#5E6E90" }} className="font-display text-left text-xs tracking-[0.08em]">
            <th className="px-4 py-3">NOMZOD</th><th className="px-4 py-3">JAMI OVOZ</th><th className="px-4 py-3">ADMIN OVOZ</th><th className="px-4 py-3">HOLAT</th><th className="px-4 py-3">AMALLAR</th>
          </tr></thead>
          <tbody>{candidates.map(c=><tr key={c.id} style={{borderTop:"1px solid rgba(120,160,255,0.1)"}}>
            <td className="px-4 py-3"><div className="font-display font-bold" style={{color:"#EAF4FF"}}>{c.name}</div><div className="text-xs truncate max-w-sm" style={{color:"#6E7EA0"}}>{c.bio}</div></td>
            <td className="px-4 py-3" style={{color:"#C9DBFF"}}>{fmt(c.votes)}</td><td className="px-4 py-3" style={{color:"#C9DBFF"}}>{fmt(c.adminVotes||0)}</td>
            <td className="px-4 py-3"><span className="text-xs font-display" style={{color:c.active?"#33FFB0":"#6E7EA0"}}>{c.active?"FAOL":"NOFAOL"}</span></td>
            <td className="px-4 py-3"><div className="flex items-center gap-2">
              <button disabled={busy} onClick={()=>setEditing(c)} className="p-1.5 rounded-md ghost-btn disabled:opacity-40"><Pencil size={14}/></button>
              <button disabled={busy} onClick={()=>toggle(c)} className="p-1.5 rounded-md ghost-btn disabled:opacity-40">{c.active?<Lock size={14}/>:<Unlock size={14}/>}</button>
              <button disabled={busy} onClick={()=>remove(c)} className="p-1.5 rounded-md ghost-btn disabled:opacity-40" style={{color:"#FF8FA6"}}><Trash2 size={14}/></button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>
      {editing&&<CandidateForm candidate={editing==="new"?null:editing} onCancel={()=>setEditing(null)} onSubmit={submitForm}/>} 
    </div>
  );
}

function CandidateForm({ candidate, onCancel, onSubmit }) {
  const [name, setName] = useState(candidate?.name || "");
  const [bio, setBio] = useState(candidate?.bio || "");
  const [imageUrl, setImageUrl] = useState(candidate?.image_url || "");
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!name.trim()) return;

    setUploading(true);
    setError("");

    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("candidate-images")
          .upload(fileName, imageFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: imageFile.type,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("candidate-images")
          .getPublicUrl(fileName);

        finalImageUrl = data.publicUrl;
      }

      await onSubmit({
        id: candidate?.id,
        name: name.trim(),
        bio: bio.trim(),
        image_url: finalImageUrl || null,
      });
    } catch (e) {
      console.error(e);
      setError(e?.message || "Rasm yuklashda xatolik yuz berdi.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        background: "rgba(2,4,10,0.7)",
        backdropFilter: "blur(4px)"
      }}>
      <div className="glass rounded-2xl max-w-md w-full p-6 glow-in">
        <h3
          className="font-display font-bold text-lg mb-4"
          style={{ color: "#EAF4FF" }}
        >
          {candidate ? "Nomzodni tahrirlash" : "Yangi nomzod"}
        </h3>

        <div className="flex justify-center mb-5">
          <div
            className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              background: "rgba(120,160,255,0.08)",
              border: "1px solid rgba(120,160,255,0.25)"
            }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Nomzod rasmi"
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className="text-3xl font-bold"
                style={{ color: "#7C8AA8" }}
              >
                ?
              </span>
            )}
          </div>
        </div>

        <label
          className="text-xs font-display block mb-1.5"
          style={{ color: "#7C8AA8" }}
        >
          NOMZOD RASMI
        </label>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
              setError("Rasm hajmi 5 MB dan oshmasligi kerak.");
              return;
            }

            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
            setError("");
          }}
          className="w-full mb-4 text-sm"
          style={{ color: "#C9DBFF" }}
        />

        <label
          className="text-xs font-display block mb-1.5"
          style={{ color: "#7C8AA8" }}
        >
          ISM
        </label>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 mb-4 text-sm"
          style={{
            background: "rgba(120,160,255,0.06)",
            border: "1px solid rgba(120,160,255,0.2)",
            color: "#EAF4FF"
          }}
        />

        <label
          className="text-xs font-display block mb-1.5"
          style={{ color: "#7C8AA8" }}
        >
          QISQA MA'LUMOT
        </label>

        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="w-full rounded-lg px-3 py-2.5 mb-4 text-sm resize-none"
          style={{
            background: "rgba(120,160,255,0.06)",
            border: "1px solid rgba(120,160,255,0.2)",
            color: "#EAF4FF"
          }}
        />

        {error && (
          <div
            className="rounded-lg p-3 mb-4 text-sm"
            style={{
              background: "rgba(255,80,80,0.08)",
              border: "1px solid rgba(255,80,80,0.25)",
              color: "#ff8b8b"
            }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={uploading}
            className="ghost-btn font-display flex-1 py-2.5 rounded-lg text-sm"
          >
            BEKOR QILISH
          </button>

          <button
            onClick={handleSubmit}
            disabled={uploading || !name.trim()}
            className="neon-btn font-display flex-1 py-2.5 rounded-lg text-sm"
          >
            {uploading ? "YUKLANMOQDA..." : "SAQLASH"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminVotes({ candidates, refreshCandidates }) {
  const [candId, setCandId] = useState(candidates[0]?.id || "");
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState("add");
  const [msg, setMsg] = useState("");

  async function submit() {
    const cand = candidates.find((c) => c.id === candId);
    if (!cand || amount <= 0 || !reason.trim()) return;
    const delta = mode === "add" ? amount : -amount;
    const { error } = await supabase.rpc("admin_adjust_votes", { p_candidate_id:candId, p_delta:delta, p_reason:reason.trim() });
    if (error) { setMsg("Amalni bajarib bo‘lmadi."); return; }
    await refreshCandidates();
    setMsg(`${cand.name} uchun ${mode === "add" ? "+" : "-"}${amount} ovoz qo‘llandi.`);
    setReason("");
    setTimeout(() => setMsg(""), 3000);
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display font-bold text-2xl mb-6" style={{ color: "#EAF4FF" }}>Ovoz qo‘shish / ayirish</h1>
      <div className="glass rounded-2xl p-6">
        <div className="flex gap-2 mb-5">
          <button onClick={() => setMode("add")} className="flex-1 font-display py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5"
            style={{ background: mode === "add" ? "rgba(51,255,176,0.12)" : "rgba(120,160,255,0.05)", color: mode === "add" ? "#33FFB0" : "#9FB1D6", border: `1px solid ${mode === "add" ? "rgba(51,255,176,0.4)" : "rgba(120,160,255,0.15)"}` }}>
            <Plus size={14} /> OVOZ QO‘SHISH
          </button>
          <button onClick={() => setMode("sub")} className="flex-1 font-display py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5"
            style={{ background: mode === "sub" ? "rgba(255,92,122,0.12)" : "rgba(120,160,255,0.05)", color: mode === "sub" ? "#FF8FA6" : "#9FB1D6", border: `1px solid ${mode === "sub" ? "rgba(255,92,122,0.4)" : "rgba(120,160,255,0.15)"}` }}>
            <Minus size={14} /> OVOZNI AYIRISH
          </button>
        </div>

        <label className="text-xs font-display block mb-1.5" style={{ color: "#7C8AA8" }}>NOMZOD</label>
        <select value={candId} onChange={(e) => setCandId(e.target.value)} className="w-full rounded-lg px-3 py-2.5 mb-4 text-sm"
          style={{ background: "rgba(120,160,255,0.06)", border: "1px solid rgba(120,160,255,0.2)", color: "#EAF4FF" }}>
          {candidates.map((c) => <option key={c.id} value={c.id} style={{ background: "#0B0F1A" }}>{c.name}</option>)}
        </select>

        <label className="text-xs font-display block mb-1.5" style={{ color: "#7C8AA8" }}>MIQDOR</label>
        <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full rounded-lg px-3 py-2.5 mb-4 text-sm"
          style={{ background: "rgba(120,160,255,0.06)", border: "1px solid rgba(120,160,255,0.2)", color: "#EAF4FF" }} />

        <label className="text-xs font-display block mb-1.5" style={{ color: "#7C8AA8" }}>SABAB</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Masalan: Texnik tuzatish" className="w-full rounded-lg px-3 py-2.5 mb-5 text-sm"
          style={{ background: "rgba(120,160,255,0.06)", border: "1px solid rgba(120,160,255,0.2)", color: "#EAF4FF" }} />

        <button onClick={submit} className="neon-btn font-display w-full py-3 rounded-lg">
          {mode === "add" ? "OVOZ QO‘SHISH" : "OVOZNI AYIRISH"}
        </button>
        {msg && <p className="text-xs mt-3 text-center" style={{ color: "#33FFB0" }}>{msg}</p>}
      </div>
    </div>
  );
}

function AdminVoteLog(){
  const [rows,setRows]=useState([]);
  const [busy,setBusy]=useState(true);
  const [query,setQuery]=useState("");
  useEffect(()=>{loadVoteLog().then(setRows).catch(console.error).finally(()=>setBusy(false));},[]);
  const filtered=rows.filter(r=>`${r.id} ${r.voter_id} ${r.candidate_id} ${r.candidates?.name||""}`.toLowerCase().includes(query.toLowerCase()));
  function exportCsv(){
    const header=["ID","Nomzod","Voter ID","Sana"];
    const body=filtered.map(r=>[r.id,r.candidates?.name||r.candidate_id,r.voter_id,new Date(r.created_at).toISOString()]);
    const csv=[header,...body].map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="cyberstat-ovozlar.csv";a.click();URL.revokeObjectURL(url);
  }
  return <div>
    <div className="flex flex-wrap items-center justify-between gap-3 mb-2"><h1 className="font-display font-bold text-2xl" style={{color:"#EAF4FF"}}>Ovozlar jurnali</h1><button onClick={exportCsv} className="ghost-btn font-display px-3 py-2 rounded-lg text-sm flex items-center gap-2"><Download size={14}/> CSV EXPORT</button></div>
    <p className="text-sm mb-5" style={{color:"#6E7EA0"}}>Oxirgi 500 ta real ovoz. Voter ID anonim hisob identifikatori bo‘lib, shaxsiy ism/email saqlanmaydi.</p>
    <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ID, voter ID yoki nomzod bo‘yicha qidirish" className="w-full rounded-lg px-3 py-2.5 mb-4 text-sm" style={{background:"rgba(120,160,255,0.06)",border:"1px solid rgba(120,160,255,0.2)",color:"#EAF4FF"}}/>
    <div className="glass rounded-2xl overflow-x-auto"><table className="w-full text-sm min-w-[720px]"><thead><tr className="font-display text-xs text-left" style={{color:"#5E6E90"}}><th className="px-4 py-3">VAQT</th><th className="px-4 py-3">NOMZOD</th><th className="px-4 py-3">VOTER ID</th><th className="px-4 py-3">OVOZ ID</th></tr></thead><tbody>{busy?<tr><td colSpan="4" className="px-4 py-6" style={{color:"#6E7EA0"}}>Yuklanmoqda…</td></tr>:filtered.map(r=><tr key={r.id} style={{borderTop:"1px solid rgba(120,160,255,0.1)"}}><td className="px-4 py-3" style={{color:"#9FB1D6"}}>{new Date(r.created_at).toLocaleString("uz-UZ")}</td><td className="px-4 py-3 font-display font-bold" style={{color:"#EAF4FF"}}>{r.candidates?.name||r.candidate_id}</td><td className="px-4 py-3 text-xs" style={{color:"#8C9BC0"}}>{r.voter_id}</td><td className="px-4 py-3 text-xs" style={{color:"#5FE8FF"}}>{r.id}</td></tr>)}</tbody></table></div>
  </div>;
}

function AdminHistory({ audit }) {
  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-6" style={{ color: "#EAF4FF" }}>O‘zgarishlar tarixi</h1>
      {audit.length === 0 && <p style={{ color: "#6E7EA0" }}>Hozircha yozuvlar yo‘q.</p>}
      <div className="space-y-3">
        {audit.map((a) => (
          <div key={a.id} className="glass rounded-xl px-5 py-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-display font-bold text-sm" style={{ color: "#5FE8FF" }}>{a.action}</span>
              <span className="text-xs" style={{ color: "#6E7EA0" }}>{a.time}</span>
            </div>
            <div className="text-sm" style={{ color: "#C9DBFF" }}>{a.actor} · {a.target}</div>
            {a.detail && <div className="text-xs mt-1" style={{ color: "#8C9BC0" }}>{a.detail}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminSettings({ settings, saveSettings }) {
  const [local, setLocal] = useState(settings);
  const [msg,setMsg]=useState("");
  const [resetReason,setResetReason]=useState("");
  const [resetBusy,setResetBusy]=useState(false);
  useEffect(()=>setLocal(settings),[settings]);
  const dirty = JSON.stringify(local) !== JSON.stringify(settings);

  async function save() {
    try{await saveSettings(local);setMsg("Sozlamalar saqlandi. Barcha foydalanuvchilarga darhol qo‘llanadi.");}
    catch(e){setMsg("Saqlash amalga oshmadi: "+(e?.message||"xatolik"));}
    setTimeout(()=>setMsg(""),3500);
  }
  async function resetSurvey(){
    if(resetReason.trim().length<5)return setMsg("Reset uchun sabab kamida 5 ta belgi bo‘lsin.");
    if(!window.confirm("DIQQAT: Barcha real ovozlar o‘chiriladi va hisoblagichlar 0 ga qaytadi. Davom etasizmi?"))return;
    try{setResetBusy(true);await adminResetSurvey(resetReason.trim());setMsg("So‘rovnoma qayta tiklandi. Barcha foydalanuvchilarda natijalar yangilandi.");setResetReason("");setCandidatesAfterReset();}
    catch(e){setMsg("Reset amalga oshmadi: "+(e?.message||"xatolik"));}
    finally{setResetBusy(false);setTimeout(()=>setMsg(""),5000);}
  }
  async function setCandidatesAfterReset(){window.location.reload();}
  const statuses=[{id:"FAOL",label:"FAOL"},{id:"TOXTATILGAN",label:"TO‘XTATILGAN"},{id:"YAKUNLANGAN",label:"YAKUNLANGAN"}];
  return <div className="max-w-2xl">
    <h1 className="font-display font-bold text-2xl mb-2" style={{color:"#EAF4FF"}}>Tizim sozlamalari</h1>
    <p className="text-sm mb-6" style={{color:"#6E7EA0"}}>Bu bo‘limdagi sozlamalar markaziy database'da saqlanadi. O‘zgarishlar barcha foydalanuvchilarga bir xil qo‘llanadi.</p>
    {msg&&<div className="glass rounded-xl px-4 py-3 mb-4 text-sm" style={{color:msg.includes("amalga oshmadi")?"#FF8FA6":"#33FFB0"}}>{msg}</div>}
    <div className="glass rounded-2xl p-6 space-y-5 mb-6">
      <div><label className="text-xs font-display block mb-1.5" style={{color:"#7C8AA8"}}>LOYIHA NOMI</label><input value={local.projectName||""} onChange={e=>setLocal({...local,projectName:e.target.value})} className="w-full rounded-lg px-3 py-2.5 text-sm" style={{background:"rgba(120,160,255,0.06)",border:"1px solid rgba(120,160,255,0.2)",color:"#EAF4FF"}}/></div>
      <div><label className="text-xs font-display block mb-1.5" style={{color:"#7C8AA8"}}>TAVSIF / SHIOR</label><input value={local.tagline||""} onChange={e=>setLocal({...local,tagline:e.target.value})} className="w-full rounded-lg px-3 py-2.5 text-sm" style={{background:"rgba(120,160,255,0.06)",border:"1px solid rgba(120,160,255,0.2)",color:"#EAF4FF"}}/></div>
      <div><label className="text-xs font-display block mb-1.5" style={{color:"#7C8AA8"}}>TASHKILOT NOMI</label><input value={local.organizerName||"KIBERXAVFSIZLIK MARKAZI"} onChange={e=>setLocal({...local,organizerName:e.target.value})} className="w-full rounded-lg px-3 py-2.5 text-sm" style={{background:"rgba(120,160,255,0.06)",border:"1px solid rgba(120,160,255,0.2)",color:"#EAF4FF"}}/></div>
      <div><label className="text-xs font-display block mb-1.5" style={{color:"#7C8AA8"}}>RASMIY SO‘ROVNOMA MATNI</label><textarea rows={3} value={local.organizerText||""} onChange={e=>setLocal({...local,organizerText:e.target.value})} className="w-full rounded-lg px-3 py-2.5 text-sm resize-none" style={{background:"rgba(120,160,255,0.06)",border:"1px solid rgba(120,160,255,0.2)",color:"#EAF4FF"}}/></div>
      <div><label className="text-xs font-display block mb-2" style={{color:"#7C8AA8"}}>OVOZ BERISH HOLATI</label><div className="flex gap-2 flex-wrap">{statuses.map(s=><button key={s.id} onClick={()=>setLocal({...local,status:s.id})} className="flex-1 min-w-[130px] font-display text-xs py-2.5 rounded-lg" style={{background:local.status===s.id?"rgba(0,224,255,0.12)":"rgba(120,160,255,0.05)",color:local.status===s.id?"#00E0FF":"#9FB1D6",border:`1px solid ${local.status===s.id?"rgba(0,224,255,0.4)":"rgba(120,160,255,0.15)"}`}}>{s.label}</button>)}</div></div>
      <label className="flex items-center justify-between gap-4 glass rounded-lg p-3"><span><span className="block text-sm" style={{color:"#EAF4FF"}}>Public natijalarni ko‘rsatish</span><span className="block text-xs mt-1" style={{color:"#6E7EA0"}}>O‘chirilsa, NATIJALAR bo‘limi foydalanuvchilarga yopiladi.</span></span><input type="checkbox" checked={local.showResults!==false} onChange={e=>setLocal({...local,showResults:e.target.checked})}/></label>
      <div className="text-xs" style={{color:"#6E7EA0"}}>Bir foydalanuvchiga ruxsat: <b style={{color:"#C9DBFF"}}>1 ovoz</b>. Bu limit server tomonda ham majburiy.</div>
      <button onClick={save} disabled={!dirty} className="neon-btn font-display w-full py-3 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed">SAQLASH</button>
    </div>
    <div className="rounded-2xl p-6" style={{background:"rgba(255,92,122,0.04)",border:"1px solid rgba(255,92,122,0.22)"}}>
      <div className="flex items-center gap-2 mb-2"><RotateCcw size={17} style={{color:"#FF8FA6"}}/><h2 className="font-display font-bold" style={{color:"#FFB0BE"}}>Xavfli boshqaruv</h2></div>
      <p className="text-sm mb-4" style={{color:"#8C9BC0"}}>So‘rovnomani qayta tiklash barcha real ovozlarni va ishtirokchilar hisobini 0 ga qaytaradi. Har bir amal audit jurnaliga yoziladi.</p>
      <input value={resetReason} onChange={e=>setResetReason(e.target.value)} placeholder="Reset sababi" className="w-full rounded-lg px-3 py-2.5 mb-3 text-sm" style={{background:"rgba(120,160,255,0.04)",border:"1px solid rgba(255,92,122,0.2)",color:"#EAF4FF"}}/>
      <button disabled={resetBusy} onClick={resetSurvey} className="w-full py-3 rounded-lg font-display" style={{background:"rgba(255,92,122,0.1)",border:"1px solid rgba(255,92,122,0.35)",color:"#FF8FA6"}}>{resetBusy?"BAJARILMOQDA…":"BARCHA OVOZLARNI RESET QILISH"}</button>
    </div>
  </div>;
}

