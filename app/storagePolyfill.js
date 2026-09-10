"use client";

/*
  MUHIM: Original komponent Claude Artifacts muhitidagi window.storage API'siga
  mo'ljallangan (Claude.ai ichida ishlaydigan demo xotira). Oddiy brauzerda va
  Vercel'da bunday API mavjud emas, shuning uchun quyida shu API'ni localStorage
  yordamida taqlid qiluvchi (polyfill) mini-versiyasi yaratildi.

  DIQQAT — CHEKLOV: localStorage faqat foydalanuvchining o'z brauzerida saqlanadi.
  Demak, har bir tashrif buyuruvchi o'zining alohida "ovoz bazasi"ni ko'radi —
  ovozlar barcha foydalanuvchilar orasida umumiy (real-time, hammaga bir xil)
  bo'lmaydi. Bu faqat DIZAYNNI tezda Vercel'da ko'rish va sinash uchun mo'ljallangan.

  Haqiqiy, ko'p foydalanuvchili tizim uchun (loyihaning 17-bandida ko'rsatilganidek)
  Supabase (yoki Vercel Postgres/KV) ulanishi va bu polyfill o'rniga haqiqiy
  API route'lar (masalan /api/vote, /api/candidates) yozilishi kerak.
*/
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key, shared) {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        throw new Error("key not found: " + key);
      }
      return { key, value: raw, shared: !!shared };
    },
    async set(key, value, shared) {
      window.localStorage.setItem(key, value);
      return { key, value, shared: !!shared };
    },
    async delete(key, shared) {
      window.localStorage.removeItem(key);
      return { key, deleted: true, shared: !!shared };
    },
    async list(prefix, shared) {
      const keys = Object.keys(window.localStorage).filter(
        (k) => !prefix || k.startsWith(prefix)
      );
      return { keys, prefix, shared: !!shared };
    },
  };
}
