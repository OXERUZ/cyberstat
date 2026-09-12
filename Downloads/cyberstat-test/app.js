const KEY="cyberstat_state_v4";
const TASK_COUNT=10;
const FINALIST_COLORS=["gold","blue","purple","green","red","cyan"];

const defaults={
 schema:"v4",
 settings:{
  siteName:"CYBERSTAT",
  subtitle:"DIGITAL COMPETITION ARENA",
  live:true,
  final2Open:true,
  publicTasks:false,
  heroTitle:"02",
  heroSub:"LAST DEFENSE",
  heroLine:"KIBERXAVFSIZLIK × INNOVATSIYA × KELAJAK"
 },
 finalists:[
  {id:"auto_c1",candidateId:"c1",name:"XOSHIMOV XOSHIMXON",project:"VANGUARD-X",bio:"Kiberxavfsizlik yo‘nalishidagi amaliy loyiha. Final 1 g‘olibi va Final 2 VIP nominanti.",image:"assets/c1-xoshimxon.jpg",vip:true,color:"gold",tasks:[true,true,true,true,true,true,false,false,false,false]},
  {id:"auto_c2",candidateId:"c2",name:"JULIYEV MUHAMMAD",project:"NEURAL SHIELD",bio:"Cybersecurity loyihasi.",image:"assets/c2-muhammad.jpg",vip:false,color:"blue",tasks:[true,true,true,true,false,false,false,false,false,false]},
  {id:"auto_c3",candidateId:"c3",name:"NAZAROVA NILUFAR",project:"PHOENIX",bio:"Cybersecurity loyihasi.",image:"assets/c3-nilufar.jpg",vip:false,color:"purple",tasks:[true,true,false,false,false,false,false,false,false,false]}
 ],
 final1:[
  {id:"c1",name:"XOSHIMOV XOSHIMXON",project:"VIP NOMZOD",vip:true,rating:5.0,bio:"Mobil qurilmalar va foydalanuvchilarning shaxsiy ma’lumotlarini kiber-xavflardan real vaqt rejimida himoya qilish uchun mo‘ljallangan, sun’iy intellekt (AI) texnologiyalariga asoslangan zamonaviy Android xavfsizlik tizimi.",image:"assets/c1-xoshimxon.jpg",votes:8889},
  {id:"c2",name:"JULIYEV MUHAMMAD",project:"VANGUARD-X",vip:false,rating:5.0,bio:"Yangi va noma’lum kiber-tahdidlarni barvaqt aniqlovchi va yangi paydo bo‘layotgan kiber-tahdidlar haqida oldindan ogohlantiruvchi dastur. Interaktiv simulyatorlar orqali odamlarga so‘nggi firibgarlik usullaridan himoyalanishni o‘rgatadi.",image:"assets/c2-muhammad.jpg",votes:8885},
  {id:"c3",name:"NAZAROVA NILUFAR",project:"AEGIS PRO",vip:false,rating:5.0,bio:"Mobil qurilmalar va ilovalar uchun kompleks qalqon. Mobil qurilmalarni kiber-xujumlar, zararli APK fayllar, SMS-firibgarliklar va soxta ilovalardan doimiy himoya qiladi. Oddiy tugmani bir bosish orqali to‘liq xavfsizlikni ta’minlaydi.",image:"assets/c3-nilufar.jpg",votes:8883}
 ],
 updatedAt:null
};

/* ============== MA'LUMOTLAR QATLAMI (Supabase + localStorage cache) ==============
   - `cache` — joriy holat doim xotirada, load() shundan sinxron qaytaradi.
   - Sahifa ochilganda initRemote() Supabase'dan o'qib cache'ni yangilaydi
     va real-time kanalga ulanadi (boshqa qurilmadagi o'zgarish darhol keladi).
   - save() cache'ni va localStorage'ni darhol yangilaydi (tez UI), so'ng
     fonda Supabase'ga yozadi (persistRemote). Yozish faqat login qilgan
     admin uchun RLS orqali ruxsat etilgan (supabase-schema.sql'ga qarang). */
let cache=null;
let supabaseClient=null;
let realtimeChannel=null;
let remoteReady=false;

