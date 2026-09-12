
const KEY="cyberstat_state_v1";
const defaults={
 settings:{siteName:"CYBERSTAT",subtitle:"DIGITAL COMPETITION ARENA",live:true,final2Open:true,publicTasks:false,heroTitle:"FINAL 02",heroLine:"KIBERXAVFSIZLIK × INNOVATSIYA × KELAJAK"},
 finalists:[
  {id:"f1",name:"XOSHIMOV XOSHIMXON",team:"VANGUARD-X",progress:6,vip:true,color:"gold",project:"Cybersecurity loyihasi"},
  {id:"f2",name:"RAHMATOV BEKZOD",team:"NEURAL SHIELD",progress:4,vip:false,color:"blue",project:"Cybersecurity loyihasi"},
  {id:"f3",name:"ALIJONOV SANJAR",team:"PHOENIX",progress:2,vip:false,color:"purple",project:"Cybersecurity loyihasi"}
 ],
 final1:[
  {rank:1,name:"FINALIST 01",score:"—",status:"1-O‘RIN"},
  {rank:2,name:"FINALIST 02",score:"—",status:"TASDIQLANGAN"},
  {rank:3,name:"FINALIST 03",score:"—",status:"TASDIQLANGAN"}
 ],
 activity:[],
 updatedAt:null
};
function load(){try{return JSON.parse(localStorage.getItem(KEY))||structuredClone(defaults)}catch(e){return structuredClone(defaults)}}
function save(s){s.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(s));window.dispatchEvent(new Event("cyberstat:update"))}
function resetState(){localStorage.setItem(KEY,JSON.stringify(structuredClone(defaults)));location.reload()}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function pct(n){return Math.round((n/10)*100)}
function mission(n,cls=""){return Array.from({length:10},(_,i)=>`<i class="${i<n?"on ":""}${cls}"></i>`).join("")}
function task(n){return Array.from({length:10},(_,i)=>`<div class="task ${i<n?"done":""}">${i+1}</div>`).join("")}
function clock(){const d=new Date(),z=n=>String(n).padStart(2,"0");document.querySelectorAll("[data-clock]").forEach(x=>x.textContent=`${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`);document.querySelectorAll("[data-date]").forEach(x=>x.textContent=`${z(d.getDate())}.${z(d.getMonth()+1)}.${d.getFullYear()}`)}
function show(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));document.getElementById(id)?.classList.add("active");document.querySelectorAll(".nav button").forEach(x=>x.classList.remove("active"));document.getElementById("nav-"+id)?.classList.add("active");scrollTo({top:0,behavior:"smooth"});if(id==="final2")renderPublic();if(id==="final1")renderFinal1()}
function toast(t){const x=document.getElementById("toast");if(!x)return;x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2200)}
function profile(id){const s=load(),f=s.finalists.find(x=>x.id===id);if(!f)return;document.getElementById("mn").textContent=f.name;document.getElementById("mr").textContent=f.team;document.getElementById("mt").textContent=`${f.progress} / 10`;document.getElementById("mp").textContent=`${pct(f.progress)}%`;document.getElementById("mk").textContent=f.vip?"VIP":"#"+(s.finalists.indexOf(f)+1);document.getElementById("modal").classList.add("open")}
function closeModal(){document.getElementById("modal")?.classList.remove("open")}
function renderPublic(){
 const s=load(),fs=s.finalists,done=fs.reduce((a,f)=>a+f.progress,0),avg=Math.round(done/(fs.length*10)*100);
 document.getElementById("finalists").innerHTML=fs.map((f,i)=>`<div class="finalist ${f.vip?"vip":""}" onclick="profile('${f.id}')"><div class="f-head"><span class="vip-label">${f.vip?"♛ VIP NOMINANT":""}</span><span class="rank">#0${i+1}</span></div><div class="portrait"><div class="person">◉</div></div><div class="f-body"><h3>${esc(f.name)}</h3><div class="role">${esc(f.team)}</div><div class="mission">${mission(f.progress)}</div><div class="progress-meta"><span>${f.progress} / 10</span><b>${pct(f.progress)}%</b></div></div></div>`).join("");
 const leader=fs.slice().sort((a,b)=>b.progress-a.progress)[0], p=leader?leader.progress:0;
 document.getElementById("ring").style.background=`conic-gradient(var(--blue) 0 ${pct(p)}%,#10283d ${pct(p)}% 100%)`;
 document.getElementById("ringText").innerHTML=`${p}/10<small>${pct(p)}%</small>`;
 document.getElementById("done").textContent=p;document.getElementById("remain").textContent=10-p;document.getElementById("avg").textContent=avg+"%";document.getElementById("tasks").innerHTML=task(p);
 document.getElementById("vipName").textContent=(fs.find(f=>f.vip)||fs[0])?.name||"—";
 document.getElementById("publicLock").textContent=s.settings.publicTasks?"Admin tomonidan public ko‘rsatishga ruxsat berilgan":"Public foydalanuvchilar uchun yopiq";
}
function renderFinal1(){const s=load();document.getElementById("resultRows").innerHTML=s.final1.map(r=>`<div class="rrow"><div class="mono">${r.rank}</div><div>${esc(r.name)}</div><div class="mono">${esc(r.score)}</div><div><span class="tag ${r.rank===1?"gold":""}">${esc(r.status)}</span></div></div>`).join("");const w=s.final1[0];document.getElementById("winnerName").textContent=w?.name||"—";document.getElementById("winnerScore").textContent=w?.score||"—"}
function renderAdmin(){
 const s=load();document.getElementById("aFinalists").innerHTML=s.finalists.map((f,i)=>`<tr><td>#0${i+1}</td><td>${esc(f.name)}</td><td>${esc(f.team)}</td><td><input data-prog="${f.id}" type="number" min="0" max="10" value="${f.progress}" style="width:70px"></td><td>${f.vip?"VIP":"—"}</td><td><button class="btn" onclick="saveFinalist('${f.id}')">Saqlash</button></td></tr>`).join("");
 document.getElementById("aResults").innerHTML=s.final1.map((r,i)=>`<tr><td>${r.rank}</td><td><input data-rname="${i}" value="${esc(r.name)}"></td><td><input data-rscore="${i}" value="${esc(r.score)}"></td><td><input data-rstatus="${i}" value="${esc(r.status)}"></td><td><button class="btn" onclick="saveResult(${i})">Saqlash</button></td></tr>`).join("");
 document.getElementById("liveSwitch").classList.toggle("on",s.settings.live);document.getElementById("f2Switch").classList.toggle("on",s.settings.final2Open);document.getElementById("taskSwitch").classList.toggle("on",s.settings.publicTasks);
 document.getElementById("heroTitle").value=s.settings.heroTitle;document.getElementById("heroLine").value=s.settings.heroLine;
}
function saveFinalist(id){const s=load(),f=s.finalists.find(x=>x.id===id),v=document.querySelector(`[data-prog="${id}"]`);f.progress=Math.max(0,Math.min(10,Number(v.value)||0));save(s);renderAdmin();toast("Finalist progressi saqlandi");}
function saveResult(i){const s=load();s.final1[i].name=document.querySelector(`[data-rname="${i}"]`).value;s.final1[i].score=document.querySelector(`[data-rscore="${i}"]`).value;s.final1[i].status=document.querySelector(`[data-rstatus="${i}"]`).value;save(s);renderAdmin();toast("Final 1 natijasi saqlandi");}
function toggleSetting(k){const s=load();s.settings[k]=!s.settings[k];save(s);renderAdmin();toast("Sozlama yangilandi");}
function saveSettings(){const s=load();s.settings.heroTitle=document.getElementById("heroTitle").value;s.settings.heroLine=document.getElementById("heroLine").value;save(s);toast("Sayt sozlamalari saqlandi")}
function exportData(){const b=new Blob([JSON.stringify(load(),null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="cyberstat-data.json";a.click();URL.revokeObjectURL(a.href)}
function importData(input){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.finalists||!x.final1)throw Error();localStorage.setItem(KEY,JSON.stringify(x));toast("Ma’lumotlar import qilindi");renderAdmin()}catch(e){toast("JSON fayl noto‘g‘ri")}};r.readAsText(f)}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});setInterval(clock,1000);clock();
