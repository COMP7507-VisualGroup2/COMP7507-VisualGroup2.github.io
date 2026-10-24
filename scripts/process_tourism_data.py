#!/usr/bin/env python3
"""Hong Kong Inbound Tourism Evaluation - data pipeline.

Fetches, cleans and aggregates Hong Kong tourism data (Jan 2025 - 2026 YTD) plus
regional competitor benchmarks, and writes static JSON files consumed by the
Next.js dashboard (Summary / Visitor Persona / Revenue / Competitor / 2027 Outlook).

Only official, openly published data is used:

* C&SD web-table API - visitor arrivals by region (650-80001), visitor spending
  (650-80003 / 650-80004), length of stay (650-80005), Business Receipts Indices
  (660-69001 / 660-69002) and value added & employment of Tourism (655-82101).
* DATA.GOV.HK - Immigration Department daily passenger traffic by control point;
  Culture, Sports and Tourism Bureau hotel room supply.
* HKMA API - monthly HKD exchange rates (for converting competitor receipts).
* SingStat Table Builder API (Singapore Tourism Board) - visitor arrivals, receipts.
* JNTO (Japan National Tourism Organization) - monthly visitor arrivals workbook.
* World Bank API (UN Tourism-sourced) - 2019 arrivals & receipts baselines.

Datasets with no open API (hotel occupancy/ADR, government arrival targets,
Thailand monthly arrivals, UN Tourism Asia-Pacific trend, trip purpose / age
profile, attraction sentiment) are read from optional CSVs in data/manual/.
When a manual file is empty the dashboard shows the item as "data pending".

Every successful live fetch is normalised and written back to data/raw/ so the
--offline mode always reproduces the latest known data.

Usage
-----
    python3 scripts/process_tourism_data.py            # live with snapshot fallback
    python3 scripts/process_tourism_data.py --offline  # snapshot CSVs only

Only the Python standard library is used (Python >= 3.8).
"""

import argparse
import csv
import io
import json
import logging
import math
import re
import statistics
import urllib.request
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
MANUAL_DIR = ROOT / "data" / "manual"
DEFAULT_OUT = ROOT / "public" / "data"

SCOPE_START = "2025-01"
BASELINE_YEARS = ("2019", "2024")
FORECAST_YEAR = 2027

CSD_API = "https://www.censtatd.gov.hk/api/get.php?id={table}&lang=en&full_series=1"
CSD_TABLE_PAGE = "https://www.censtatd.gov.hk/en/web_table.html?id={table}"
IMMD_CSV = (
    "https://www.immd.gov.hk/opendata/eng/transport/immigration_clearance/"
    "statistics_on_daily_passenger_traffic.csv"
)
CSTB_ROOMS_CSV = "https://www.tourism.gov.hk/datagovhk/hotelrooms/number_of_hotel_rooms_next_three_years_en.csv"
HKMA_FX = (
    "https://api.hkma.gov.hk/public/market-data-and-statistics/monthly-statistical-bulletin/"
    "er-ir/er-eeri-endperiod?segment=hkd&pagesize=1000&from=2019-01&sortby=end_of_month&sortorder=asc"
)
SINGSTAT_API = "https://tablebuilder.singstat.gov.sg/api/table/tabledata/{table}"
SINGSTAT_PAGE = "https://tablebuilder.singstat.gov.sg/table/TS/{table}"
JNTO_PAGE = "https://www.jnto.go.jp/statistics/data/visitors-statistics/"
WORLD_BANK_API = "https://api.worldbank.org/v2/country/{codes}/indicator/{ind}?format=json&date=2019&per_page=100"
HTTP_TIMEOUT = 60
USER_AGENT = "Mozilla/5.0 (compatible; hk-tourism-dashboard/2.0)"

ORIGINS = ["Mainland", "Short-haul", "Long-haul", "Emerging"]
VISITOR_TYPES = ["Overnight", "Same-day"]
PORTS = ["HKIA Airport", "West Kowloon HSR", "HZMB", "Land Control Points", "Ferries & Cruise"]

# C&SD 650-80001 region code -> dashboard origin segment
REGION_GROUP = {
    "CN": "Mainland",
    "MA": "Short-haul", "TW": "Short-haul", "NA": "Short-haul", "SA": "Short-haul",
    "AU": "Long-haul", "AM": "Long-haul", "EU": "Long-haul",
    "ME": "Emerging", "AF": "Emerging", "NI": "Emerging",
}
REGION_LABEL = {
    "CN": "Chinese Mainland", "MA": "Macao", "TW": "Taiwan", "NA": "North Asia",
    "SA": "South & Southeast Asia", "AU": "Australia, NZ & South Pacific",
    "AM": "The Americas", "EU": "Europe", "ME": "Middle East", "AF": "Africa",
    "NI": "Not identified",
}
# C&SD 650-80003/4 spending region -> 650-80001 region codes it covers
SPEND_REGION_CODES = {
    "Chinese Mainland": ["CN"],
    "Macao": ["MA"],
    "Taiwan": ["TW"],
    "North Asia": ["NA"],
    "South and Southeast Asia": ["SA"],
    "Australia, New Zealand and South Pacific": ["AU"],
    "The Americas": ["AM"],
    "Europe, Africa and the Middle East": ["EU", "AF", "ME", "NI"],
}
SPEND_REGION_LABEL = {
    "Chinese Mainland": "Chinese Mainland", "Macao": "Macao", "Taiwan": "Taiwan", "North Asia": "North Asia",
    "South and Southeast Asia": "South & SE Asia", "Australia, New Zealand and South Pacific": "Australia, NZ & S. Pacific",
    "The Americas": "The Americas", "Europe, Africa and the Middle East": "Europe, Africa & Middle East",
}
# ImmD control point -> port-of-entry group
PORT_GROUP = {
    "Airport": "HKIA Airport",
    "Express Rail Link West Kowloon": "West Kowloon HSR",
    "Hong Kong-Zhuhai-Macao Bridge": "HZMB",
    "China Ferry Terminal": "Ferries & Cruise",
    "Macao Ferry Terminal": "Ferries & Cruise",
    "Macau Ferry Terminal": "Ferries & Cruise",
    "Tuen Mun Ferry Terminal": "Ferries & Cruise",
    "Kai Tak Cruise Terminal": "Ferries & Cruise",
    "Harbour Control": "Ferries & Cruise",
}  # every other control point (Lo Wu, Shenzhen Bay, Heung Yuen Wai, ...) -> Land Control Points
BRI_INDUSTRIES = [
    "Tourism, convention and exhibition services",
    "Accommodation services",
    "Food services",
    "Retail",
    "Air transport",
    "Land transport",
]
# C&SD 655-82101 Tourism codes -> (label, group)
TOURISM_INDUSTRIES = {
    "ind_KEY_IND_2": ("Tourism (total)", "Total"),
    "ind_KEY_IND_2A": ("Inbound tourism", "Inbound"),
    "ind_KEY_IND_2A1": ("Retail trade", "Inbound"),
    "ind_KEY_IND_2A2": ("Accommodation services", "Inbound"),
    "ind_KEY_IND_2A3": ("Food & beverage services", "Inbound"),
    "ind_KEY_IND_2A4": ("Cross-boundary passenger transport (inbound)", "Inbound"),
    "ind_KEY_IND_2A5": ("Other inbound services", "Inbound"),
    "ind_KEY_IND_2B": ("Outbound tourism", "Outbound"),
    "ind_KEY_IND_2B1": ("Travel agencies & reservation services", "Outbound"),
    "ind_KEY_IND_2B2": ("Cross-boundary passenger transport (outbound)", "Outbound"),
}
INDUSTRY_MEASURES = {
    "HK$ million": "value_added_hkd_m",
    "% share in GDP": "va_share_gdp_pct",
    "Number": "employment",
    "% share in total employment": "emp_share_pct",
}
PEERS = [
    {"code": "HK", "name": "Hong Kong", "wb": "HKG", "currency": "HKD"},
    {"code": "SG", "name": "Singapore", "wb": "SGP", "currency": "SGD"},
    {"code": "JP", "name": "Japan", "wb": "JPN", "currency": "JPY"},
    {"code": "TH", "name": "Thailand", "wb": "THA", "currency": "THB"},
]
WB_EXTRA = [{"code": "MO", "name": "Macao", "wb": "MAC"}, {"code": "KR", "name": "South Korea", "wb": "KOR"}]

