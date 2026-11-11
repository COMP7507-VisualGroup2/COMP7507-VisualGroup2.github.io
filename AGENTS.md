# AGENTS.md

## Environment
- Node 20 is installed locally at `~/.local/node` (Homebrew isn't writable on this machine): `export PATH=~/.local/node/bin:$PATH`.
- The Python pipeline uses only the standard library (system `python3` 3.9 works).
- Windows machine: Python 3.12 is installed per-user at `%LOCALAPPDATA%\Programs\Python\Python312\python.exe` (`python3` on PATH is only the Microsoft Store alias). Port 3000 may already be taken, so `npm run dev` can fall back to 3001.

## Commands
- Refresh data: `python3 scripts/process_tourism_data.py` (or `--offline`)
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build (static export to `out/`): `npm run build`
- Preview build: `python3 -m http.server 4173 -d out`

## Conventions
- **Official open data only.** Never add made-up or "indicative" figures. Items without an open source go in `data/manual/*.csv` (empty templates) and render as "Data pending".
- JSON in `public/data/` is generated; edit the pipeline, not the JSON. `data/raw/` holds snapshots of live fetches.
- Visitor Persona uses HKTB published data: `data/manual/visitor_profile.csv` (long format `period,market,dimension,category,value,source`, transcribed from the Visitor Profile Report PDFs 2025 FY / 2026 H1; `*` = <0.5% stored as 0.4) and the HKTB nationality workbooks `data/*all countries visitor type.xlsx` (parsed by the pipeline; must be committed for CI). Helpers live in `lib/persona.ts`.
- 2027 Outlook market playbooks: initiative text and KPI specs are in `MARKET_PLAYBOOKS` in the pipeline; `build_market_playbooks` computes baselines from the HKTB data and applies the proposed change to set each 2027 target. UI: `components/MarketPlaybooks.tsx` + `components/StrategyPillars.tsx`. The forecast model still runs (Summary takeaway, Methodology) but `ForecastChart` is no longer shown.
- Tabs follow Part C of the proposal: `/` Summary, `/visitor-persona/`, `/revenue/`, plus `/outlook-2027/` and `/methodology/`. Each tab view lives in `components/tabs/`; the shared header, tab nav and filters are in `components/AppShell.tsx` (filters in `lib/filters-context.tsx`).
- Palette: Victoria Harbour Teal #005F73 / #0A9396 (`brand-*`), festive #CA6702 / #EE9B00 (`accent-*`), slate-white backgrounds (`tailwind.config.ts`, `lib/theme.ts`).
- Dependencies are pinned to exact versions released at least 7 days before adding them.
- `NEXT_PUBLIC_BASE_PATH` controls the GitHub Pages base path (empty for a root site).