/* ============== FINAL 1 → FINAL 2 AVTOMATIK BOG'LANISH ==============
   Final 1'dagi eng ko'p ovoz olgan TOP-3 nomzod avtomatik ravishda Final 2
   (finalists) ro'yxatiga aylanadi: ISM va RASM Final 1'dan har doim o'zi
   ko'chib keladi (admin qo'lda tahrirlamaydi). LOYIHA nomi, TAVSIF, VIP va
   10 ta topshiriq esa Final 2'ga xos bo'lib, admin tomonidan alohida
   boshqariladi va nomzod top-3'da qolar ekan saqlanib turadi. */
function rankFinal1(s){
 return s.final1.slice().sort((a,b)=>(Number(b.votes)||0)-(Number(a.votes)||0));
}
function top3Candidates(s){ return rankFinal1(s).slice(0,3); }

function syncFinalistsFromFinal1(s){
 const top3=top3Candidates(s);
 const byCandidate={};
 s.finalists.forEach(f=>{ if(f.candidateId) byCandidate[f.candidateId]=f; });
 s.finalists=top3.map((c,i)=>{
  const prev=byCandidate[c.id];
  if(prev){
   prev.candidateId=c.id;
   prev.name=c.name;
   prev.image=c.image;
   if(!prev.color) prev.color=FINALIST_COLORS[i]||"blue";
   if(!Array.isArray(prev.tasks)||prev.tasks.length!==TASK_COUNT) prev.tasks=Array.from({length:TASK_COUNT},()=>false);
   return prev;
  }
  return {
   id:"auto_"+c.id,
   candidateId:c.id,
   name:c.name,
   project:c.project||"LOYIHA NOMI",
   bio:"Final 1 g‘olibi. Final 2 ishtirokchisi.",
   image:c.image,
   vip:false,
   color:FINALIST_COLORS[i]||"blue",
   tasks:Array.from({length:TASK_COUNT},()=>false)
  };
 });
 return s;
}

function migrateFinalistLinks(raw){
 raw.finalists.forEach(f=>{
  if(!f.candidateId){
   const match=raw.final1.find(c=>c.name&&f.name&&c.name.trim().toUpperCase()===f.name.trim().toUpperCase());
   if(match) f.candidateId=match.id;
  }
 });
}

function normalize(raw){
 raw.finalists.forEach(f=>{ if(!Array.isArray(f.tasks)) f.tasks=Array.from({length:TASK_COUNT},(_,i)=>i<(f.progress||0)); });
 migrateFinalistLinks(raw);
 syncFinalistsFromFinal1(raw);
 raw.schema="v4";
 return raw;
}

function load(){
 if(cache) return cache;
 try{
  const raw=JSON.parse(localStorage.getItem(KEY));
  if(raw&&raw.finalists&&raw.settings&&raw.final1){ cache=normalize(raw); return cache; }
 }catch(e){}
 try{
  const old=JSON.parse(localStorage.getItem("cyberstat_state_v3"));
  if(old&&old.finalists&&old.settings&&old.final1){ cache=normalize(old); return cache; }
 }catch(e){}
 cache=structuredClone(defaults);
 return cache;
}

function save(s){
 s.updatedAt=new Date().toISOString();
 cache=s;
 try{ localStorage.setItem(KEY,JSON.stringify(s)); }catch(e){}
 window.dispatchEvent(new Event("cyberstat:update"));
 persistRemote(s);
}

async function persistRemote(s){
 if(!supabaseClient) return;
 const{error}=await supabaseClient.from("cyberstat_state").upsert({id:1,data:s,updated_at:new Date().toISOString()});
 if(error){
  console.error("Supabase saqlash xatosi:",error);
  if(typeof toast==="function") toast("Serverga saqlanmadi: "+(error.message||error.code||"noma'lum xato"));
 }
}

function hasSupabaseConfig(){
 return !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY && !String(window.SUPABASE_URL).includes("YOUR_") && !String(window.SUPABASE_ANON_KEY).includes("YOUR_"));
}

