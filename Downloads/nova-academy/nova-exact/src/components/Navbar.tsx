"use client";
import { Menu, X, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function Navbar({ onApply }: { onApply: () => void }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    fn(); window.addEventListener("scroll", fn); return () => window.removeEventListener("scroll", fn);
  }, []);
  const links = [["Bosh sahifa","hero"],["Kurslar","courses"],["Nega Nova?","why"],["Loyihalar","projects"],["Jarayon","system"],["FAQ","faq"]];
  return <header className={`nav ${scrolled ? "scrolled":""}`}>
    <div className="container nav-inner">
      <a className="logo nav-logo" href="#hero"><img src="/projects/nova-academy-mark.jpg" alt="Nova Academy"/><span>NOVA <b>ACADEMY</b></span></a>
      <nav className={`nav-links ${open ? "open":""}`}>
        {links.map(([label,id]) => <a key={id} href={`#${id}`} onClick={()=>setOpen(false)}>{label}</a>)}
        <button className="nav-theme" aria-label="Mavzuni almashtirish"><Sun size={19}/></button><a className="platform-login" href="/login" onClick={()=>setOpen(false)}>LOGIN</a>
      </nav>
      <button className="menu" aria-label="Menyu" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
    </div>
  </header>;
}
