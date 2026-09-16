"use client";
import { X } from "lucide-react";
import type { Course } from "@/types";

export default function CourseDetail({course,onClose,onApply}:{course:Course,onClose:()=>void,onApply:()=>void}) {
 return <div className="modal-backdrop"><div className="modal">
  <div className="modal-head"><div><div className="eyebrow">{course.number} / Yo‘nalish</div><h2 className="h2" style={{fontSize:42}}>{course.title}</h2><p className="muted">{course.description}</p></div><button className="close" onClick={onClose}><X size={18}/></button></div>
  <div className="detail-list">
    <div><span className="muted">Boshlang‘ich daraja</span><br/><b>{course.details.level}</b></div>
    <div><span className="muted">Davomiyligi</span><br/><b>{course.details.duration}</b></div>
    <div><span className="muted">Format</span><br/><b>{course.details.format}</b></div>
    <div><span className="muted">Kimlar uchun</span><br/><b>{course.details.who}</b></div>
  </div>
  <h3>Haqida</h3><p className="muted">{course.details.about}</p>
  <h3>Nimalar o‘rganiladi?</h3><div className="tags">{course.details.learning.map(x=><span className="tag" key={x}>{x}</span>)}</div>
  <h3>Amaliy loyihalar</h3><div className="tags">{course.details.projects.map(x=><span className="tag" key={x}>{x}</span>)}</div>
  <h3>Karyera imkoniyatlari</h3><div className="tags">{course.details.career.map(x=><span className="tag" key={x}>{x}</span>)}</div>
  <button className="btn primary" style={{marginTop:20}} onClick={onApply}>Ushbu kursga ariza berish →</button>
 </div></div>
}