async function initRemote(){
 if(!hasSupabaseConfig()){ console.warn("Supabase config.js'da to'ldirilmagan — sayt faqat local rejimda ishlaydi."); return false; }
 if(typeof supabase==="undefined"){ console.error("Supabase kutubxonasi yuklanmadi."); return false; }
 if(!supabaseClient) supabaseClient=supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);

 try{
  const{data,error}=await supabaseClient.from("cyberstat_state").select("data").eq("id",1).maybeSingle();
  if(!error&&data&&data.data&&data.data.finalists){
   cache=normalize(data.data);
   try{ localStorage.setItem(KEY,JSON.stringify(cache)); }catch(e){}
   window.dispatchEvent(new Event("cyberstat:update"));
  }
 }catch(e){ console.error("Supabase o'qish xatosi:",e); }

 if(!realtimeChannel){
  realtimeChannel=supabaseClient.channel("cyberstat-state-changes")
   .on("postgres_changes",{event:"*",schema:"public",table:"cyberstat_state"},payload=>{
    const incoming=payload.new&&payload.new.data;
    if(incoming&&incoming.finalists){
     cache=normalize(incoming);
     try{ localStorage.setItem(KEY,JSON.stringify(cache)); }catch(e){}
     window.dispatchEvent(new Event("cyberstat:update"));
    }
   })
   .subscribe();
 }
 remoteReady=true;
 return true;
}

function resetState(){
 cache=structuredClone(defaults);
 localStorage.setItem(KEY,JSON.stringify(cache));
 save(cache);
 location.reload();
}

function esc(v){ return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }
function progressOf(f){ return f.tasks.filter(Boolean).length; }
function pct(n){ return Math.round((n/TASK_COUNT)*100); }
function missionDots(n){ return Array.from({length:TASK_COUNT},(_,i)=>`<i class="${i<n?"on":""}"></i>`).join(""); }
function taskCircles(n){ return Array.from({length:TASK_COUNT},(_,i)=>`<div class="task ${i<n?"done":""}">${i+1}</div>`).join(""); }
function colorClass(f){ return f.vip?"vip":(f.color==="purple"?"purple":""); }
function totalVotes(s){ return s.final1.reduce((a,c)=>a+(Number(c.votes)||0),0); }

/* Rasmni siqib, <canvas> orqali JPEG Blob'ga aylantiradi (upload uchun). */
function compressImageFile(file,cb){
 if(file.size>12*1024*1024){ toast("Rasm hajmi 12MB dan kichik bo‘lishi kerak"); return; }
 const r=new FileReader();
 r.onload=()=>{
  const img=new Image();
  img.onload=()=>{
   const MAX=900;
   let w=img.width,h=img.height;
   if(w>MAX||h>MAX){
    if(w>=h){ h=Math.round(h*MAX/w); w=MAX; }
    else{ w=Math.round(w*MAX/h); h=MAX; }
   }
   const canvas=document.createElement("canvas");
   canvas.width=w; canvas.height=h;
   const ctx=canvas.getContext("2d");
   ctx.fillStyle="#000"; ctx.fillRect(0,0,w,h);
   ctx.drawImage(img,0,0,w,h);
   canvas.toBlob(blob=>{
    if(!blob){ toast("Rasmni siqib bo‘lmadi"); return; }
    cb(blob);
   },"image/jpeg",0.85);
  };
  img.onerror=()=>{ toast("Rasmni o‘qib bo‘lmadi — fayl buzilgan bo‘lishi mumkin"); };
  img.src=r.result;
 };
 r.onerror=()=>{ toast("Rasmni o‘qib bo‘lmadi"); };
 r.readAsDataURL(file);
}
function blobToDataUrl(blob){
 return new Promise((resolve,reject)=>{
  const r=new FileReader();
  r.onload=()=>resolve(r.result);
  r.onerror=reject;
  r.readAsDataURL(blob);
 });
}

function clock(){
 const d=new Date(), z=n=>String(n).padStart(2,"0");
 document.querySelectorAll("#clock,[data-clock]").forEach(x=>x.textContent=`${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`);
 document.querySelectorAll("#date,[data-date]").forEach(x=>x.textContent=`${z(d.getDate())}.${z(d.getMonth()+1)}.${d.getFullYear()}`);
}

function show(id){
 document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
 document.getElementById(id)?.classList.add("active");
 document.querySelectorAll(".nav button").forEach(x=>x.classList.remove("active"));
 const navMap={home:"navHome",final1:"navF1"};
 document.getElementById(navMap[id])?.classList.add("active");
 scrollTo({top:0,behavior:"smooth"});
 if(id==="home") renderPublic();
 if(id==="final1") renderFinal1();
}
function goArena(){
 show("home");
 setTimeout(()=>{ document.getElementById("arena")?.scrollIntoView({behavior:"smooth",block:"start"}); },60);
 document.getElementById("navF2")?.classList.add("active");
 document.getElementById("navHome")?.classList.remove("active");
}

