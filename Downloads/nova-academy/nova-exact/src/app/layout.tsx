import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOVA ACADEMY — IT Akademiyasi | Dasturlash, AI va Kiberxavfsizlik",
  description: "NOVA ACADEMY — dasturlash, sun’iy intellekt va professional kiberxavfsizlik bo‘yicha zamonaviy IT akademiyasi.",
  openGraph: {
    title: "NOVA ACADEMY — IT Akademiyasi",
    description: "Dasturlash, AI va professional kiberxavfsizlik.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="uz"><body>{children}</body></html>;
}
