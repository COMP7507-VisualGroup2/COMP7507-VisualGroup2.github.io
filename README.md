# Hong Kong Inbound Tourism Evaluation & Market Promotion Planning

COMP7507 Group 2. A static Next.js + Tailwind dashboard evaluating Hong Kong inbound tourism (Jan 2025 – 2026 YTD). Its structure follows Part C of the project proposal, plus an H2 2026 outlook. Layout and Executive summary follow the COMP7507 Group Project v3 design. A dependency-free Python pipeline processes the supplied data.

## Tabs

| Route | Tab | Contents |
| --- | --- | --- |
| `/` | Executive summary | Paired H1 2026 visitor, total expenditure and average expenditure per visitor gauges and growth charts. The first two gauges compare with half of the annual targets; the per-visitor gauge uses a dashboard target of HK$4,426. |
| `/visitor-persona/` | Region Analysis | Regional visitor and spending trends and visitor profiles |
| `/countries-analysis/` | Country Analysis | Fixed to Jan–Jun 2026 (no period filter). Four key metrics, insights and actions, origin maps, all-country comparisons and individual visitor profiles |
| `/revenue/` | Region Analysis | Alias of the Region Analysis page |
| `/outlook-2027/` | 2026 H2 Outlook | 3 strategic pillars with links to market playbooks in Country Analysis |

The legacy Mainland China Visitors, Short Haul and Reference routes remain accessible by direct URL, but are no longer dashboard tabs.

Visitor region, country / market area, visitor type and period filters are shared across filter-aware analysis tabs and persist for the browser session. Region Analysis uses the visitor region and period filters, ignoring the country / market area selection. Region Analysis restricts period selection to available 2026 months, and both Region Analysis and Country Analysis hide the visitor-type, trip-purpose and entry-channel filters. Country Analysis has no period selector: it is fixed to Jan–Jun 2026, the only range with full country data, and does not change the period shared with other tabs. In Country Analysis, all countries are selected by default; choosing a country scopes metrics, insights, actions and profiles to that market. All countries shows the selected region's aggregate where available, the origin map, and a country comparison table for the selected region and months; individual profile charts appear only after choosing a country. Arrival growth compares the selected months with the same months in 2025. The comparison table includes Vietnam and the 18 named profile markets; other origins are not shown. Country-level data not supplied is shown as unavailable, rather than replaced by regional figures. KPIs and half-year profile charts require an exact H1 selection; place comparisons require H1 2026. Mainland province charts use the supplied all-visitor shares, whose original source was not stated. Other country origin shares cover overnight visitors. Where both periods are available, maps show the change in share in percentage points (H1 2026 minus 2025 full year), not growth in visitor counts; the periods differ in length and country shares are rounded. Shares reported as less than 0.5% do not have a calculated change. New means absent from a complete supplied prior list, not necessarily a new origin. Singapore is mapped without a city breakdown; its side panel shows H1 2026 all-visitor arrivals and growth versus H1 2025. Japan's regions, Bali, Middle East countries and Russian federal districts use administrative boundaries. On other filter-aware pages trip-purpose and entry-channel selections only add context notes.

For H1 2026, the Country Analysis comparison table calculates arrivals YoY from the 2026 and 2025 H1 nationality workbook Table 4 totals. For other selections it compares the corresponding monthly arrivals where available. Overnight share uses the supplied profile where available; otherwise it is calculated from HKTB nationality workbook counts for the selected half-year. Other periods show N/A. Insights show up to three paired, data-driven actions, including origin diversification when origin data is available.

The Region Analysis review displays monthly visitor arrivals and quarterly spending in stacked bars, with a choice of percentage or numerical labels; average spending per visitor is shown quarterly. The spending views include the full 2025 history alongside selected complete 2026 quarters. Numerical labels include a total for the displayed regions. The side summary shows the selected period's total and year-on-year change, or the weighted average and its change for spending per visitor; it does not include the additional 2025 history. Spending measures use complete quarters only; incomplete or missing comparisons are unavailable. The Visitor Region filter selects the displayed series and profile; All regions shows the all-market profile. The insights and suggested actions at the top use the selected region and complete quarters within the selected period; average expenditure is total expenditure divided by total arrivals. Quarter-on-quarter changes appear only when two consecutive quarters are available. Market-level views classify the Middle East within the long-haul market area.

The region profile uses HKTB nationality workbook data for age and visitor-type pies. Age counts are recovered from the workbook's unrounded percentages and arrivals and checked against the totals. First-time/repeat shares are survey percentages; counts are not supplied. Where the selected region lacks an H1 2026 share, the first-time pie uses the 2025 full-year profile. The short-haul H1 2026 first-time share is user-provided without a stated source or visitor type. Region Analysis also shows spending-category comparisons and shopping categories for the selected region. Country age, visitor type, first-time shares, overnight purpose and average stay compare H1 2025, H2 2025 and H1 2026 when available. Country age profiles display supplied rounded percentages without rescaling. Full-year values are not substituted for missing half-year values. Country visitor-type charts show percentages only, using supplied same-day shares or, where unavailable, shares calculated from counts. Overnight-purpose percentages are estimates obtained by normalizing the five supplied overnight-purpose shares. Country Analysis also shows travel companions and place rankings; unknown prior ranks are marked unavailable.

Short Haul compares H1 2026 with H1 2025. Its same-day spend per visitor divides TEAIT same-day expenditure across short-haul market areas by their same-day arrivals (total arrivals minus overnight visitors); the short-haul overnight spending and length-of-stay figures come from the HKTB visitor profile. Vietnam arrivals are separately reported in the nationality workbook but no Vietnam visitor profile is supplied. The displayed markets do not cover every origin included in the short-haul segment.