function toast(t){ const x=document.getElementById("toast"); if(!x) return; x.textContent=t; x.classList.add("show"); setTimeout(()=>x.classList.remove("show"),2200); }

function profile(id){
 const s=load(), f=s.finalists.find(x=>x.id===id);
 if(!f) return;
 const p=progressOf(f), idx=s.finalists.indexOf(f);
 document.getElementById("mn").textContent=f.name;
 document.getElementById("mr").textContent=f.project;
 document.getElementById("mBio").textContent=f.bio||"";
 document.getElementById("mt").textContent=`${p} / ${TASK_COUNT}`;
 document.getElementById("mp").textContent=`${pct(p)}%`;
 document.getElementById("mk").textContent=f.vip?"VIP":"#0"+(idx+1);
 document.getElementById("modal").classList.add("open");
}
function closeModal(){ document.getElementById("modal")?.classList.remove("open"); }

function personMarkup(f){
 return f.image ? `<img src="${esc(f.image)}" alt="">` : "◉";
}

function renderPublic(){
 const s=load(), fs=s.finalists;
 const totalDone=fs.reduce((a,f)=>a+progressOf(f),0);
 const avg=Math.round(totalDone/(fs.length*TASK_COUNT)*100);

 const finalistsEl=document.getElementById("finalists");
 if(finalistsEl){
  finalistsEl.innerHTML=fs.map((f,i)=>{
   const p=progressOf(f);
   return `<div class="finalist ${colorClass(f)}" onclick="profile('${f.id}')">
    ${f.vip?'<div class="vip-ribbon">◆ VIP NOMINANT</div>':""}
    <div class="f-head"><span class="rank">#0${i+1}</span></div>
    <div class="portrait">${personMarkup(f)}<div class="proj-badge">⬡ ${esc(f.project)}</div></div>
    <div class="f-body">
     <h3>${esc(f.name)}</h3>
     <div class="role">${esc(f.project)}</div>
     <div class="subrole">◆ Cybersecurity loyihasi</div>
     <div class="mission">${missionDots(p)}</div>
     <div class="progress-meta"><span>${p} / ${TASK_COUNT}</span><b>${pct(p)}%</b></div>
    </div></div>`;
  }).join("");
 }

 const leader=fs.slice().sort((a,b)=>progressOf(b)-progressOf(a))[0];
 const lp=leader?progressOf(leader):0;
 const ring=document.getElementById("ring");
 if(ring){
  ring.style.background=`conic-gradient(var(--blue) 0 ${pct(lp)}%,#10283d ${pct(lp)}% 100%)`;
  document.getElementById("ringText").innerHTML=`${lp}/${TASK_COUNT}<small>${pct(lp)}%</small>`;
  document.getElementById("rDone").textContent=lp;
  document.getElementById("rRemain").textContent=TASK_COUNT-lp;
  const rAvgEl=document.getElementById("rAvg"); if(rAvgEl) rAvgEl.textContent=avg+"%";
  document.getElementById("tasks").innerHTML=taskCircles(lp);
 }

 const vip=fs.find(f=>f.vip)||fs[0];
 const vipEl=document.getElementById("vipName");
 if(vipEl) vipEl.textContent=vip?vip.name:"—";
 const vipIconEl=document.getElementById("vipIcon");
 if(vipIconEl){ vipIconEl.innerHTML = vip?.image ? `<img src="${esc(vip.image)}" alt="">` : "◆"; }

 const lockEl=document.getElementById("publicLock");
 if(lockEl) lockEl.textContent=s.settings.publicTasks?"Admin tomonidan public ko‘rsatishga ruxsat berilgan":"Public foydalanuvchilar uchun yopiq. Faqat progress ko‘rsatiladi.";

 const brandName=document.getElementById("brandName");
 if(brandName) brandName.textContent=s.settings.siteName;
 const brandSub=document.getElementById("brandSub");
 if(brandSub) brandSub.textContent=s.settings.subtitle;
 document.title=`${s.settings.siteName} — ${s.settings.subtitle}`;

 const heroTitle=document.getElementById("heroTitleText");
 if(heroTitle) heroTitle.textContent=s.settings.heroTitle;
 const heroSub=document.getElementById("heroSubText");
 if(heroSub) heroSub.textContent=s.settings.heroSub;
 const heroLine=document.getElementById("heroLineText");
 if(heroLine) heroLine.textContent=s.settings.heroLine;
}

