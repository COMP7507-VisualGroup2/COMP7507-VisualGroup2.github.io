# Hong Kong Inbound Tourism Evaluation & Market Promotion Planning

COMP7507 Group 2. A static Next.js + Tailwind dashboard evaluating Hong Kong inbound tourism (Jan 2025 – 2026 YTD). Its structure follows Part C of the project proposal, plus a 2027 outlook. Layout and Executive summary follow the COMP7507 Group Project v3 design. Data comes from a dependency-free Python pipeline that## Tabs

| Route | Tab | Contents |
| --- | --- | --- |
| `/` | Executive summary | v3 KPI gauges against the 2025 / 2026 government targets (visitors, expenditure, average stay, spend per overnight visitor); inbound visitor growth, revenue growth, average stay and quarterly overnight spend charts; source-market movers |
| `/visitor-persona/` | Visitor Persona | Zoomable map and monthly mix of the 18 HKTB source markets, then the HKTB visitor profile (2025 / H1 2026): market personas, age, companions, trip purpose, stay pattern, multi-destination trips, spending mix and shopping, market yield map, satisfaction and top places |
| `/revenue/` | Revenue Analysis | H1 tourism expenditure KPIs, per-capita spend by TEAIT market area, high-yield vs volume scatter, estimated overnight spend by source market (share vs visitors, volume vs yield), overnight spending by category |
| `/outlook-2027/` | 2027 Outlook | 3 strategic pillars (with lead markets) + a playbook for each of the 18 HKTB source markets, plus a pillar coverage matrix |

The v3 sidebar filters (visitor market, country / market area, visitor type, Jan 2025 – Jun 2026 period, trip purpose, entry channel) are shared across tabs and persist for the browser session. As in v3, trip purpose and entry channel only add context notes.

## Data sources (`data/`)

| Dataset | File |
| --- | --- |
| HKTB Tourism Expenditure Associated to Inbound Tourism (Jan–Jun 2025 / 2026): spending by visitor type, market area and category | `Inbound tourism expediture 06 2026.xls` (TEAIT releases `TEAIT *.xls` kept for reference) |
| Quarterly spend per overnight visitor and market-area overnight visitors | `Average spend per overnight visitors.xlsx` |
| HKTB visitor arrival statistics by nationality (Jan–Jun 2025 / 2026) | `*all countries visitor type.xlsx`, `visitor_type_h1.csv` |
| Monthly arrivals by region, monthly length of stay | `Visitor arrivals by nationalityregion.csv`, `Lenght of stay.csv` (supplied with v3) |
| 2025 / 2026 government targets | `2025 KPI.csv`, `2026 KPI.csv` |
| HKTB Visitor Profile Report 2025 FY / 2026 H1 | `manual/visitor_profile.csv` (transcribed from the PDFs) |

hart appears with a **Manual input** badge:

`hotel_occupancy_monthly.csv`, `arrival_targets.csv`.

## Palette

v3 look: navy sidebar and headings `#0a2540`, red accent rule `#de2910`, green / red growth colours (`app/v3.css`); charts keep the teal / amber series palette (`lib/theme.ts`).

## Local development

Requires Python ≥ 3.8 (standard library only) and Node.js 20.

```bash
python3 scripts/process_tourism_data.py   # rebuild public/data/*.json from data/
npm install
npm run dev        # http://localhost:3000
npm run build      # static export to out/
```

## Deploying to GitHub Pages

1. Push to `main` of a `<user>.github.io` repository (root site, no base path).
2. **Settings → Pages → Source = GitHub Actions**.
3. For a project site (`<user>.github.io/<repo>`), add the repository variable `BASE_PATH=/<repo>`.

The workflow rebuilds the JSON from `data/` and redeploys on every push and on manual dispatch.
