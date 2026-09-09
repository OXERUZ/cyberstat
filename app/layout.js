import "./globals.css";

export const metadata = {
  title: "CYBERSTAT — Raqamli ovoz berish tizimi",
  description: "KIBERXAVFSIZLIK MARKAZI tomonidan o‘tkazilayotgan CYBERSTAT so‘rovnomasi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