function renderFinal1(){
 const s=load();
 const total=totalVotes(s);
 const sorted=s.final1.slice().sort((a,b)=>(Number(b.votes)||0)-(Number(a.votes)||0));
 const grid=document.getElementById("f1Grid");
 if(grid){
  grid.innerHTML=sorted.map((c,i)=>{
   const p=total?((Number(c.votes)||0)/total*100).toFixed(1):"0.0";
   return `<div class="f1-item">
    <div class="f1-photo">${c.image?`<img src="${esc(c.image)}" alt="">`:'<div class="f1-noimg">◉</div>'}<div class="f1-rank">#0${i+1}</div></div>
    <div class="f1-info">
     <div class="f1-name">${esc(c.name)}</div>
     <div class="f1-project">${c.vip?"VIP · ":""}${esc(c.project)}</div>
     <div class="f1-rating">★ ${Number(c.rating||5).toFixed(1)} / 5.0</div>
     <p class="f1-bio">${esc(c.bio||"")}</p>
    </div>
    <div class="f1-arrow">→</div>
    <div class="f1-stats"><div class="f1-votes">${(Number(c.votes)||0).toLocaleString("ru-RU")}<small>OVOZ</small></div><div class="f1-pct">${p}%</div></div>
   </div>`;
  }).join("");
 }
 const cnt=document.getElementById("f1Count");
 if(cnt) cnt.textContent=`${s.final1.length} FINALIST`;
}

/* ============== ADMIN ============== */

function renderAdmin(){
 const s=load();
 const body=document.getElementById("aFinalists");
 if(body){
  if(!s.finalists.length){
   body.innerHTML=`<div class="notice">Hozircha Final 2 ishtirokchisi yo‘q — Final 1'ga kamida bitta nomzod qo‘shing, ovoz sonini kiriting, top-3 shu yerda avtomatik paydo bo‘ladi.</div>`;
  }else{
   body.innerHTML=s.finalists.map((f,i)=>{
    const p=progressOf(f);
    const dots=f.tasks.map((done,ti)=>`<div class="mini-task ${done?"done":""}" onclick="toggleTask('${f.id}',${ti})">${ti+1}</div>`).join("");
    return `<div class="cand-row">
     <div class="cand-photo">
      <img src="${esc(f.image||"")}" onerror="this.style.visibility='hidden'">
      <div class="auto-badge">Final 1'dan avtomatik</div>
     </div>
     <div class="cand-fields">
      <div class="form-grid">
       <div class="field"><label>№ / TARTIB (ovoz bo‘yicha)</label><input value="#0${i+1}" disabled></div>
       <div class="field"><label>ISM (Final 1'dan avtomatik)</label><input value="${esc(f.name)}" disabled></div>
       <div class="field"><label>LOYIHA (Final 2)</label><input data-fproj="${f.id}" value="${esc(f.project)}"></div>
       <div class="field"><label>PROGRESS</label><input value="${p} / ${TASK_COUNT}  (${pct(p)}%)" disabled></div>
       <div class="field full"><label>TAVSIF (BIO) — Final 2 uchun</label><textarea data-fbio="${f.id}">${esc(f.bio||"")}</textarea></div>
      </div>
      <div class="field" style="margin-top:12px"><label>10 TA TOPSHIRIQ</label><div class="mini-tasks">${dots}</div></div>
      <div class="toolbar">
       <button class="btn" onclick="toggleVip('${f.id}')">VIP belgisi <span class="switch ${f.vip?"on":""}"><i></i></span></button>
       <button class="btn primary" onclick="saveFinalistMeta('${f.id}')">Saqlash</button>
      </div>
     </div>
    </div>`;
   }).join("");
  }
 }

 const cand=document.getElementById("aCandidates");
 if(cand){
  const total=totalVotes(s);
  cand.innerHTML=s.final1.map(c=>{
   const p=total?((Number(c.votes)||0)/total*100).toFixed(1):"0.0";
   return `<div class="cand-row">
    <div class="cand-photo">
     <img src="${esc(c.image||"")}" onerror="this.style.visibility='hidden'">
     <label class="btn tiny">Rasm yuklash<input type="file" accept="image/*" hidden onchange="uploadCandidateImage('${c.id}',this)"></label>
    </div>
    <div class="cand-fields">
     <div class="form-grid">
      <div class="field"><label>ISM</label><input data-cname="${c.id}" value="${esc(c.name)}"></div>
      <div class="field"><label>LOYIHA / YORLIQ</label><input data-cproj="${c.id}" value="${esc(c.project)}"></div>
      <div class="field"><label>REYTING (0–5)</label><input type="number" step="0.1" min="0" max="5" data-crating="${c.id}" value="${c.rating}"></div>
      <div class="field"><label>OVOZLAR SONI</label><input type="number" min="0" data-cvotes="${c.id}" value="${c.votes}"></div>
      <div class="field full"><label>TAVSIF</label><textarea data-cbio="${c.id}">${esc(c.bio)}</textarea></div>
     </div>
     <div class="toolbar">
      <span class="mono" style="color:#71879a;align-self:center">Joriy foiz: ${p}%</span>
      <button class="btn" onclick="toggleCandidateVip('${c.id}')">VIP belgisi <span class="switch ${c.vip?"on":""}"><i></i></span></button>
      <button class="btn primary" onclick="saveCandidate('${c.id}')">Saqlash</button>
      <button class="btn danger" onclick="removeCandidate('${c.id}')">O‘chirish</button>
     </div>
    </div>
   </div>`;
  }).join("");
 }

 const liveSwitch=document.getElementById("liveSwitch");
 if(liveSwitch) liveSwitch.classList.toggle("on",s.settings.live);
 const f2Switch=document.getElementById("f2Switch");
 if(f2Switch) f2Switch.classList.toggle("on",s.settings.final2Open);
 const taskSwitch=document.getElementById("taskSwitch");
 if(taskSwitch) taskSwitch.classList.toggle("on",s.settings.publicTasks);

 const sn=document.getElementById("siteName"); if(sn) sn.value=s.settings.siteName;
 const brandNameAdmin=document.getElementById("brandName");
 if(brandNameAdmin) brandNameAdmin.textContent=s.settings.siteName;
 const ss=document.getElementById("siteSubtitle"); if(ss) ss.value=s.settings.subtitle;
 const ht=document.getElementById("heroTitle"); if(ht) ht.value=s.settings.heroTitle;
 const hs=document.getElementById("heroSub"); if(hs) hs.value=s.settings.heroSub;
 const hl=document.getElementById("heroLine"); if(hl) hl.value=s.settings.heroLine;
}

