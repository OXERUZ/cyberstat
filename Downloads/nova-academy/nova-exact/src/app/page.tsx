"use client";
import { ArrowRight, BrainCircuit, Check, ChevronRight, Code2, ShieldCheck, Sparkles, Terminal, Trophy, Users, Zap } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import TechVisual from "@/components/TechVisual";
import ApplicationModal from "@/components/ApplicationModal";
import CourseDetail from "@/components/CourseDetail";
import { courses, roadmap, faqs, projects } from "@/lib/data";
import type { Course } from "@/types";

export default function Home() {
  const [apply,setApply]=useState(false); const [selected,setSelected]=useState<Course|null>(null); const [selectedCourse,setSelectedCourse]=useState<Course|null>(null);
  const openApply=(course?:Course)=>{setSelected(null);setSelectedCourse(course??null);setApply(true)};
  return <>
    <Navbar onApply={()=>openApply()}/>
    <main>
      <section className="hero" id="hero"><div className="grid-bg"/><div className="hero-glow hero-glow-a"/><div className="hero-glow hero-glow-b"/>
        <div className="container hero-grid">
          <div className="hero-copy"><div className="pill"><span className="pulse-dot"/> 2026 QABUL OCHIQ <span className="pill-line"/> NOVA ACADEMY</div>
            <h1>IT'dagi kelajagingiz <span className="accent">shu yerdan</span> boshlanadi.</h1>
            <p className="hero-lead">Dasturlash, sun’iy intellekt va professional kiberxavfsizlikni real loyihalar, mentorlik va amaliyot orqali o‘rganing.</p>
            <div className="actions"><button className="btn primary btn-lg" onClick={()=>openApply()}>O‘qishga ariza berish <ArrowRight size={17}/></button><a className="btn btn-lg" href="#courses">Yo‘nalishlarni ko‘rish</a></div>
            <div className="hero-trust"><span><Check size={15}/> Real loyihalar</span><span><Check size={15}/> Portfolio</span><span><Check size={15}/> Career support</span></div>
          </div><TechVisual/>
        </div>
      </section>

      <div className="container"><div className="stats"><div className="stat"><strong>03</strong><span>Asosiy IT yo‘nalish</span></div><div className="stat"><strong>100%</strong><span>Amaliy yondashuv</span></div><div className="stat"><strong>REAL</strong><span>Loyihalar bilan o‘qish</span></div><div className="stat"><strong>CAREER</strong><span>Kasbiy rivojlanish</span></div></div></div>

      <section className="section section-tight" id="why"><div className="container split"><div className="sticky-title"><div className="eyebrow">01 / NOVA PHILOSOPHY</div><h2 className="h2">Faqat kurs emas — <span className="accent">kasb.</span></h2><p className="muted">Nova Academy o‘quvchini darsni ko‘rgan emas, bilimini amalda qo‘llay oladigan mutaxassisga aylantirish uchun qurilgan.</p><a className="text-link" href="#system">Tizimni ko‘rish <ArrowRight size={15}/></a></div>
        <div className="features">{[["01","Amaliy ta’lim","Har bir mavzu topshiriq, mini-project va real vaziyat bilan mustahkamlanadi.",Zap],["02","Professional mentorlar","Tajriba va feedback orqali tezroq o‘sish uchun individual yo‘nalish.",Users],["03","Portfolio","GitHub, loyiha va case'lar orqali ko‘rsatish mumkin bo‘lgan natija.",Terminal],["04","Career support","CV, interview va ishga tayyorgarlik bo‘yicha yo‘naltirish.",Trophy]].map(([n,t,d,I])=>{const Icon=I as typeof Zap;return <div className="feature feature-rich" key={n}><div className="feature-top"><span className="feature-num">{n}</span><Icon size={19}/></div><h3>{t as string}</h3><p className="muted">{d as string}</p></div>})}</div>
      </div></section>

      <section className="section" id="courses"><div className="container"><div className="section-head"><div><div className="eyebrow">02 / YO‘NALISHLAR</div><h2 className="h2">IT olamida o‘z <span className="accent">yo‘lingizni</span> tanlang.</h2></div><p className="muted section-note">Boshlang‘ich bilimdan real loyiha va portfolio yaratishgacha.</p></div>
        <div className="courses">{courses.map(c=><CourseCard key={c.id} course={c} onClick={()=>setSelected(c)}/>)}</div>
      </div></section>

      <section className="section project-section" id="projects">
        <div className="container projects-wrap">
          <div className="project-side-note left"><span>REAL PROJECTS</span><span>REAL SKILLS</span><span>REAL FUTURE</span></div>
          <div className="project-side-note right"><span>Innovatsiya</span><span>Tajriba</span><span>Rivojlanish</span></div>
          <div className="project-kicker"><span className="kicker-line"/> BIZNING LOYIHALAR <span className="kicker-line"/></div>
          <div className="projects-title">
            <h2 className="h2">NOVA <span className="accent">LAB</span></h2>
            <p>Real loyihalar. Real tajriba. Kelajak texnologiyalari.</p>
            <small>Biz faqat o‘rgatmaymiz — biz haqiqiy mahsulotlar yaratamiz.</small>
          </div>
          <div className="projects">
            {[
              {code:'NOVA / 01',name:'NOVA SECURITY',category:'SECURITY PLATFORM',image:'/projects/nova-security-reference.jpg',tone:'security',description:'Zamonaviy xavfsizlik texnologiyalari. Sizning raqamli himoyangiz.'},
              {code:'NOVA / 02',name:'NOVA TRACE',category:'INTELLIGENCE',image:'/projects/nova-trace-reference.jpg',tone:'trace',description:'Tahlil, kuzatuv va ma’lumotlarni qayta ishlash uchun ishlab chiqilgan platforma.'},
              {code:'NOVA / 03',name:'NOVA GUARD',category:'SECURITY PLATFORM',image:'/projects/nova-guard-reference.jpg',tone:'guard',description:'Intellektual xavfsizlik platformasi. Tahdidlarni oldindan aniqlash.'}
            ].map((p)=><article className={`project-card project-${p.tone}`} key={p.name}>
              <div className="project-image"><img src={p.image} alt={p.name}/><div className="image-shade"/><div className="project-image-meta"><span>{p.code}</span><span>{p.category}</span></div></div>
              <div className="project-card-body">
                <h3><span>NOVA</span> <b>{p.name.replace("NOVA ","")}</b></h3>
                <p>{p.description}</p>
                <span className="text-link">Loyiha haqida <ArrowRight size={15}/></span>
              </div>
            </article>)}
          </div>
          <div className="projects-cta">
            <div><span className="cta-kicker">KELAJAGINGIZ BIZ BILAN</span><strong>IT sohasida professional bo‘lish <em>vaqti keldi!</em></strong></div>
            <div className="cta-points"><span>◈<small>Zamonaviy<br/>texnologiyalar</small></span><span>⌘<small>Amaliy<br/>loyihalar</small></span><span>♙<small>Professional<br/>mentorlar</small></span><span>✦<small>Karyera<br/>imkoniyatlari</small></span></div>
            <a className="btn primary" href="#courses">Kurslarga ro‘yxatdan o‘tish <ArrowRight size={15}/></a>
          </div>
        </div>
      </section>

      <section className="section" id="cyber"><div className="container"><div className="career cyber-card"><div className="cyber-copy"><div className="eyebrow">04 / CYBERSECURITY</div><h2 className="h2">Professional <span className="accent">Kiberxavfsizlik</span></h2><p className="muted">Linux, networking, web security, SOC, ethical hacking va laboratoriya mashg‘ulotlari orqali xavfsizlik fikrlashini rivojlantiring.</p><div className="cyber-chips"><span>LABS</span><span>CTF</span><span>SOC</span><span>PENTEST</span></div></div><div className="roadmap">{roadmap.map(([n,t])=><div className="road" key={n}><small>{n}</small><div>{t}</div><ChevronRight size={15}/></div>)}</div></div></div></section>

      <section className="section" id="ai"><div className="container split ai-section"><div><div className="eyebrow">05 / ARTIFICIAL INTELLIGENCE</div><h2 className="h2">AI — kelajak emas. U <span className="accent">allaqachon shu yerda.</span></h2><p className="muted">Generative AI, automation va AI Agents'ni real vazifalar orqali tushuning va o‘zingizning AI mahsulotingizni yarating.</p><button className="btn primary" onClick={()=>setSelected(courses.find(c=>c.id==="ai")!)}>AI yo‘nalishini ko‘rish <ArrowRight size={16}/></button></div><div className="ai-grid">{["AI","Machine Learning","Generative AI","Automation","AI Agents","APIs"].map((x,i)=><div className="ai-item" key={x}><Sparkles size={16}/><span>{x}</span><small>{String(i+1).padStart(2,"0")}</small></div>)}</div></div></section>

      <section className="section" id="system"><div className="container"><div className="eyebrow">06 / LEARNING SYSTEM</div><div className="section-head"><div><h2 className="h2">O‘rganing. <span className="accent">Yarating.</span> Ishga kiring.</h2></div><p className="muted section-note">Oddiy video-kurs emas — ketma-ket rivojlanish tizimi.</p></div><div className="process">{[["01","O‘rganing","Fundamental bilimlarni tizimli o‘zlashtiring."],["02","Amaliyot","Har bir mavzuni real vazifalar bilan mustahkamlang."],["03","Yarating","Portfolio uchun loyihalar va case'lar yarating."],["04","Launch","Career support bilan keyingi bosqichga chiqing."]].map(x=><div className="process-card" key={x[0]}><div className="process-num">{x[0]}</div><div className="process-arrow">↗</div><h3>{x[1]}</h3><p className="muted">{x[2]}</p></div>)}</div><div className="launch-line"><span>LEARN</span><i/> <span>BUILD</span><i/> <span>LAUNCH</span></div></div></section>

      <section className="section" id="career"><div className="container"><div className="career career-main"><div className="eyebrow">07 / CAREER</div><h2 className="h2">Kurs tugaydi. <span className="accent">Karyera boshlanadi.</span></h2><p className="muted">Ta’limni real natijaga aylantirish uchun portfolio, CV, interview va career yo‘nalishida support.</p><div className="checks">{["Real portfolio","GitHub loyihalari","CV tayyorlash","Interview preparation","Career consultation","Vakansiyalarga yo‘naltirish","Internship imkoniyatlari","Individual feedback"].map(x=><div className="check" key={x}><Check size={16}/>{x}</div>)}</div><button className="btn primary btn-lg" onClick={()=>openApply()}>Karyera yo‘lini boshlash <ArrowRight size={16}/></button></div></div></section>

      <section className="section" id="admission"><div className="container admission"><div className="eyebrow">08 / ADMISSION</div><h2 className="h2">Nova Academy'ga <span className="accent">qanday kiriladi?</span></h2><div className="admission-grid">{[["01","Ariza topshiring","Maqsadingiz va qiziqishingizni yozing."],["02","Admission suhbat","Siz uchun mos yo‘nalishni aniqlaymiz."],["03","Darajangiz aniqlanadi","Boshlang‘ich nuqtangizni belgilaymiz."],["04","O‘qishni boshlang","Guruh va o‘qish formatini tanlaysiz."]].map(x=><div className="admission-item" key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p className="muted">{x[2]}</p></div>)}</div><button className="btn primary btn-lg" onClick={()=>openApply()}>Ariza topshirish <ArrowRight size={16}/></button></div></section>

      <section className="section" id="faq"><div className="container faq-layout"><div><div className="eyebrow">09 / FAQ</div><h2 className="h2">Ko‘p beriladigan <span className="accent">savollar.</span></h2></div><div className="faq">{faqs.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></div></section>
    </main>
    <footer className="footer"><div className="container footer-grid"><div><div className="logo">NOVA <span>ACADEMY</span></div><p>IT'dagi kelajagingiz shu yerdan boshlanadi.</p></div><div className="footer-links"><a href="#courses">Yo‘nalishlar</a><a href="#projects">Loyihalar</a><a href="#career">Karyera</a><a href="#faq">FAQ</a><button onClick={()=>openApply()}>Ariza topshirish</button></div></div><div className="container footer-bottom"><span>© 2026 Nova Academy</span><span>Learn · Build · Launch</span></div></footer>
    {selected && <CourseDetail course={selected} onClose={()=>setSelected(null)} onApply={()=>openApply(selected)}/>} {apply && <ApplicationModal onClose={()=>setApply(false)} initialCourse={selectedCourse?.title}/>} 
  </>;
}

function CourseCard({course,onClick}:{course:Course,onClick:()=>void}) { const Icon=course.icon==="shield"?ShieldCheck:course.icon==="brain"?BrainCircuit:Code2; return <button className="course-card" onClick={onClick}><div className="course-number">{course.number}</div><div className="card-icon"><Icon size={21}/></div><div className="course-body"><div className="eyebrow">NOVA PATH</div><h3>{course.title}</h3><p className="muted">{course.description}</p><div className="tags">{course.technologies.slice(0,4).map(t=><span className="tag" key={t}>{t}</span>)}</div></div><span className="course-link">Batafsil <ArrowRight size={15}/></span></button> }