# Optional manual inputs: filename -> (columns, dashboard tab, description, where to obtain)
MANUAL_INPUTS = {
    "hotel_occupancy_monthly.csv": (
        ["month", "occupancy_pct", "adr_hkd", "source"], "Summary / Revenue",
        "Hotel room occupancy rate & average achieved room rate",
        "HKTB Hotel Room Occupancy Report (partnernet.hktb.com) - no open API"),
    "arrival_targets.csv": (
        ["year", "target_arrivals", "source"], "Summary",
        "Official annual visitor arrival targets (bullet graph target marker)",
        "HKSAR Budget / HKTB work plan - published as text only"),
    "thailand_arrivals_monthly.csv": (
        ["month", "arrivals", "source"], "Competitor Analysis",
        "Thailand monthly international arrivals",
        "Ministry of Tourism and Sports, Thailand (mots.go.th) - no machine-readable API"),
    "un_tourism_apac_monthly.csv": (
        ["month", "apac_recovery_pct", "source"], "Competitor Analysis",
        "UN Tourism Asia & the Pacific inbound recovery vs 2019",
        "UN Tourism Dashboard (Tableau) - no public API / download"),
    "visitor_profile.csv": (
        ["year", "dimension", "category", "share_pct", "source"], "Visitor Persona",
        "Trip purpose (leisure / MICE / business) and age brackets",
        "HKTB Visitor Profile Report - PDF only"),
    "attraction_sentiment.csv": (
        ["attraction", "mentions", "sentiment_score", "recommend_pct", "source"], "Visitor Persona",
        "Visitor feedback & recommendation sentiment by attraction",
        "Survey / review data - not published as open data"),
}

log = logging.getLogger("tourism")


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
class SourceRegistry:
    """Tracks provenance (live / snapshot / manual) for every dataset and pending items."""

    def __init__(self, offline):
        self.offline = offline
        self.items = []
        self.pending = []

    def add(self, sid, name, url, mode, note=""):
        self.items.append({"id": sid, "name": name, "url": url, "mode": mode, "note": note})
        log.info("  %-24s %s", sid, mode.upper())