function toggleTask(id,taskIndex){
 const s=load(), f=s.finalists.find(x=>x.id===id);
 if(!f) return;
 f.tasks[taskIndex]=!f.tasks[taskIndex];
 save(s); renderAdmin();
 toast(`Topshiriq ${taskIndex+1} yangilandi`);
}
function toggleVip(id){
 const s=load();
 s.finalists.forEach(f=>{ f.vip=(f.id===id)?!f.vip:false; });
 save(s); renderAdmin();
 toast("VIP status yangilandi");
}
/* Eslatma: Final 2 ishtirokchilari endi qo‘lda qo‘shilmaydi/o‘chirilmaydi —
   ular Final 1'dagi eng ko‘p ovoz olgan top-3 nomzoddan avtomatik hosil
   bo‘ladi (syncFinalistsFromFinal1). Tarkibni o‘zgartirish uchun "Final 1 —
   Nomzodlar va natijalar" bo‘limida nomzod qo‘shing/o‘chiring yoki ovozini
   tahrirlang. */

function saveFinalistMeta(id){
 const s=load(), f=s.finalists.find(x=>x.id===id);
 if(!f) return;
 f.project=document.querySelector(`[data-fproj="${id}"]`).value.trim()||f.project;
 const bioEl=document.querySelector(`[data-fbio="${id}"]`);
 if(bioEl) f.bio=bioEl.value;
 save(s); renderAdmin();
 toast("Final 2 ma'lumotlari saqlandi");
}

