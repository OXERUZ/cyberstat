import "./globals.css";

export const metadata = {
  title: "CYBERSTAT — Raqamli ovoz berish tizimi",
  description: "Kelajakning raqamli ovoz berish tizimi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
