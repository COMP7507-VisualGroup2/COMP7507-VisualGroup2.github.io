# Hong Kong Inbound Tourism Evaluation & Market Promotion Planning

COMP7507 Group 2. A static Next.js + Tailwind dashboard evaluating Hong Kong inbound tourism (Jan 2025 – 2026 YTD). Its structure follows Part C of the project proposal, plus a 2027 outlook. Data comes from a dependency-free Python pipeline that uses **official open data only**, and the site deploys to GitHub Pages.

## Tabs

| Route | Tab | Contents |
| --- | --- | --- |
| `/` | 1. Summary (KPI tracking & consolidation) | KPI cards (arrivals, length of stay, per-capita spend, hotel sector, tourism share of GDP/jobs), bullet graph vs prior year / 2019 / target, YoY lines, sector revenue (BRI), source-market movers and concentration (HKTB), takeaways |
| `/visitor-persona/` | 2. Visitor Persona | Choropleth world map, origin mix (segments or 18 HKTB markets), ports of entry (HSR vs air vs land vs sea), overnight vs same-day + length of stay, then an HKTB visitor profile (2025 / H1 2026): age, companions, trip purpose, stay pattern, multi-destination trips, spending mix and shopping basket, market yield map, satisfaction, top places, and a persona card for each of 18 source markets |
| `/revenue/` | 3. Revenue Analysis | Per-capita spend by market, high-yield vs volume scatter, value added by category, estimated overnight spend by source market (share vs visitors, volume vs yield, spend by category), hotel supply & accommodation receipts, BRI heatmap |
| `/outlook-2027/` | 5. 2027 Outlook | 3 strategic pillars (with lead markets) + a playbook for each of the 18 HKTB source markets: key initiatives and 2027 KPI targets against Jan–Jun 2026 baselines, plus a pillar coverage matrix |
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

### HKTB published data (Visitor Persona, **Manual input** badge)

| Dataset | Source |
| --- | --- |
| Visitor profile: age, companions, trip purpose, nights, spending mix, shopping, satisfaction, places visited (segments + 18 markets) | HKTB Visitor Profile Report 2025 FY / 2026 H1 (PDF) → `data/manual/visitor_profile.csv` |
| Monthly arrivals, same-day / overnight split, gender and age by nationality (Jan–Jun 2025, Jan–Jun 2026) | HKTB visitor arrival statistics workbooks → `data/*all countries visitor type.xlsx` (parsed by the pipeline) |

### Data pending (`data/manual/`)

These proposal items have no open data. Each has a CSV template; fill it from the published report, re-run the pipeline, and the chart appears with a **Manual input** badge:

`hotel_occupancy_monthly.csv`, `arrival_targets.csv`.

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
