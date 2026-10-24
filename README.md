# Hong Kong Inbound Tourism Evaluation & Market Promotion Planning

COMP7507 Group 2. A static Next.js + Tailwind dashboard evaluating Hong Kong inbound tourism (Jan 2025 – 2026 YTD). Its structure follows Part C of the project proposal, plus a 2027 outlook. Data comes from a dependency-free Python pipeline that uses **official open data only**, and the site deploys to GitHub Pages.

## Tabs

| Route | Tab | Contents |
| --- | --- | --- |
| `/` | 1. Summary (KPI tracking & consolidation) | KPI cards (arrivals, length of stay, per-capita spend, hotel sector, tourism share of GDP/jobs), bullet graph vs prior year / 2019 / target, YoY lines, sector revenue (BRI), takeaways |
| `/visitor-persona/` | 2. Visitor Persona | Choropleth world map, origin mix, ports of entry (HSR vs air vs land vs sea), overnight vs same-day + length of stay, trip purpose / age / sentiment (pending) |
| `/revenue/` | 3. Revenue Analysis | Per-capita spend by market, high-yield vs volume scatter, value added by category, hotel supply & accommodation receipts, BRI heatmap |
| `/competitors/` | 4. Competitor Analysis | HK vs Singapore vs Japan recovery / arrivals / share, receipts benchmark, value-added treemap & employment scatter |
| `/outlook-2027/` | 5. 2027 Outlook | Seasonal-trend forecast with scenarios + 3 strategic pillars |
| `/methodology/` | Methodology | Sources, formulas, forecast model, data-pending list |

The global filters (granularity, date range, origin, visitor type) are shared across tabs and persist for the browser session.

## Data sources (all live, snapshotted to `data/raw/`)

| Dataset | Source |
| --- | --- |
| Visitor arrivals by region (monthly) | C&SD 650-80001 |
| Visitor spending & per-capita spend by market | C&SD 650-80003 / 650-80004 |
| Overnight vs same-day, length of stay | C&SD 650-80005 |
| Business Receipts Indices | C&SD 660-69001 / 660-69002 |
| Tourism value added & employment by sub-industry | C&SD 655-82101 |
| Visitor entries by control point | DATA.GOV.HK / Immigration Department |
| Hotel room supply | DATA.GOV.HK / CSTB |
| HKD exchange rates | HKMA API |
| Singapore arrivals & tourism receipts | SingStat (Singapore Tourism Board) |
| Japan arrivals | JNTO monthly workbook |
| 2019 arrivals & receipts baselines | World Bank (UN Tourism data) |

### Data pending (`data/manual/`)

These proposal items have no open data. Each has a CSV template; fill it from the published report, re-run the pipeline, and the chart appears with a **Manual input** badge:

`hotel_occupancy_monthly.csv`, `arrival_targets.csv`, `thailand_arrivals_monthly.csv`, `un_tourism_apac_monthly.csv`, `visitor_profile.csv` (trip purpose / age), `attraction_sentiment.csv`.

## Palette

Hong Kong Tourism branding: Victoria Harbour Teal `#005F73` / `#0A9396`, crisp slate-white backgrounds, festive accents `#CA6702` / `#EE9B00` (see `tailwind.config.ts`, `lib/theme.ts`).

## Local development

Requires Python ≥ 3.8 (standard library only) and Node.js 20.

```bash
python3 scripts/process_tourism_data.py            # refresh JSON (live, snapshot fallback)
python3 scripts/process_tourism_data.py --offline  # data/raw snapshots only
npm install
npm run dev        # http://localhost:3000
npm run build      # static export to out/
```

## Deploying to GitHub Pages

1. Push to `main` of a `<user>.github.io` repository (root site, no base path).
2. **Settings → Pages → Source = GitHub Actions**.
3. For a project site (`<user>.github.io/<repo>`), add the repository variable `BASE_PATH=/<repo>`.

The workflow re-runs the pipeline on every push, every Monday and on manual dispatch.