The Short Haul market selector applies to sections 1–3; the overview and H2 actions remain short-haul-wide. The profile charts show visitor type, top origins and first-time versus repeat visitors where available. The overall short-haul first-time share was user-provided without a stated original source or visitor type; market-level first-time figures cover overnight visitors. Country-level expenditure categories are not supplied. The segment expenditure comparison covers overnight visitors, and place rankings compare 2025 full year with H1 2026.

The executive summary and reference charts use fixed periods and do not respond to those filters. Average total expenditure per visitor uses all arrivals and includes international passenger transport. The H1 gauge and year-on-year comparison use the supplied H1 expenditure totals; quarterly bars and quarter-on-quarter growth use rounded quarterly totals, including estimated 2025 Q1 and Q2 spending. The reference source-region chart covers Mainland China, short-haul and long-haul markets. Region Analysis insights use quarterly regional spending excluding international passenger transport, derived by subtracting cumulative TEAIT market-area spending.

## Data sources (`data/`)

| Dataset | File |
| --- | --- |
| HKTB Tourism Expenditure Associated to Inbound Tourism (Jan–Jun 2025 / 2026): spending by visitor type, market area and category | `Inbound tourism expediture 06 2026.xls` (TEAIT releases `TEAIT *.xls` kept for reference) |
| Quarterly spend per overnight visitor and market-area overnight visitors | `Average spend per overnight visitors.xlsx` |
| Quarterly visitor-type spending (derived from cumulative TEAIT expenditure and per-capita values) | `TEAIT 03 2025.xls`, `TEAIT 06 2025.xls`, `TEAIT 09 2025.xls`, `TEAIT 12 2025_R.xls`, `TEAIT 03 2026.xls`, `TEAIT 06 2026.xls` |
| HKTB visitor arrival statistics by nationality (Jan–Jun 2025 / 2026) | `*all countries visitor type.xlsx`, `visitor_type_h1.csv` |
| Monthly arrivals by region, monthly length of stay | `Visitor arrivals by nationalityregion.csv`, `Lenght of stay.csv` (supplied with v3) |
| 2025 / 2026 government targets | `2025 KPI.csv`, `2026 KPI.csv` |
| Country profile updates | `manual/visitor_profile.csv` (user-provided; original source not stated) |
| Historical visitor profiles | `manual/visitor_profile_baseline.csv` (previous dataset; source recorded per row where known) |
| Mainland origin provinces | `manual/mainland_origin_provinces.csv` (user-provided; original source not stated) |
| Mainland province boundaries | `china_provinces_natural_earth.json` (China subset of Natural Earth 1:50m admin-1 boundaries; public domain, https://www.naturalearthdata.com/) |
| Country origin locations and administrative boundaries | `country_origin_cities_natural_earth.json`, `australia_states_natural_earth.json`, `country_origin_regions_natural_earth.json` (selected Natural Earth populated places and 1:10m / 1:50m admin-1 boundaries; public domain; Guildford, Mississauga and Richmond BC are not in Natural Earth and use their published coordinates; state-level USA origins are plotted at a representative city, https://www.naturalearthdata.com/) |
| Hong Kong administrative districts | `hksar_18_district_boundary.json` (Home Affairs Department; district heatmap colors each district by its best-ranked named top-10 place, not visitor counts) |

hart appears with a **Manual input** badge:

`hotel_occupancy_monthly.csv`, `arrival_targets.csv`.

### Supplying missing country data

- Add published standalone age counts to `data/manual/country_age_quarterly.csv`, with columns `period,market,age_group,count,source`. Use `2025-Q1` through `2025-Q4` or `2026-Q1` / `2026-Q2`, the exact market name used in `visitor_profile.csv`, and one non-negative integer count for each age group: `0-15`, `16-25`, `26-35`, `36-45`, `46-55`, `56-65`, `66+`. Each row needs its source. A half-year is shown only when both constituent quarters are complete. The supplied reports and workbooks do not provide these standalone country-quarter counts.
- Edit `data/manual/visitor_profile.csv` using `period,market,dimension,category,value`. Standard five-column CSV and the current quoted single-column CSV format are supported. Use `2025 H1`, `2025 H2`, `2026 H1` or `2025 Full Year`, and the market names already in the file (including `Chinese Mainland`). Supported dimensions are `age_group`, `first_timer_pct`, `mean_age`, `avg_nights`, `per_capita_overnight_hkd`, `trip_purpose`, `companion`, `origin_region` and `place_rank`. Age groups use the seven labels above; age percentages must form a complete rounded set. `first_timer_pct`, `avg_nights` and spending describe overnight visitors.
- Each `trip_purpose` set must include the six all-visitor percentages `Sameday visitors`, `Vacation`, `Visiting friends / relatives`, `Business`, `En-route` and `Others`. The first gives the same-day share; the other five are normalized to estimate the distribution among overnight visitors, so estimates may differ from the original unrounded figures.
- Updates replace the entire matching period, market and dimension in `data/manual/visitor_profile_baseline.csv`; all other historical and aggregate rows remain. Do not remove the baseline file. The updated input does not record sources, so its original source is described as unstated; the baseline records original sources only where recoverable.
- Rebuild the generated data after editing either input: `python scripts/process_tourism_data.py` on Windows, or `python3 scripts/process_tourism_data.py` where `python3` is available.

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
