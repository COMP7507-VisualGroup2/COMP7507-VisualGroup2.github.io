# AGENTS.md

## Environment
- Node 20 is installed locally at `~/.local/node` (Homebrew isn't writable on this machine): `export PATH=~/.local/node/bin:$PATH`.
- The Python pipeline uses only the standard library (system `python3` 3.9 works).
- Windows machine: Python 3.12 is installed per-user at `%LOCALAPPDATA%\Programs\Python\Python312\python.exe` (`python3` on PATH is only the Microsoft Store alias). Port 3000 may already be taken, so `npm run dev` can fall back to 3001.

## Commands
- Rebuild data: `python3 scripts/process_tourism_data.py` (reads `data/` only; no live fetching)
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build (static export to `out/`): `npm run build`
- Preview build: `python3 -m http.server 4173 -d out`

## Conventions
- **Published data only.** Never add made-up or "indicative" figures; inputs without a machine-readable file go in `data/manual/*.csv`.
- JSON in `public/data/` (`summary.json`, `visitor_demographics.json`, `strategy_2027.json`) is generated; edit the pipeline, not the JSON. No C&SD API, ImmD or CSTB data and no live fetching (removed by request); the Executive summary uses the files supplied with COMP7507 Group Project v3 (TEAIT `.xls` read by the pipeline's built-in BIFF reader).
- Visitor Persona uses HKTB published data: `data/manual/visitor_profile.csv` (long format `period,market,dimension,category,value,source`, transcribed from the Visitor Profile Report PDFs 2025 FY / 2026 H1; `*` = <0.5% stored as 0.4) and the HKTB nationality workbooks `data/*all countries visitor type.xlsx` (parsed by the pipeline; must be committed for CI). Helpers live in `lib/persona.ts`.
- 2027 Outlook market playbooks: initiative text and KPI specs are in `MARKET_PLAYBOOKS` in the pipeline; `build_market_playbooks` computes baselines from the HKTB data and applies the proposed change to set each 2027 target. UI: `components/MarketPlaybooks.tsx` + `components/StrategyPillars.tsx`. Pillar rationale/KPIs are computed in `build_pillars` from the HKTB/TEAIT data (the C&SD forecast model was removed).
- Layout copies COMP7507 Group Project v3: `/` Executive summary, `/visitor-persona/`, `/revenue/`, `/outlook-2027/` (the Methodology page was removed by request). Tab views live in `components/tabs/`; the v3 sidebar (nav + filters), topbar and page heading are in `components/AppShell.tsx` (filters in `lib/filters-context.tsx`, notes in `lib/filters.ts`). v3 styles are ported verbatim to `app/v3.css`; the Executive summary in `components/tabs/SummaryTab.tsx` ports v3's `dashboard.js` overview logic.
- Look: v3 navy shell (#0a2540, red rule #de2910, green/red growth colours) from `app/v3.css`; charts keep the teal/amber series palette (`lib/theme.ts`).
- Dependencies are pinned to exact versions released at least 7 days before adding them.
- `NEXT_PUBLIC_BASE_PATH` controls the GitHub Pages base path (empty for a root site).