def http_get_bytes(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
        return resp.read()


def http_get(url):
    return http_get_bytes(url).decode("utf-8-sig")


def fetch_csd(table):
    rows = json.loads(http_get(CSD_API.format(table=table))).get("dataSet")
    if not rows:
        raise ValueError("C&SD table {} returned no dataSet".format(table))
    return rows


def fetch_singstat(table):
    data = json.loads(http_get(SINGSTAT_API.format(table=table)))["Data"]
    if not data.get("row"):
        raise ValueError("SingStat table {} returned no rows".format(table))
    return data["row"]


def read_csv(path):
    path = path if isinstance(path, Path) else RAW_DIR / path
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def write_csv(name, fieldnames, rows):
    with open(RAW_DIR / name, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def num(value):
    return float(value) if value not in ("", None) else None


def pct_change(new, old):
    return round((new - old) / old * 100, 2) if old else None


def shift_year(month, years):
    return "{:04d}-{}".format(int(month[:4]) + years, month[5:])


def month_to_quarter(month):
    return "{}-Q{}".format(month[:4], (int(month[5:]) - 1) // 3 + 1)


def csd_period_to_month(period):
    return "{}-{}".format(period[:4], period[4:6])


def month_range(start, end):
    y, m = int(start[:4]), int(start[5:])
    out = []
    while "{:04d}-{:02d}".format(y, m) <= end:
        out.append("{:04d}-{:02d}".format(y, m))
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return out


def month_name(month):
    return datetime.strptime(month, "%Y-%m").strftime("%b %Y")


def load_with_fallback(registry, sid, name, url, fetch_fn, snapshot, note=""):
    """Run fetch_fn (which refreshes the snapshot CSV); fall back to the snapshot on failure."""
    if not registry.offline:
        try:
            fetch_fn()
            registry.add(sid, name, url, "live", note)
            return read_csv(snapshot)
        except Exception as exc:  # noqa: BLE001 - any network/parse failure falls back
            log.warning("  live fetch failed for %s (%s); using snapshot %s", sid, exc, snapshot)
    if not (RAW_DIR / snapshot).exists():
        registry.add(sid, name, url, "unavailable", note + " No snapshot available yet.")
        return []
    registry.add(sid, name, url, "snapshot", note)
    return read_csv(snapshot)


def load_manual(registry):
    """Read optional manual CSVs; register empty ones as pending."""
    MANUAL_DIR.mkdir(parents=True, exist_ok=True)
    out = {}
    for fname, (cols, tab, desc, where) in MANUAL_INPUTS.items():
        path = MANUAL_DIR / fname
        if not path.exists():
            with open(path, "w", newline="", encoding="utf-8") as fh:
                csv.writer(fh).writerow(cols)
        rows = [r for r in read_csv(path) if any((v or "").strip() for v in r.values())]
        out[fname] = rows
        if rows:
            registry.add("manual_" + fname[:-4], desc, "data/manual/" + fname, "manual",
                         "{} rows supplied manually ({}).".format(len(rows), rows[0].get("source", "")))
        else:
            registry.pending.append({"id": fname[:-4], "tab": tab, "item": desc, "source": where,
                                     "file": "data/manual/" + fname, "columns": cols})
    return out


def read_xlsx(data):
    """Minimal xlsx reader -> {sheet_name: {row_number: {column_letter: value}}}."""
    z = zipfile.ZipFile(io.BytesIO(data))
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in re.findall(r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode("utf-8"), flags=re.S):
            shared.append("".join(re.findall(r"<t[^>]*>([^<]*)</t>", si)))
    rels = z.read("xl/_rels/workbook.xml.rels").decode("utf-8")
    targets = {}
    for rel in re.findall(r"<Relationship [^>]*>", rels):
        rid = re.search(r'Id="([^"]+)"', rel).group(1)
        targets[rid] = re.search(r'Target="([^"]+)"', rel).group(1)
    sheets = {}
    workbook = z.read("xl/workbook.xml").decode("utf-8")
    for tag in re.findall(r"<sheet [^>]*>", workbook):
        name = re.search(r'name="([^"]+)"', tag).group(1)
        rid = re.search(r'r:id="([^"]+)"', tag).group(1)
        path = "xl/" + targets[rid].lstrip("/").replace("xl/", "", 1)
        rows = {}
        for cell in re.finditer(r'<c r="([A-Z]+)(\d+)"([^>]*?)(?:/>|>(.*?)</c>)', z.read(path).decode("utf-8"), flags=re.S):
            col, row, attrs, body = cell.groups()
            v = re.search(r"<v>([^<]*)</v>", body or "")
            if not v:
                continue
            value = shared[int(v.group(1))] if 't="s"' in attrs else v.group(1)
            rows.setdefault(int(row), {})[col] = value
        sheets[name] = rows
    return sheets


# --------------------------------------------------------------------------- #
# Extract - live fetchers that refresh normalised snapshot CSVs
# --------------------------------------------------------------------------- #
def refresh_arrivals():
    rows = []
    for r in fetch_csd("650-80001"):
        if r["freq"] != "M" or r["REGION"] not in REGION_GROUP:
            continue
        month = csd_period_to_month(r["period"])
        if month[:4] in BASELINE_YEARS or month >= SCOPE_START:
            rows.append({"month": month, "region_code": r["REGION"], "arrivals": int(r["figure"])})
    rows.sort(key=lambda x: (x["month"], x["region_code"]))
    write_csv("arrivals_by_region_monthly.csv", ["month", "region_code", "arrivals"], rows)


def refresh_spending():
    spend = {(r["period"], r["VISTYPEDesc"], r["REGIONDesc"].strip()): r["figure"]
             for r in fetch_csd("650-80003") if r["freq"] == "Y"}
    per_cap = {(r["period"], r["VISTYPEDesc"], r["REGIONDesc"].strip()): r["figure"]
               for r in fetch_csd("650-80004") if r["freq"] == "Y"}
    rows = []
    for (year, vtype, region), value in sorted(spend.items()):
        if year < "2024" or (year, vtype, region) not in per_cap:
            continue
        rows.append({
            "year": year,
            "visitor_type": "Overnight" if vtype.startswith("Overnight") else "Same-day",
            "region": region,
            "spend_hkd_m": value,
            "per_capita_hkd": per_cap[(year, vtype, region)],
        })
    write_csv("visitor_spending_annual.csv", ["year", "visitor_type", "region", "spend_hkd_m", "per_capita_hkd"], rows)


def refresh_length_of_stay():
    agg = defaultdict(dict)
    for r in fetch_csd("650-80005"):
        if r["freq"] != "Y" or r["period"] < "2019":
            continue
        vtype = "Overnight" if r["VISTYPEDesc"].startswith("Overnight") else "Same-day"
        agg[(r["period"], vtype)]["avg_nights" if r["svDesc"] == "Nights" else "arrivals"] = r["figure"]
    rows = [{"year": y, "visitor_type": v, "arrivals": d.get("arrivals", ""), "avg_nights": d.get("avg_nights", "")}
            for (y, v), d in sorted(agg.items())]
    write_csv("visitor_type_annual.csv", ["year", "visitor_type", "arrivals", "avg_nights"], rows)


def refresh_bri():
    def clean(name):
        return re.sub(r"<[^>]+>", "", name).strip()

    index = {(r["period"], clean(r["INDDesc"])): r["figure"] for r in fetch_csd("660-69001") if r["freq"] == "Q"}
    yoy = {(r["period"], clean(r["INDDesc"])): r["figure"] for r in fetch_csd("660-69002") if r["freq"] == "Q"}
    rows = [
        {"quarter": month_to_quarter(csd_period_to_month(p)), "industry": ind, "index": v, "yoy_pct": yoy.get((p, ind), "")}
        for (p, ind), v in sorted(index.items()) if ind in BRI_INDUSTRIES and p >= "202401"
    ]
    write_csv("bri_quarterly.csv", ["quarter", "industry", "index", "yoy_pct"], rows)


def refresh_tourism_industries():
    agg = defaultdict(dict)
    for r in fetch_csd("655-82101"):
        if r["IND"] in TOURISM_INDUSTRIES and r["freq"] == "Y" and r["period"] >= "2019" and r["svDesc"] in INDUSTRY_MEASURES:
            agg[(r["period"], r["IND"])][INDUSTRY_MEASURES[r["svDesc"]]] = r["figure"]
    rows = []
    for (year, code), measures in sorted(agg.items()):
        label, group = TOURISM_INDUSTRIES[code]
        rows.append({"year": year, "code": code, "industry": label, "group": group,
                     **{k: measures.get(k, "") for k in INDUSTRY_MEASURES.values()}})
    write_csv("tourism_industries_annual.csv", ["year", "code", "industry", "group"] + list(INDUSTRY_MEASURES.values()), rows)


def refresh_ports():
    agg = defaultdict(lambda: [0, 0])
    last_date = ""
    for r in csv.DictReader(io.StringIO(http_get(IMMD_CSV))):
        if r.get("Arrival / Departure") != "Arrival":
            continue
        d, m, y = r["Date"].split("-")
        month = "{}-{}".format(y, m)
        if month < SCOPE_START:
            continue
        last_date = max(last_date, "{}-{}-{}".format(y, m, d))
        port = PORT_GROUP.get(r["Control Point"].strip(), "Land Control Points")
        agg[(month, port)][0] += int(r["Mainland Visitors"] or 0)
        agg[(month, port)][1] += int(r["Other Visitors"] or 0)
    if not agg:
        raise ValueError("ImmD CSV contained no arrivals in scope")
    last = datetime.strptime(last_date, "%Y-%m-%d")
    nxt = datetime(last.year + (last.month == 12), last.month % 12 + 1, 1)
    if (nxt - last).days > 1:  # drop the trailing incomplete month
        agg = {k: v for k, v in agg.items() if k[0] != last_date[:7]}
    rows = [{"month": m, "port": p, "mainland_visitors": v[0], "other_visitors": v[1]} for (m, p), v in sorted(agg.items())]
    write_csv("port_arrivals_monthly.csv", ["month", "port", "mainland_visitors", "other_visitors"], rows)


def refresh_hotel_rooms():
    rows = [{"year": r["Year"], "rooms": r["Number_hotel_rooms"]} for r in csv.DictReader(io.StringIO(http_get(CSTB_ROOMS_CSV)))]
    if not rows:
        raise ValueError("CSTB hotel rooms CSV empty")
    write_csv("hotel_rooms_pipeline.csv", ["year", "rooms"], rows)


def refresh_fx():
    records = json.loads(http_get(HKMA_FX))["result"]["records"]
    rows = [{"month": r["end_of_month"], "usd": r["usd"], "sgd": r["sgd"], "jpy": r["jpy"], "thb": r["thb"], "cny": r["cny"]}
            for r in records if r.get("usd")]
    if not rows:
        raise ValueError("HKMA FX returned no records")
    write_csv("fx_monthly.csv", ["month", "usd", "sgd", "jpy", "thb", "cny"], rows)


def _peer_keep(month):
    return month[:4] in BASELINE_YEARS or month >= SCOPE_START


def refresh_singapore():
    row = fetch_singstat("M550001")[0]
    arrivals = []
    for c in row["columns"]:
        month = datetime.strptime(c["key"], "%Y %b").strftime("%Y-%m")
        if _peer_keep(month):
            arrivals.append({"country": "SG", "month": month, "arrivals": int(float(c["value"]))})
    receipts = []
    for r in fetch_singstat("M550371"):
        component = "Total" if r["seriesNo"] == "1" else r["rowText"]
        ytd = {}
        for c in r["columns"]:
            year, q = c["key"].split(" ")
            ytd[(year, int(q[0]))] = float(c["value"])
        for (year, q), value in sorted(ytd.items()):
            if year >= "2019":
                quarterly = value - ytd.get((year, q - 1), 0) if q > 1 else value
                receipts.append({"quarter": "{}-Q{}".format(year, q), "component": component, "receipts_sgd_m": round(quarterly, 1)})
    write_csv("sg_arrivals_monthly.csv", ["country", "month", "arrivals"], arrivals)
    write_csv("sg_receipts_quarterly.csv", ["quarter", "component", "receipts_sgd_m"], receipts)


def refresh_japan():
    page = http_get(JNTO_PAGE)
    links = re.findall(r'href="([^"]+/_files/[^"]+\.xlsx)"', page)
    if not links:
        raise ValueError("JNTO workbook link not found")
    url = links[0] if links[0].startswith("http") else "https://www.jnto.go.jp" + links[0]
    sheets = read_xlsx(http_get_bytes(url))
    rows = []
    for name, cells in sheets.items():
        if not re.fullmatch(r"\d{4}", name) or not (name in BASELINE_YEARS or name >= SCOPE_START[:4]):
            continue
        header = next((r for r in cells.values() if any(str(v).startswith("1月") for v in r.values())), None)
        total = next((r for r in cells.values() if str(r.get("A", "")).startswith("総数")), None)
        if not header or not total:
            continue
        for col, label in header.items():
            m = re.match(r"(\d{1,2})月", str(label))
            if m and total.get(col) not in (None, ""):
                month = "{}-{:02d}".format(name, int(m.group(1)))
                if _peer_keep(month):
                    rows.append({"country": "JP", "month": month, "arrivals": int(float(total[col]))})
    if not rows:
        raise ValueError("JNTO workbook parsed no arrivals")
    rows.sort(key=lambda r: r["month"])
    write_csv("jp_arrivals_monthly.csv", ["country", "month", "arrivals"], rows)


def refresh_world_bank():
    codes = ";".join(p["wb"] for p in PEERS + WB_EXTRA)
    values = defaultdict(dict)
    for ind, key in (("ST.INT.ARVL", "arrivals"), ("ST.INT.RCPT.CD", "receipts_usd")):
        for r in json.loads(http_get(WORLD_BANK_API.format(codes=codes, ind=ind)))[1]:
            if r["value"] is not None:
                values[r["countryiso3code"]][key] = r["value"]
    rows = [{"country_code": p["code"], "country": p["name"], "arrivals": values[p["wb"]].get("arrivals", ""),
             "receipts_usd": values[p["wb"]].get("receipts_usd", "")} for p in PEERS + WB_EXTRA]
    if not any(r["arrivals"] for r in rows):
        raise ValueError("World Bank returned no 2019 values")
    write_csv("worldbank_2019.csv", ["country_code", "country", "arrivals", "receipts_usd"], rows)


# --------------------------------------------------------------------------- #
# Transform
# --------------------------------------------------------------------------- #
def build_overnight_ratios(spending):
    """Overnight share and per-capita spend per (year, region_code, visitor type).

    Visitor counts per region are recovered as spend / per-capita spend.
    """
    by_key = defaultdict(dict)
    for r in spending:
        by_key[(r["year"], r["region"])][r["visitor_type"]] = (float(r["spend_hkd_m"]), float(r["per_capita_hkd"]))
    ratios, per_capita = {}, {}
    for (year, region), types in by_key.items():
        if len(types) < 2 or region not in SPEND_REGION_CODES:
            continue
        counts = {t: s * 1e6 / pc for t, (s, pc) in types.items() if pc}
        share = counts["Overnight"] / (counts["Overnight"] + counts["Same-day"])
        for code in SPEND_REGION_CODES[region]:
            ratios[(year, code)] = share
            for t, (_, pc) in types.items():
                per_capita[(year, code, t)] = pc
    return ratios, per_capita


def build_arrival_records(arrivals, ratios, per_capita):
    """Monthly arrivals and spending by origin segment x visitor type."""
    years_with_spend = sorted({y for (y, _) in ratios})
    latest_spend_year = years_with_spend[-1]
    agg = defaultdict(lambda: {"arrivals": 0.0, "spend": 0.0, "estimate": False})
    for r in arrivals:
        month, code, n = r["month"], r["region_code"], int(r["arrivals"])
        if month[:4] == "2019":
            continue
        year = month[:4] if month[:4] in years_with_spend else latest_spend_year
        share = ratios.get((year, code), 0.5)
        for vtype, part in (("Overnight", share), ("Same-day", 1 - share)):
            cell = agg[(month, REGION_GROUP[code], vtype)]
            visitors = n * part
            cell["arrivals"] += visitors
            cell["spend"] += visitors * per_capita.get((year, code, vtype), 0) / 1e6
            cell["estimate"] = cell["estimate"] or year != month[:4]
    return [
        {"month": m, "origin": o, "visitor_type": v, "arrivals": round(c["arrivals"]),
         "spend_hkd_m": round(c["spend"], 1), "is_estimate": c["estimate"]}
        for (m, o, v), c in sorted(agg.items())
    ]


def monthly_totals(arrivals, year_prefix=None):
    totals = defaultdict(int)
    for r in arrivals:
        if year_prefix is None or r["month"].startswith(year_prefix):
            totals[r["month"]] += int(r["arrivals"])
    return dict(sorted(totals.items()))


def seasonal_trend_forecast(history, baseline, horizon_end):
    """Multiplicative seasonal decomposition + OLS linear trend.

    * Seasonal index per calendar month from full baseline years (2024, 2025).
    * Linear trend fitted on the de-seasonalised in-scope history.
    * 95% prediction interval from the residual standard error.
    """
    full_years = defaultdict(dict)
    for m, v in baseline.items():
        full_years[m[:4]][m[5:]] = v
    ratios = defaultdict(list)
    for months in full_years.values():
        if len(months) == 12:
            mean = sum(months.values()) / 12
            for mm, v in months.items():
                ratios[mm].append(v / mean)
    seasonal = {mm: statistics.mean(v) for mm, v in sorted(ratios.items())}
    norm = statistics.mean(seasonal.values())
    seasonal = {k: v / norm for k, v in seasonal.items()}

    months = sorted(history)
    xs = list(range(len(months)))
    ys = [history[m] / seasonal[m[5:]] for m in months]
    n = len(xs)
    xbar, ybar = statistics.mean(xs), statistics.mean(ys)
    sxx = sum((x - xbar) ** 2 for x in xs)
    slope = sum((x - xbar) * (y - ybar) for x, y in zip(xs, ys)) / sxx
    intercept = ybar - slope * xbar
    residuals = [y - (intercept + slope * x) for x, y in zip(xs, ys)]
    sigma = math.sqrt(sum(e * e for e in residuals) / (n - 2))
    ss_tot = sum((y - ybar) ** 2 for y in ys)
    r_squared = 1 - sum(e * e for e in residuals) / ss_tot if ss_tot else 0.0

    forecast = {}
    for i, m in enumerate(month_range(months[-1], horizon_end)[1:], start=n):
        s = seasonal[m[5:]]
        point = (intercept + slope * i) * s
        half = 1.96 * sigma * math.sqrt(1 + 1 / n + (i - xbar) ** 2 / sxx) * s
        forecast[m] = (point, max(point - half, 0), point + half)

    model = {
        "method": "Multiplicative seasonal decomposition + OLS linear trend",
        "training_window": "{} to {}".format(months[0], months[-1]),
        "observations": n,
        "slope_per_month": round(slope),
        "annualised_trend_pct": round(slope * 12 / ybar * 100, 2),
        "r_squared": round(r_squared, 3),
        "sigma": round(sigma),
        "confidence_level": 0.95,
        "seasonal_index": {k: round(v, 3) for k, v in seasonal.items()},
    }
    return forecast, model


def fx_annual(fx_rows):
    """Average of end-month HKD rates per (year, currency)."""
    acc = defaultdict(list)
    for r in fx_rows:
        for cur in ("usd", "sgd", "jpy", "thb", "cny"):
            if r.get(cur):
                acc[(r["month"][:4], cur)].append(float(r[cur]))
    return {k: statistics.mean(v) for k, v in acc.items()}


# --------------------------------------------------------------------------- #
# Build JSON outputs
# --------------------------------------------------------------------------- #
def build_outputs(registry):
    log.info("Loading sources:")
    csd = lambda t: CSD_TABLE_PAGE.format(table=t)  # noqa: E731
    arrivals = load_with_fallback(registry, "csd_650_80001", "C&SD 650-80001: Visitor arrivals by nationality/region",
                                  csd("650-80001"), refresh_arrivals, "arrivals_by_region_monthly.csv",
                                  "Monthly; 2019 and 2024 kept as baselines.")
    spending = load_with_fallback(registry, "csd_650_80003_4", "C&SD 650-80003/04: Visitor consumption expenditure & per-capita spending",
                                  csd("650-80003"), refresh_spending, "visitor_spending_annual.csv",
                                  "Annual, by visitor type and source market.")
    vtypes = load_with_fallback(registry, "csd_650_80005", "C&SD 650-80005: Visitor arrivals and length of stay",
                                csd("650-80005"), refresh_length_of_stay, "visitor_type_annual.csv")
    bri = load_with_fallback(registry, "csd_660_69001_2", "C&SD 660-69001/02: Business Receipts Indices for service industries",
                             csd("660-69001"), refresh_bri, "bri_quarterly.csv", "Quarterly index (2015 = 100) and YoY %.")
    industries = load_with_fallback(registry, "csd_655_82101", "C&SD 655-82101: Value added & employment of the Four Key Industries (Tourism)",
                                    csd("655-82101"), refresh_tourism_industries, "tourism_industries_annual.csv",
                                    "Annual value added, GDP share and employment by tourism sub-industry.")
    ports = load_with_fallback(registry, "immd_passenger_traffic", "DATA.GOV.HK / ImmD: Statistics on daily passenger traffic",
                               "https://data.gov.hk/en-data/dataset/hk-immd-set5-statistics-daily-passenger-traffic",
                               refresh_ports, "port_arrivals_monthly.csv", "Visitor entries by control point (trips).")
    rooms = load_with_fallback(registry, "cstb_hotel_rooms", "DATA.GOV.HK / CSTB: Number of hotel rooms for the next three years",
                               "https://data.gov.hk/en-data/dataset/hk-cstb-cstb_tc-tc-number-of-hotel-rooms-next-three-years",
                               refresh_hotel_rooms, "hotel_rooms_pipeline.csv")
    fx = load_with_fallback(registry, "hkma_fx", "HKMA: Exchange rates of HKD (end of period)",
                            "https://apidocs.hkma.gov.hk/documentation/market-data-and-statistics/monthly-statistical-bulletin/er-ir/er-eeri-endperiod/",
                            refresh_fx, "fx_monthly.csv", "Used to convert competitor receipts to HKD (annual average).")
    sg_arr = load_with_fallback(registry, "singstat_m550001", "SingStat M550001 / M550371: Singapore visitor arrivals & tourism receipts",
                                SINGSTAT_PAGE.format(table="M550001"), refresh_singapore, "sg_arrivals_monthly.csv",
                                "Singapore Tourism Board via SingStat Table Builder API.")
    sg_rec = read_csv("sg_receipts_quarterly.csv") if (RAW_DIR / "sg_receipts_quarterly.csv").exists() else []
    jp_arr = load_with_fallback(registry, "jnto_arrivals", "JNTO: Visitor arrivals to Japan (monthly workbook)",
                                JNTO_PAGE, refresh_japan, "jp_arrivals_monthly.csv",
                                "Latest months are JNTO preliminary estimates.")
    wb = load_with_fallback(registry, "world_bank_2019", "World Bank (UN Tourism data): International arrivals & receipts, 2019",
                            "https://data.worldbank.org/indicator/ST.INT.ARVL", refresh_world_bank, "worldbank_2019.csv",
                            "Pre-pandemic baseline; World Bank series end in 2020.")
    manual = load_manual(registry)

    # ---- Core derived tables -------------------------------------------------
    ratios, per_capita = build_overnight_ratios(spending)
    records = build_arrival_records(arrivals, ratios, per_capita)
    totals = monthly_totals(arrivals)
    baseline_2019 = monthly_totals(arrivals, "2019")
    in_scope = {m: v for m, v in totals.items() if m >= SCOPE_START}
    scope_months = sorted(in_scope)
    latest = scope_months[-1]
    latest_year = latest[:4]
    prev_year = str(int(latest_year) - 1)
    ytd_months = [m for m in scope_months if m.startswith(latest_year)]
    ytd_prev_months = [shift_year(m, -1) for m in ytd_months]

    def sum_records(months, field, **filters):
        ms = set(months)
        return sum(r[field] for r in records if r["month"] in ms and all(r[k] == v for k, v in filters.items()))

    arrivals_ytd = sum(totals.get(m, 0) for m in ytd_months)
    arrivals_ytd_prev = sum(totals.get(m, 0) for m in ytd_prev_months)
    fy = {y: sum(v for m, v in totals.items() if m.startswith(y)) for y in ("2019", "2024", "2025")}

    spend_annual = {(r["year"], r["visitor_type"]): float(r["spend_hkd_m"]) for r in spending if r["region"] == "Total"}
    per_cap_total = {(r["year"], r["visitor_type"]): float(r["per_capita_hkd"]) for r in spending if r["region"] == "Total"}
    spend_years = sorted({y for (y, _) in spend_annual})
    total_spend = {y: spend_annual[(y, "Overnight")] + spend_annual[(y, "Same-day")] for y in spend_years}
    yield_per_visitor = {y: total_spend[y] * 1e6 / fy[y] for y in spend_years if fy.get(y)}

    vt_annual = {(r["year"], r["visitor_type"]): r for r in vtypes}
    los = [{"year": y, "nights": float(vt_annual[(y, "Overnight")]["avg_nights"])}
           for y in sorted({k[0] for k in vt_annual}) if (vt_annual.get((y, "Overnight")) or {}).get("avg_nights")]

    # ---- Hotel (manual) + supply -----------------------------------------------
    hotel_monthly = []
    for r in manual["hotel_occupancy_monthly.csv"]:
        occ, adr = num(r["occupancy_pct"]), num(r["adr_hkd"])
        hotel_monthly.append({"month": r["month"], "occupancy_pct": occ, "adr_hkd": adr,
                              "revpar_hkd": round(occ / 100 * adr, 1) if occ is not None and adr is not None else None})
    hotel_monthly.sort(key=lambda h: h["month"])

    bri_records = [{"quarter": r["quarter"], "industry": r["industry"], "index": float(r["index"]),
                    "yoy_pct": num(r["yoy_pct"])} for r in bri]
    accom = [r for r in bri_records if r["industry"] == "Accommodation services"]

    # ---- Tourism industries (value added & employment) -------------------------
    industry_records = [{"year": r["year"], "code": r["code"], "industry": r["industry"], "group": r["group"],
                         **{k: num(r[k]) for k in INDUSTRY_MEASURES.values()}} for r in industries]
    ind_years = sorted({r["year"] for r in industry_records})
    ind_latest = ind_years[-1] if ind_years else None

    def industry(code, year):
        return next((r for r in industry_records if r["code"] == code and r["year"] == year), None)

    tourism_latest = industry("ind_KEY_IND_2", ind_latest) if ind_latest else None
    tourism_prev = industry("ind_KEY_IND_2", ind_years[-2]) if len(ind_years) > 1 else None

    # ---- 1. kpi_summary.json ---------------------------------------------------
    spend_ytd = sum_records(ytd_months, "spend_hkd_m")
    spend_ytd_prev = sum_records(ytd_prev_months, "spend_hkd_m")
    targets = [{"year": r["year"], "target_arrivals": num(r["target_arrivals"]), "source": r.get("source", "")}
               for r in manual["arrival_targets.csv"]]
    kpi = {
        "period": {
            "latest_month": latest,
            "ytd_months": ytd_months,
            "ytd_label": "Jan-{} {}".format(datetime.strptime(latest, "%Y-%m").strftime("%b"), latest_year),
            "compare_label": "Same period {}".format(prev_year),
        },
        "arrivals": {
            "ytd": arrivals_ytd,
            "ytd_prev": arrivals_ytd_prev,
            "yoy_pct": pct_change(arrivals_ytd, arrivals_ytd_prev),  # YoY Arrival Growth %
            "full_year": fy,
            "full_year_yoy_pct": pct_change(fy["2025"], fy["2024"]),
            "recovery_vs_2019_ytd_pct": round(arrivals_ytd / sum(baseline_2019.get("2019-" + m[5:], 0) for m in ytd_months) * 100, 1),
            "mainland_share_ytd_pct": round(sum_records(ytd_months, "arrivals", origin="Mainland") / arrivals_ytd * 100, 1),
        },
        "monthly": [
            {"month": m, "arrivals": v, "prior_year": totals.get(shift_year(m, -1)),
             "baseline_2019": baseline_2019.get("2019-" + m[5:])}
            for m, v in in_scope.items()
        ],
        "targets": targets,
        "length_of_stay": los,
        "spending": {
            "ytd_hkd_m": round(spend_ytd),
            "ytd_prev_hkd_m": round(spend_ytd_prev),
            "ytd_yoy_pct": pct_change(spend_ytd, spend_ytd_prev),
            "ytd_is_estimate": True,
            "annual_hkd_m": {y: round(v) for y, v in total_spend.items()},
            "annual_by_type_hkd_m": {y: {t: round(spend_annual[(y, t)]) for t in VISITOR_TYPES} for y in spend_years},
            "per_capita_hkd": {y: {t: per_cap_total.get((y, t)) for t in VISITOR_TYPES} for y in spend_years},
            "yield_per_visitor_hkd": {y: round(v) for y, v in yield_per_visitor.items()},  # Spend / Visitors
        },
        "hotel": {
            "available": bool(hotel_monthly),
            "accommodation_bri_latest": accom[-1] if accom else None,
            "rooms_pipeline": [{"year": r["year"], "rooms": int(r["rooms"])} for r in rooms],
        },
        "tourism_economy": {
            "year": ind_latest,
            "value_added_hkd_m": tourism_latest and tourism_latest["value_added_hkd_m"],
            "gdp_share_pct": tourism_latest and tourism_latest["va_share_gdp_pct"],
            "employment": tourism_latest and tourism_latest["employment"],
            "employment_share_pct": tourism_latest and tourism_latest["emp_share_pct"],
            "prev_year": tourism_prev and tourism_prev["year"],
            "prev_employment": tourism_prev and tourism_prev["employment"],
            "prev_gdp_share_pct": tourism_prev and tourism_prev["va_share_gdp_pct"],
            "history": [
                {"year": r["year"], "gdp_share_pct": r["va_share_gdp_pct"], "employment": r["employment"],
                 "value_added_hkd_m": r["value_added_hkd_m"]}
                for r in industry_records if r["code"] == "ind_KEY_IND_2"],
        },
    }

    # ---- 2. visitor_demographics.json -------------------------------------------
    port_records = [{"month": r["month"], "port": r["port"], "mainland": int(r["mainland_visitors"]),
                     "non_mainland": int(r["other_visitors"])} for r in ports if r["month"] >= SCOPE_START]
    demographics = {
        "months": scope_months,
        "origins": ORIGINS,
        "visitor_types": VISITOR_TYPES,
        "ports": PORTS,
        "segments": [{"origin": o, "regions": [REGION_LABEL[c] for c, g in REGION_GROUP.items() if g == o]} for o in ORIGINS],
        "arrivals": [r for r in records if r["month"] >= "2024-01"],
        "region_monthly": [
            {"month": r["month"], "region_code": r["region_code"], "region": REGION_LABEL[r["region_code"]],
             "origin": REGION_GROUP[r["region_code"]], "arrivals": int(r["arrivals"])}
            for r in arrivals if r["month"] >= SCOPE_START],
        "port_arrivals": port_records,
        "length_of_stay": los,
        "visitor_type_annual": [{"year": r["year"], "visitor_type": r["visitor_type"], "arrivals": int(r["arrivals"])}
                                for r in vtypes if r["arrivals"]],
        "visitor_profile": [{"year": r["year"], "dimension": r["dimension"], "category": r["category"],
                             "share_pct": num(r["share_pct"])} for r in manual["visitor_profile.csv"]],
        "attraction_sentiment": [{"attraction": r["attraction"], "mentions": num(r["mentions"]),
                                  "sentiment_score": num(r["sentiment_score"]), "recommend_pct": num(r["recommend_pct"])}
                                 for r in manual["attraction_sentiment.csv"]],
    }

    # ---- 3. hotel_sector_performance.json (Revenue Analysis) --------------------
    market_spending = []
    for r in spending:
        if r["region"] == "Total" or r["region"] not in SPEND_REGION_CODES:
            continue
        spend, pc = float(r["spend_hkd_m"]), float(r["per_capita_hkd"])
        codes = SPEND_REGION_CODES[r["region"]]
        market_spending.append({
            "year": r["year"], "market": SPEND_REGION_LABEL[r["region"]],
            "origin": REGION_GROUP[codes[0]] if r["region"] != "Europe, Africa and the Middle East" else "Long-haul",
            "visitor_type": r["visitor_type"], "spend_hkd_m": spend, "per_capita_hkd": pc,
            "visitors": round(spend * 1e6 / pc) if pc else None,
        })
    revenue = {
        "market_spending": market_spending,
        "tourism_industries": industry_records,
        "hotel_monthly": hotel_monthly,
        "hotel_rooms_pipeline": kpi["hotel"]["rooms_pipeline"],
        "bri_industries": BRI_INDUSTRIES,
        "bri_quarterly": bri_records,
    }

    # ---- 4. competitor_benchmark.json -------------------------------------------
    peer_monthly = defaultdict(dict)
    for m, v in totals.items():
        peer_monthly[m]["HK"] = v
    for r in sg_arr + jp_arr:
        peer_monthly[r["month"]][r["country"]] = int(r["arrivals"])
    for r in manual["thailand_arrivals_monthly.csv"]:
        peer_monthly[r["month"]]["TH"] = int(float(r["arrivals"]))
    peers_available = [p for p in PEERS if any(p["code"] in v for m, v in peer_monthly.items() if m >= SCOPE_START)]
    comp_months = [m for m in sorted(peer_monthly) if m >= SCOPE_START and "HK" in peer_monthly[m]]
    monthly_rows = []
    for m in comp_months:
        row = {"month": m}
        base = peer_monthly.get("2019-" + m[5:], {})
        for p in peers_available:
            v = peer_monthly[m].get(p["code"])
            row[p["code"]] = v
            row[p["code"] + "_recovery"] = round(v / base[p["code"]] * 100, 1) if v and base.get(p["code"]) else None
        monthly_rows.append(row)

    fx_avg = fx_annual(fx)
    wb_rows = {r["country_code"]: r for r in wb}
    receipts = []
    for p in PEERS + WB_EXTRA:
        r = wb_rows.get(p["code"])
        if r and r["receipts_usd"] and fx_avg.get(("2019", "usd")):
            receipts.append({"country": p["code"], "name": p["name"], "year": "2019",
                             "receipts_hkd_m": round(float(r["receipts_usd"]) * fx_avg[("2019", "usd")] / 1e6),
                             "arrivals": int(float(r["arrivals"])) if r["arrivals"] else None, "source": "World Bank / UN Tourism"})
    for y in spend_years:
        receipts.append({"country": "HK", "name": "Hong Kong", "year": y, "receipts_hkd_m": round(total_spend[y]),
                         "arrivals": fy.get(y), "source": "C&SD destination consumption expenditure"})
    sg_total = defaultdict(float)
    sg_components = defaultdict(float)
    for r in sg_rec:
        year = r["quarter"][:4]
        if r["component"] == "Total":
            sg_total[year] += float(r["receipts_sgd_m"])
        else:
            sg_components[(year, r["component"])] += float(r["receipts_sgd_m"])
    sg_quarters = {r["quarter"] for r in sg_rec if r["component"] == "Total"}
    for y in ("2024", "2025"):
        if all("{}-Q{}".format(y, q) in sg_quarters for q in range(1, 5)) and fx_avg.get((y, "sgd")):
            sg_arrivals = sum(int(r["arrivals"]) for r in sg_arr if r["month"].startswith(y))
            receipts.append({"country": "SG", "name": "Singapore", "year": y,
                             "receipts_hkd_m": round(sg_total[y] * fx_avg[(y, "sgd")]), "arrivals": sg_arrivals,
                             "source": "Singapore Tourism Board (SGD converted at HKMA annual average)"})
    for rec in receipts:
        rec["per_visitor_hkd"] = round(rec["receipts_hkd_m"] * 1e6 / rec["arrivals"]) if rec.get("arrivals") else None

    sg_mix_year = "2025" if ("2025", "Shopping") in sg_components else "2024"
    competitor = {
        "peers": [{"code": p["code"], "name": p["name"], "available": p in peers_available} for p in PEERS],
        "monthly": monthly_rows,
        "baseline_2019_annual": [
            {"country": p["code"], "name": p["name"],
             "arrivals": int(float(wb_rows[p["code"]]["arrivals"])) if wb_rows.get(p["code"], {}).get("arrivals") else None}
            for p in PEERS + WB_EXTRA],
        "receipts": receipts,
        "sg_receipts_mix": {
            "year": sg_mix_year,
            "components": [{"component": c, "receipts_hkd_m": round(v * fx_avg.get((sg_mix_year, "sgd"), 0))}
                           for (y, c), v in sorted(sg_components.items()) if y == sg_mix_year],
        },
        "un_tourism_apac": [{"month": r["month"], "apac_recovery_pct": num(r["apac_recovery_pct"])}
                            for r in manual["un_tourism_apac_monthly.csv"]],
        "fx_annual_hkd": {"{}_{}".format(y, c): round(v, 5) for (y, c), v in sorted(fx_avg.items()) if y >= "2019"},
    }

    # ---- 5. strategy_forecast_2027.json ----------------------------------------
    baseline_for_season = {m: v for m, v in totals.items() if m[:4] in ("2024", "2025")}
    forecast, model = seasonal_trend_forecast(in_scope, baseline_for_season, "{}-12".format(FORECAST_YEAR))
    series = [{"month": m, "actual": v, "forecast": None, "lower": None, "upper": None} for m, v in in_scope.items()]
    series[-1].update({"forecast": series[-1]["actual"], "lower": series[-1]["actual"], "upper": series[-1]["actual"]})
    series += [{"month": m, "actual": None, "forecast": round(p), "lower": round(lo), "upper": round(hi)}
               for m, (p, lo, hi) in forecast.items()]

    # Yield: 2026 estimated from 2025 per-capita by segment (mix effect); 2027 applies half the historical drift.
    yields = dict(yield_per_visitor)
    if latest_year not in yields:
        yields[latest_year] = sum_records(ytd_months, "spend_hkd_m") * 1e6 / arrivals_ytd
    ys = sorted(yields)
    growths = [yields[b] / yields[a] - 1 for a, b in zip(ys, ys[1:])]
    damped_growth = statistics.mean(growths) * 0.5 if growths else 0.0
    yield_2027 = yields[ys[-1]] * (1 + damped_growth) ** (FORECAST_YEAR - int(ys[-1]))

    fc_year = lambda y, i: sum(v[i] for m, v in forecast.items() if m.startswith(str(y)))  # noqa: E731
    year_latest_total = arrivals_ytd + fc_year(latest_year, 0)
    arrivals_2027 = fc_year(FORECAST_YEAR, 0)
    annual = [
        {"year": "2024", "arrivals": fy["2024"], "yield_hkd": round(yields.get("2024", 0)),
         "spend_hkd_m": round(total_spend.get("2024", 0)), "status": "actual"},
        {"year": "2025", "arrivals": fy["2025"], "yield_hkd": round(yields["2025"]),
         "spend_hkd_m": round(total_spend["2025"]), "status": "actual"},
        {"year": latest_year, "arrivals": round(year_latest_total), "yield_hkd": round(yields[latest_year]),
         "spend_hkd_m": round(year_latest_total * yields[latest_year] / 1e6), "status": "actual + forecast"},
        {"year": str(FORECAST_YEAR), "arrivals": round(arrivals_2027), "yield_hkd": round(yield_2027),
         "spend_hkd_m": round(arrivals_2027 * yield_2027 / 1e6), "status": "forecast",
         "arrivals_lower": round(fc_year(FORECAST_YEAR, 1)), "arrivals_upper": round(fc_year(FORECAST_YEAR, 2))},
    ]
    annual = [a for i, a in enumerate(annual) if a["year"] not in {b["year"] for b in annual[:i]}]

    def scenario(label, vol_adj, yield_adj, description, drivers):
        a, y = arrivals_2027 * (1 + vol_adj), yield_2027 * (1 + yield_adj)
        return {"label": label, "arrivals": round(a), "yield_hkd": round(y), "spend_hkd_m": round(a * y / 1e6),
                "arrivals_adj_pct": vol_adj * 100, "yield_adj_pct": yield_adj * 100,
                "description": description, "drivers": drivers}

    scenarios = {
        "base": scenario("Base case", 0.0, 0.0,
                         "Current 2025-26 run-rate continues: Mainland-led volume growth with gradual yield drift.",
                         ["Trend + seasonality extrapolated", "Segment spending mix held at 2025 levels"]),
        "upside": scenario("Strategy delivered", 0.03, 0.06,
                           "Strategic pillars land: more overnight, long-haul and MICE visitors lift yield.",
                           ["Overnight share +3pp", "Mega-event calendar at Kai Tak", "GBA multi-destination packages"]),
        "downside": scenario("Headwinds", -0.05, -0.04,
                             "Weaker regional demand, strong HKD and Mainland outbound diversion to other destinations.",
                             ["Same-day shopping trips soften", "Long-haul air capacity constraints"]),
    }

    # Metrics feeding the strategy narrative (all computed from official data)
    ytd_overnight = sum_records(ytd_months, "arrivals", visitor_type="Overnight")
    sameday_share = round((1 - ytd_overnight / arrivals_ytd) * 100, 1)
    longhaul_share = round(sum_records(ytd_months, "arrivals", origin="Long-haul") / arrivals_ytd * 100, 1)
    pc = kpi["spending"]["per_capita_hkd"].get("2025", {})
    port_ytd = defaultdict(int)
    for p in port_records:
        if p["month"].startswith(latest_year):
            port_ytd[p["port"]] += p["mainland"] + p["non_mainland"]
    port_total = sum(port_ytd.values()) or 1
    xb_share = round((port_ytd["West Kowloon HSR"] + port_ytd["HZMB"] + port_ytd["Land Control Points"]) / port_total * 100, 1)
    tce = [r for r in bri_records if r["industry"] == BRI_INDUSTRIES[0]]
    tce_latest = tce[-1] if tce else {"quarter": "n/a", "yoy_pct": None, "index": None}
    accom_by_q = defaultdict(list)
    for r in accom:
        accom_by_q[r["quarter"][-2:]].append(r["index"])
    accom_q = {q: statistics.mean(v) for q, v in accom_by_q.items()}
    accom_peak_q = max(accom_q, key=accom_q.get) if accom_q else "Q4"
    accom_low_q = min(accom_q, key=accom_q.get) if accom_q else "Q3"
    accom_gap = (accom_q[accom_peak_q] / accom_q[accom_low_q] - 1) * 100 if accom_q else 0
    sg_2025 = next((r for r in receipts if r["country"] == "SG" and r["year"] == "2025"), None)
    hk_2025 = next((r for r in receipts if r["country"] == "HK" and r["year"] == "2025"), None)

    pillars = [
        {
            "id": "high-value", "number": 1,
            "title": "High-Value, Long-Haul Experience & MICE Diversification",
            "tagline": "From same-day shopping to overnight, experience-driven stays",
            "rationale": [
                "Same-day visitors account for {}% of {} YTD arrivals but spend HK${:,.0f} per head vs HK${:,.0f} for overnight visitors (2025).".format(
                    sameday_share, latest_year, pc.get("Same-day") or 0, pc.get("Overnight") or 0),
                "Long-haul markets are only {}% of arrivals despite the highest per-capita spend.".format(longhaul_share),
                "Yield per visitor moved from HK${:,.0f} (2024) to HK${:,.0f} (2025) as volume shifted to same-day trips.".format(
                    yields.get("2024", 0), yields["2025"]),
            ] + ([
                "Singapore earned HK${:,.0f} per visitor in 2025 vs HK${:,.0f} for Hong Kong.".format(
                    sg_2025["per_visitor_hkd"], hk_2025["per_visitor_hkd"])] if sg_2025 and hk_2025 else []),
            "initiatives": [
                "Scale 'CityWalk' neighbourhood trails (Sham Shui Po, Sai Kung, Central-Western) into bookable multi-day itineraries.",
                "Long-haul air-capacity incentives and stopover packages with airline partners through HKIA.",
                "MICE bid fund targeting association congresses at AsiaWorld-Expo, HKCEC and Kai Tak.",
                "Night-time economy and cultural districts (WestK, M+, Palace Museum) bundled as premium overnight products.",
            ],
            "kpis": [
                {"metric": "Overnight share of arrivals", "baseline": "{}%".format(round(100 - sameday_share, 1)),
                 "target_2027": "{}%".format(round(100 - sameday_share + 3, 1))},
                {"metric": "Long-haul share of arrivals", "baseline": "{}%".format(longhaul_share),
                 "target_2027": "{}%".format(round(longhaul_share + 1.5, 1))},
                {"metric": "Yield per visitor (HKD)", "baseline": "{:,.0f}".format(yields[ys[-1]]),
                 "target_2027": "{:,.0f}".format(scenarios["upside"]["yield_hkd"])},
            ],
            "timeline": [
                {"phase": "Q1 2027", "action": "Launch long-haul stopover campaign and MICE bid fund round."},
                {"phase": "Q2-Q3 2027", "action": "Roll out 10 bookable CityWalk itineraries with OTA partners."},
                {"phase": "Q4 2027", "action": "Review overnight conversion and per-capita spend uplift."},
            ],
        },
        {
            "id": "mega-events", "number": 2,
            "title": "Mega-Events & \"+ Tourism\" Integration",
            "tagline": "Kai Tak Sports Park as a year-round demand engine",
            "rationale": [
                "Tourism, convention & exhibition BRI stood at {} (2015 = 100) in {}, up {}% YoY - still well below its 2015 base.".format(
                    tce_latest["index"], tce_latest["quarter"], tce_latest["yoy_pct"]),
                "Accommodation receipts in {} run {:.0f}% above {} on average - events can fill the softer quarter.".format(
                    accom_peak_q, accom_gap, accom_low_q),
                "Seasonal index ranges {:.2f}-{:.2f}: events can fill the softer June and September troughs.".format(
                    min(model["seasonal_index"].values()), max(model["seasonal_index"].values())),
            ],
            "initiatives": [
                "Anchor a 12-month mega-event calendar at Kai Tak Sports Park (concerts, rugby sevens, e-sports).",
                "'Sports + Tourism', 'Culture + Tourism' bundles: event ticket + hotel + attraction passes.",
                "Target shoulder months (Jun, Sep) with signature festivals to smooth seasonality.",
                "Event-impact dashboard tracking incremental arrivals, hotel nights and spend per event.",
            ],
            "kpis": [
                {"metric": "Mega-events hosted", "baseline": "2025-26 calendar", "target_2027": "+20% events"},
                {"metric": "Accommodation BRI YoY", "baseline": "{}%".format(accom[-1]["yoy_pct"] if accom else "n/a"),
                 "target_2027": "+6-8%"},
                {"metric": "TCE BRI YoY", "baseline": "{}%".format(tce_latest["yoy_pct"]), "target_2027": "+8-10%"},
            ],
            "timeline": [
                {"phase": "H2 2026", "action": "Lock 2027 Kai Tak anchor events and ticket-bundle partners."},
                {"phase": "2027", "action": "Run shoulder-season festivals; publish per-event impact reports."},
            ],
        },
        {
            "id": "gba", "number": 3,
            "title": "Seamless Cross-Boundary GBA Multi-Destination Strategy",
            "tagline": "Hong Kong as the international gateway to the Greater Bay Area",
            "rationale": [
                "{}% of {} YTD visitor entries came via land, HSR or HZMB control points.".format(xb_share, latest_year),
                "Mainland visitors make up {}% of {} YTD arrivals; most are same-day.".format(
                    kpi["arrivals"]["mainland_share_ytd_pct"], latest_year),
                "International visitors increasingly combine Hong Kong with Shenzhen, Macao and Guangzhou in one trip.",
            ],
            "initiatives": [
                "Joint 'One Trip, Multiple Destinations' packages with Macao and GBA cities.",
                "Single-ticketing across HSR, HZMB and ferries with integrated attraction passes.",
                "Optimise transit visa and 144-hour visa-free routing for international visitors via HKIA.",
                "Convert same-day Mainland flows into overnight stays with evening events and hotel bundles.",
            ],
            "kpis": [
                {"metric": "Multi-destination itineraries sold", "baseline": "Pilot", "target_2027": "500k travellers"},
                {"metric": "Mainland overnight conversion", "baseline": "{:.0f}%".format(ratios.get(("2025", "CN"), 0) * 100),
                 "target_2027": "+3pp"},
                {"metric": "Cross-boundary entries (land, HSR, HZMB)", "baseline": "{}%".format(xb_share),
                 "target_2027": "Maintain share with higher yield"},
            ],
            "timeline": [
                {"phase": "Q1 2027", "action": "Launch single-ticket pilot (HSR + HZMB + attraction pass)."},
                {"phase": "Q3 2027", "action": "Extend transit-visa routing campaign to long-haul source markets."},
            ],
        },
    ]

    strategy = {"model": model, "series": series, "annual": annual, "scenarios": scenarios, "pillars": pillars}
    return {
        "kpi_summary.json": kpi,
        "visitor_demographics.json": demographics,
        "hotel_sector_performance.json": revenue,
        "competitor_benchmark.json": competitor,
        "strategy_forecast_2027.json": strategy,
    }, (scope_months[0], latest)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--offline", action="store_true", help="skip live fetches and use snapshot CSVs only")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="output directory for JSON files")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    registry = SourceRegistry(args.offline)
    outputs, coverage = build_outputs(registry)
    meta = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "coverage": {"start": coverage[0], "end": coverage[1]},
        "mode": "offline" if args.offline else "live",
        "sources": registry.items,
        "pending": registry.pending,
    }
    args.out.mkdir(parents=True, exist_ok=True)
    log.info("Writing outputs to %s:", args.out)
    for name, payload in outputs.items():
        path = args.out / name
        path.write_text(json.dumps({"meta": meta, **payload}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        log.info("  %-34s %6.1f KB", name, path.stat().st_size / 1024)
    if registry.pending:
        log.info("Pending (no open data - fill data/manual/*.csv to enable): %s",
                 ", ".join(p["id"] for p in registry.pending))


if __name__ == "__main__":
    main()