function toggleCandidateVip(id){
 const s=load();
 s.final1.forEach(c=>{ c.vip=(c.id===id)?!c.vip:false; });
 syncFinalistsFromFinal1(s);
 save(s); renderAdmin();
 toast("VIP belgisi yangilandi");
}
function saveCandidate(id){
 const s=load(), c=s.final1.find(x=>x.id===id);
 if(!c) return;
 c.name=document.querySelector(`[data-cname="${id}"]`).value.trim()||c.name;
 c.project=document.querySelector(`[data-cproj="${id}"]`).value.trim()||c.project;
 const rating=parseFloat(document.querySelector(`[data-crating="${id}"]`).value);
 c.rating=isNaN(rating)?c.rating:Math.max(0,Math.min(5,rating));
 const votes=parseInt(document.querySelector(`[data-cvotes="${id}"]`).value,10);
 c.votes=isNaN(votes)?c.votes:Math.max(0,votes);
 c.bio=document.querySelector(`[data-cbio="${id}"]`).value;
 syncFinalistsFromFinal1(s);
 save(s); renderAdmin();
 toast("Nomzod ma'lumotlari saqlandi — reyting va Final 2 tarkibi avtomatik yangilandi");
}
/* Rasm endi state (jsonb) ichiga base64 sifatida EMAS, balki Supabase
   Storage'ga (bucket: candidate-photos) yuklanadi va faqat kichik URL
   state'ga yoziladi. Aynan avvalgi versiyada har bir rasm base64 holida
   to'g'ridan-to'g'ri "cyberstat_state" jadvaliga yozilar edi — bir nechta
   rasm bilan bu qator hajmi tez orada bir necha MB'ga yetib, HAR QANDAY
   keyingi saqlash (hatto oddiy matn o'zgarishi ham) statement-timeout /
   xato bilan tugab, o'zgarishlar globalga yetib bormas edi. Storage'ga
   o'tish shu muammoni tubdan hal qiladi. */
function uploadCandidateImage(id,input){
 const file=input.files && input.files[0];
 if(!file) return;
 compressImageFile(file,async blob=>{
  toast("Rasm yuklanmoqda...");
  try{
   let imageValue;
   if(supabaseClient){
    const path=`${id}_${Date.now()}.jpg`;
    const{error:upErr}=await supabaseClient.storage.from("candidate-photos").upload(path,blob,{contentType:"image/jpeg",upsert:true,cacheControl:"31536000"});
    if(upErr) throw upErr;
    const{data:pub}=supabaseClient.storage.from("candidate-photos").getPublicUrl(path);
    imageValue=pub.publicUrl;
   }else{
    imageValue=await blobToDataUrl(blob);
   }
   const s=load(), c=s.final1.find(x=>x.id===id);
   if(!c) return;
   c.image=imageValue;
   syncFinalistsFromFinal1(s);
   save(s); renderAdmin();
   toast("Nomzod rasmi yangilandi");
  }catch(e){
   console.error("Rasm yuklash xatosi:",e);
   toast("Rasmni saqlab bo‘lmadi: "+(e.message||"noma'lum xato")+" — Storage bucket sozlanganini tekshiring");
  }
 });
 input.value="";
}
function addCandidate(){
 const s=load();
 s.final1.push({id:"c"+Date.now(),name:"YANGI NOMZOD",project:"LOYIHA NOMI",vip:false,rating:5,bio:"",image:"",votes:0});
 syncFinalistsFromFinal1(s);
 save(s); renderAdmin();
 toast("Yangi nomzod qo‘shildi");
}
function removeCandidate(id){
 if(!confirm("Ushbu nomzodni o‘chirishni tasdiqlaysizmi? Agar u top-3'da bo‘lsa, Final 2'dan ham avtomatik chiqib ketadi.")) return;
 const s=load();
 s.final1=s.final1.filter(c=>c.id!==id);
 syncFinalistsFromFinal1(s);
 save(s); renderAdmin();
 toast("Nomzod o‘chirildi");
}

