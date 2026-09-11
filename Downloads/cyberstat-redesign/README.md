# CYBERSTAT — Digital Competition Arena

Professional cyber competition frontend prototype for FINAL 2.

## Finalists

1. NOVA GUARD — XOSHIMOV XOSHIMXON — VIP NOMINANT
2. VANGUARD-X — JULIYEV MUHAMMAD
3. AEGIS PRO — NAZAROVA NILUFAR

## FINAL 2 task control

Each finalist has 10 task stars. The prototype includes an ADMIN mode where task stars can be toggled. This is currently local frontend state only; connect these actions to Supabase RPC/database before production so only authenticated admins can change task completion.

## Run

```bash
npm install
npm run build
npm run dev
```

Open http://localhost:3000

No Tailwind CSS dependency or PostCSS Tailwind plugin is required. The interface uses the included CSS file.