function toggleSetting(k){
 const s=load();
 s.settings[k]=!s.settings[k];
 save(s); renderAdmin();
 toast("Sozlama yangilandi");
}
function saveSettings(){
 const s=load();
 s.settings.siteName=document.getElementById("siteName").value.trim()||s.settings.siteName;
 s.settings.subtitle=document.getElementById("siteSubtitle").value.trim()||s.settings.subtitle;
 s.settings.heroTitle=document.getElementById("heroTitle").value;
 s.settings.heroSub=document.getElementById("heroSub").value;
 s.settings.heroLine=document.getElementById("heroLine").value;
 save(s); renderAdmin();
 toast("Sayt sozlamalari saqlandi");
}
function exportData(){
 const b=new Blob([JSON.stringify(load(),null,2)],{type:"application/json"});
 const a=document.createElement("a");
 a.href=URL.createObjectURL(b); a.download="cyberstat-data.json"; a.click();
 URL.revokeObjectURL(a.href);
}
function importData(input){
 const file=input.files[0]; if(!file) return;
 const r=new FileReader();
 r.onload=()=>{
  try{
   const x=JSON.parse(r.result);
   if(!x.finalists||!x.final1||!x.settings) throw new Error("bad shape");
   cache=normalize(x);
   localStorage.setItem(KEY,JSON.stringify(cache));
   save(cache);
   toast("Ma'lumotlar import qilindi");
   renderAdmin();
  }catch(e){ toast("JSON fayl noto‘g‘ri"); }
 };
 r.readAsText(file);
}

/* ============== ADMIN AUTENTIFIKATSIYA ============== */
/* Public sayt (index.html) hech qanday login talab qilmaydi — faqat o'qiydi.
   Admin panel (admin.html) esa Supabase Auth orqali login talab qiladi;
   yozish huquqi RLS orqali faqat shu sessiyaga beriladi. */

async function initAdminAuth(){
 const gate=document.getElementById("authGate");
 const appEl=document.getElementById("adminApp");
 const ok=await initRemote();
 if(!ok){
  if(gate){
   gate.classList.remove("hidden");
   gate.innerHTML=`<div class="auth-box"><div class="kicker">CYBERSTAT / ADMIN</div><h2>Supabase ulanmagan</h2><div class="notice" style="margin-top:14px">config.js faylida SUPABASE_URL va SUPABASE_ANON_KEY qiymatlarini to‘ldiring, so‘ngra sahifani qayta yuklang. Supabase loyihasini https://supabase.com'da yarating.</div></div>`;
  }
  if(appEl) appEl.classList.add("hidden");
  return;
 }
 const{data:{session}}=await supabaseClient.auth.getSession();
 renderAuthState(session);
 supabaseClient.auth.onAuthStateChange((_event,session)=>renderAuthState(session));
}

function renderAuthState(session){
 const gate=document.getElementById("authGate");
 const appEl=document.getElementById("adminApp");
 const logoutBtn=document.getElementById("logoutBtn");
 if(session){
  if(gate) gate.classList.add("hidden");
  if(appEl) appEl.classList.remove("hidden");
  if(logoutBtn) logoutBtn.classList.remove("hidden");
  const who=document.getElementById("authWho");
  if(who) who.textContent=session.user.email||"";
  renderAdmin();
 }else{
  if(appEl) appEl.classList.add("hidden");
  if(logoutBtn) logoutBtn.classList.add("hidden");
  if(gate){
   gate.classList.remove("hidden");
   gate.innerHTML=`
   <div class="auth-box">
    <div class="kicker">CYBERSTAT / ADMIN</div>
    <h2>Boshqaruv paneliga kirish</h2>
    <p class="auth-hint">Faqat Supabase'da yaratilgan admin hisobi bilan kirish mumkin.</p>
    <form id="loginForm" class="auth-form">
     <div class="field"><label>EMAIL</label><input id="loginEmail" type="email" autocomplete="username" required></div>
     <div class="field"><label>PAROL</label><input id="loginPassword" type="password" autocomplete="current-password" required></div>
     <div class="auth-error" id="loginError"></div>
     <button type="submit" class="btn primary" id="loginBtn" style="width:100%">Kirish</button>
    </form>
   </div>`;
   document.getElementById("loginForm").addEventListener("submit",adminLogin);
  }
 }
}

async function adminLogin(e){
 e.preventDefault();
 const email=document.getElementById("loginEmail").value.trim();
 const password=document.getElementById("loginPassword").value;
 const btn=document.getElementById("loginBtn");
 const errEl=document.getElementById("loginError");
 errEl.textContent="";
 btn.disabled=true; btn.textContent="Kirilmoqda...";
 const{error}=await supabaseClient.auth.signInWithPassword({email,password});
 btn.disabled=false; btn.textContent="Kirish";
 if(error) errEl.textContent="Email yoki parol noto‘g‘ri.";
}

async function adminLogout(){
 if(supabaseClient) await supabaseClient.auth.signOut();
}

document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeModal(); });
setInterval(clock,1000); clock();
