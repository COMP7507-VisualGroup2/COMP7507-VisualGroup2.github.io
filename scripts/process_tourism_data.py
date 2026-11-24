#!/usr/bin/env python3
"""Hong Kong Inbound Tourism Evaluation - data pipeline.

Reads the project's local source files and writes the static JSON consumed by the
Next.js dashboard (Executive summary / Visitor Persona / Revenue Analysis / 2027 Outlook).
There is no live data fetching: every input is a file committed under data/.

Inputs (all in data/):

* HKTB visitor arrival statistics by nationality - "*all countries visitor type.xlsx"
  (Jan-Jun 2025 and Jan-Jun 2026 editions): monthly arrivals, overnight / same-day,
  gender and age for the 18 HKTB source markets.
* HKTB Total Tourism Expenditure Associated to Inbound Tourism (TEAIT) -
  "Inbound tourism expediture 06 2026.xls": Jan-Jun 2025 and 2026 spending by visitor
  type, market area and spending category.
* "Average spend per overnight visitors.xlsx" - quarterly overnight spend per visitor and
  market-area overnight visitor counts compiled from the TEAIT releases.
* TEAIT quarterly releases (2025 and Jan-Jun 2026) - cumulative expenditure and
  per-capita expenditure used to derive standalone quarterly visitor-type and
  market-segment spending.
* Monthly visitor arrivals by region ("Visitor arrivals by nationalityregion.csv"),
  monthly length of stay ("Lenght of stay.csv"), Jan-Jun visitor types
  ("visitor_type_h1.csv") and the 2025 / 2026 government targets ("2025 KPI.csv",
  "2026 KPI.csv"), as supplied with the project.
* HKTB Visitor Profile Report 2025 FY / 2026 H1, transcribed to data/manual/visitor_profile.csv.
* Official Hong Kong district boundaries, stored as data/hksar_18_district_boundary.json.

Usage
-----
    python3 scripts/process_tourism_data.py

Only the Python standard library is used (Python >= 3.8).
"""

import argparse
import csv
import html
import io
import json
import logging
import math
import re
import struct
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MANUAL_DIR = DATA_DIR / "manual"
DEFAULT_OUT = ROOT / "public" / "data"

H1_YEARS = ("2025", "2026")
DATA_END = "2026-06"  # latest month covered by every source (TEAIT, HKTB workbooks, length of stay)
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
SEGMENTS = ["Mainland", "Short-haul", "Long-haul"]

ARRIVALS_CSV = "Visitor arrivals by nationalityregion.csv"
LENGTH_OF_STAY_CSV = "Lenght of stay.csv"
VISITOR_TYPE_CSV = "visitor_type_h1.csv"
KPI_CSV = "{} KPI.csv"
EXPENDITURE_XLS = "Inbound tourism expediture 06 2026.xls"
QUARTERLY_XLSX = "Average spend per overnight visitors.xlsx"
QUARTERLY_TEAIT_FILES = (
    (2025, 1, "Mar", "TEAIT 03 2025.xls"),
    (2025, 2, "Jun", "TEAIT 06 2025.xls"),
    (2025, 3, "Sep", "TEAIT 09 2025.xls"),
    (2025, 4, "Dec", "TEAIT 12 2025_R.xls"),
    (2026, 1, "Mar", "TEAIT 03 2026.xls"),
    (2026, 2, "Jun", "TEAIT 06 2026.xls"),
)

# Market areas used by the TEAIT expenditure tables, with the arrivals-CSV regions they combine
AREA_SEGMENT = {
    "Mainland China": "Mainland",
    "Macau SAR": "Short-haul", "Taiwan": "Short-haul", "North Asia": "Short-haul", "South & Southeast Asia": "Short-haul",
    "The Americas": "Long-haul", "Europe, Africa & the Middle East": "Long-haul", "Australia, NZ & South Pacific": "Long-haul",
}
REGION_AREA = {
    "Chinese Mainland": "Mainland China", "Macao": "Macau SAR", "Taiwan": "Taiwan", "North Asia": "North Asia",
    "South and Southeast Asia": "South & Southeast Asia", "The Americas": "The Americas",
    "Europe": "Europe, Africa & the Middle East", "Africa": "Europe, Africa & the Middle East",
    "Middle East": "Europe, Africa & the Middle East", "Australia, New Zealand and South Pacific": "Australia, NZ & South Pacific",
}
SPEND_CATEGORY_TABLES = {
    ("Overnight", "All markets"): "Overnight Visitor Spending by Spending Category - All Markets",
    ("Overnight", "Mainland"): "Overnight Visitor Spending by Spending Category - Mainland China",
    ("Overnight", "Long-haul"): "Overnight Visitor Spending by Spending Category - Long Haul Markets",
    ("Overnight", "Short-haul"): "Overnight Visitor Spending by Spending Category - Short Haul Markets ( Exclude Mainland China )",
    ("Same-day", "All markets"): "Same-day Visitor Spending by Spending Category - All Markets",
    ("Same-day", "Mainland"): "Same-day Visitor Spending by Spending Category - Mainland China",
}

# Manual inputs: filename -> (columns, dashboard tab, description, where to obtain)
MANUAL_INPUTS = {
    "visitor_profile_baseline.csv": (
        ["period", "market", "dimension", "category", "value", "source"], "Visitor Persona",
        "Previous visitor profile data: age, companions, trip purpose, spending, satisfaction, places visited",
        "Previous supplied visitor profile data"),
    "mainland_origin_provinces.csv": (
        ["period", "rank", "province_zh", "province_en", "share_pct", "all_visitors_share_pct"],
        "Mainland China Visitors",
        "Mainland visitor origins by province / municipality",
        "User-provided table; original source not stated"),
    "country_age_quarterly.csv": (
        ["period", "market", "age_group", "count", "source"], "Country Analysis",
        "Quarterly country arrivals by age group",
        "Published quarterly HKTB nationality and age breakdowns"),
}

# HKTB monthly visitor arrival statistics (local workbooks, June editions) - nationality detail
HKTB_ARRIVALS_GLOB = "*all countries visitor type.xlsx"
# The 18 source markets profiled in the HKTB Visitor Profile Report -> dashboard origin segment
HKTB_MARKETS = {
    "Chinese Mainland": "Mainland",
    "Philippines": "Short-haul", "Thailand": "Short-haul", "Singapore": "Short-haul", "Malaysia": "Short-haul",
    "Indonesia": "Short-haul", "India": "Short-haul", "Taiwan": "Short-haul", "South Korea": "Short-haul",
    "Japan": "Short-haul",
    "USA": "Long-haul", "Canada": "Long-haul", "United Kingdom": "Long-haul", "Germany": "Long-haul",
    "France": "Long-haul", "Australia": "Long-haul", "Russia": "Long-haul",
    "Middle East": "Emerging",
}
# Additional individually named markets in the nationality workbook, without visitor profiles.
HKTB_EXTRA_H1_MARKETS = {"Vietnam"}
# Segment rows in the workbook tables (for the segment age / gender profile)
HKTB_SEGMENT_ROWS = {
    "Total": "All markets", "Chinese Mainland": "Mainland",
    "Short Haul Markets (Exclude Chinese Mainland)": "Short-haul", "Long Haul Markets": "Long-haul",
}
# The Jun 2025 edition labels Mainland rows without "Chinese"
HKTB_NAME_ALIASES = {
    "Mainland": "Chinese Mainland",
    "Short Haul Markets (Exclude Mainland)": "Short Haul Markets (Exclude Chinese Mainland)",
}
AGE_COLUMNS = [("K", "0-15"), ("L", "16-25"), ("M", "26-35"), ("N", "36-45"), ("O", "46-55"), ("P", "56-65"), ("Q", "66+")]
APPENDIX_MONTH_COLUMNS = [("F", 1), ("J", 2), ("N", 3), ("Y", 4), ("AC", 5), ("AG", 6)]

# 2027 market playbooks: which strategic pillars apply to each HKTB source market, with market-specific
# initiatives. KPI specs are (metric, change) pairs; baselines are computed from the HKTB data and the
# 2027 targets are proposed changes on those baselines:
#   ("growth", +pct)      arrivals growth target vs Jan-Jun 2026 YoY baseline
#   ("overnight", +pp)    overnight share of arrivals (Jan-Jun 2026)
#   ("nights", +n)        average nights of overnight visitors (H1 2026)
#   ("spend", +ratio)     spend per overnight visitor (H1 2026)
#   ("first", +pp)        first-time visitors (H1 2026)
#   ("family", +pp)       overnight visitors travelling with family (H1 2026)
#   ("multi", +pp)        multi-destination trips, HKTB segment level (2025)
#   ("place", name, txt)  rank of a place among top-10 places visited (H1 2026)
MARKET_PLAYBOOKS = [
    {"market": "Chinese Mainland", "primary": "gba",
     "headline": "Turn the same-day majority into overnight stays and draw more visitors from beyond Guangdong.",
     "plays": [
         {"pillar": "gba", "initiatives": [
             "'Stay the night' bundles sold at West Kowloon HSR and HZMB: evening event ticket + hotel + next-day attraction pass.",
             "Weekday hotel and night-time offers (harbour cruise, night markets) for Greater Bay Area day-trippers on Xiaohongshu and Douyin.",
             "Rewards for multi-entry permit holders who come back for a second and third overnight trip."],
          "kpis": [("overnight", 3), ("nights", 0.2)]},
         {"pillar": "mega-events", "initiatives": [
             "Market the Kai Tak concert and sports calendar in Shanghai, Beijing, Zhejiang and Jiangsu, where visitors arrive by air or HSR and stay longer.",
             "Event-ticket presales bundled with HSR fares from non-Guangdong cities."],
          "kpis": [("place", "Kai Tak Sports Park", "Top 5"), ("first", 3)]},
         {"pillar": "high-value", "initiatives": [
             "Broaden the basket beyond shopping: dining, culture (WestK, Palace Museum) and wellness for repeat visitors.",
             "Corporate MICE and incentive groups from tier-1 cities at HKCEC and AsiaWorld-Expo."],
          "kpis": [("spend", 0.05)]},
     ]},
    {"market": "Taiwan", "primary": "mega-events",
     "headline": "Loyal repeat visitors on short trips: give them new events and neighbourhoods to come back for.",
     "plays": [
         {"pillar": "mega-events", "initiatives": [
             "Cantopop concerts and cultural festivals sold as long-weekend packages with Taiwanese airlines.",
             "Fresh CityWalk content for repeat visitors (Sham Shui Po, Tai O, Sai Kung) on Taiwanese travel media."],
          "kpis": [("nights", 0.2), ("overnight", 3)]},
         {"pillar": "gba", "initiatives": [
             "Hong Kong + Macao / Shenzhen combination itineraries for visitors who have 'done' Hong Kong.",
             "Single ticket for ferry / HZMB transfers bundled with Hong Kong hotels."],
          "kpis": [("multi", 3), ("growth", 5)]},
     ]},
    {"market": "Philippines", "primary": "mega-events",
     "headline": "A family-heavy, Disneyland-led market that slipped in 2026: family events and value bundles.",
     "plays": [
         {"pillar": "mega-events", "initiatives": [
             "School-holiday family festivals bundled with Hong Kong Disneyland and Ocean Park tickets.",
             "Concerts by Filipino and international artists at Kai Tak with fan travel packages from Manila."],
          "kpis": [("growth", 8), ("family", 3)]},
         {"pillar": "gba", "initiatives": [
             "Hong Kong + Macao family itineraries with the ferry or HZMB transfer included.",
             "Off-peak weekday hotel deals with Philippine low-cost carriers to fill shoulder months."],
          "kpis": [("multi", 3), ("nights", 0.2)]},
     ]},
    {"market": "USA", "primary": "high-value",
     "headline": "A growing long-haul market whose spend per visitor is falling: raise the value of each trip.",
     "plays": [
         {"pillar": "high-value", "initiatives": [
             "Stopover packages with transpacific carriers through HKIA (free night, attraction pass).",
             "Bid for association congresses and corporate MICE from US headquarters."],
          "kpis": [("spend", 0.05), ("nights", 0.3)]},
         {"pillar": "gba", "initiatives": [
             "Sell Hong Kong as the gateway to Asia: Greater Bay Area and Macao add-ons priced into transpacific fares.",
             "Promote 144-hour visa-free transit routing via HKIA to Mainland cities."],
          "kpis": [("multi", 3), ("growth", 8)]},
     ]},
    {"market": "South Korea", "primary": "mega-events",
     "headline": "Short, first-time trips from Seoul and falling arrivals: use K-culture and events to restart growth.",
     "plays": [
         {"pillar": "mega-events", "initiatives": [
             "K-pop concerts and e-sports tournaments at Kai Tak with fan packages on Korean OTAs.",
             "Night-time content (harbour, night markets, rooftop bars) for young first-timers on Korean social channels."],
          "kpis": [("growth", 10), ("nights", 0.3)]},
         {"pillar": "high-value", "initiatives": [
             "Café, dessert and photo-spot CityWalk trails designed to add a third night.",
             "Weekend fare + hotel deals with Korean low-cost carriers."],
          "kpis": [("spend", 0.05), ("overnight", 3)]},
     ]},
    {"market": "Japan", "primary": "high-value",
     "headline": "The lowest spend per visitor of the 18 markets, among the shortest stays, and falling arrivals: give Japanese visitors reasons to stay longer.",
     "plays": [
         {"pillar": "high-value", "initiatives": [
             "Gourmet and 'retro Hong Kong' itineraries (Cantonese dining, neon streets, film locations) with Japanese travel media and agents.",
             "Three-night packages around Golden Week, Obon and Silver Week holidays."],
          "kpis": [("nights", 0.3), ("spend", 0.08)]},
         {"pillar": "mega-events", "initiatives": [
             "Anime, J-pop and e-sports events at Kai Tak and AsiaWorld-Expo marketed to fans in Tokyo and Osaka.",
             "Hong Kong Sevens and marathon packages for Japanese sports travellers."],
          "kpis": [("growth", 10), ("first", 3)]},
         {"pillar": "gba", "initiatives": [
             "Hong Kong + Macao / Shenzhen four-day itineraries for repeat visitors looking for something new.",
             "Japanese-language guides and simplified ticketing for HZMB and ferry transfers."],
          "kpis": [("multi", 3)]},
     ]},
    {"market": "Thailand", "primary": "mega-events",
     "headline": "Long stays and temple-led itineraries: build festival and faith-based culture products.",
     "plays": [
         {"pillar": "mega-events", "initiatives": [
             "Temple and festival trails (Wong Tai Sin, Che Kung, Tin Hau, Cheung Chau Bun Festival) promoted in Bangkok.",
             "Thai-language event packages around Songkran and year-end holidays."],
          "kpis": [("growth", 8), ("first", 3)]},
         {"pillar": "gba", "initiatives": [
             "Hong Kong + Macao / Guangzhou itineraries for second-time visitors.",
             "Partner with Thai agents on multi-city fares that route through HKIA."],
          "kpis": [("multi", 3), ("spend", 0.05)]},
     ]},
    {"market": "Australia", "primary": "high-value",
     "headline": "A fast-growing long-haul market with above-average spend: turn stopovers into stays and use sport as the hook.",
     "plays": [
         {"pillar": "high-value", "initiatives": [
             "Stopover campaigns on Europe-bound routes via HKIA (two-night packages).",
             "Hiking, beaches and outlying-island itineraries for active travellers."],
          "kpis": [("spend", 0.05), ("nights", 0.2)]},
         {"pillar": "mega-events", "initiatives": [
             "Hong Kong Sevens and Kai Tak events packaged for Australian sports fans.",
             "Clockenflap and food festivals marketed to young couples travelling together."],
          "kpis": [("growth", 10), ("first", 3)]},
     ]},
    {"market": "Singapore", "primary": "high-value",
     "headline": "Older, loyal repeat visitors with few first-timers: premium experiences and new reasons to return.",
     "plays": [
         {"pillar": "high-value", "initiatives": [
             "Premium dining, art (M+, Art Basel) and wellness weekends for repeat visitors.",
             "Position Hong Kong for regional MICE from Singapore-based Asia headquarters."],
          "kpis": [("spend", 0.05), ("nights", 0.2)]},
         {"pillar": "mega-events", "initiatives": [
             "Art Basel, Clockenflap and Sevens weekend packages.",
             "Campaigns aimed at younger Singaporeans to bring in new first-time visitors."],
          "kpis": [("first", 3), ("growth", 5)]},
     ]},
    {"market": "India", "primary": "high-value",
     "headline": "High-spending, long-staying visitors from Mumbai, Delhi and Bangalore: MICE, incentives and celebrations.",
     "plays": [
         {"pillar": "high-value", "initiatives": [
             "Incentive and MICE groups from corporates in Mumbai, Delhi and Bangalore.",
             "Destination-wedding and celebration packages with hotels and venues."],
          "kpis": [("spend", 0.05), ("growth", 10)]},
         {"pillar": "gba", "initiatives": [
             "Hong Kong + Macao + Shenzhen multi-city packages for first-time leisure visitors.",
             "Vegetarian and Indian-dining guides bundled into itineraries."],
          "kpis": [("multi", 3), ("nights", 0.2)]},
     ]},
    {"market": "Malaysia", "primary": "mega-events",
     "headline": "A steady, flat-growth market: concerts, food festivals and heritage to lift demand.",
     "plays": [
         {"pillar": "mega-events", "initiatives": [
             "Concerts and food festivals packaged with Malaysian low-cost carriers.",
             "Cantonese food-heritage trails promoted in Kuala Lumpur, Johor Bahru and Penang."],
          "kpis": [("growth", 5), ("nights", 0.2)]},
         {"pillar": "gba", "initiatives": [
             "Hong Kong + Macao + Guangdong ancestral-hometown itineraries.",
             "Rail and ferry passes bundled with Hong Kong hotel stays."],
          "kpis": [("multi", 3), ("spend", 0.05)]},
     ]},
    {"market": "Canada", "primary": "gba",
     "headline": "A fast-growing, long-staying market centred on Toronto and Vancouver, but spend per visitor fell in 2026.",
     "plays": [
         {"pillar": "gba", "initiatives": [
             "Heritage trips into Guangdong combined with Hong Kong stays for Toronto and Vancouver families.",
             "Multi-city fares (Hong Kong + Greater Bay Area + Asia) with Canadian carriers."],
          "kpis": [("multi", 3), ("growth", 10)]},
         {"pillar": "high-value", "initiatives": [
             "'Homecoming' packages built around food, culture and family gatherings.",
             "Off-peak promotions to spread long stays away from Christmas and Lunar New Year peaks."],
          "kpis": [("spend", 0.08), ("first", 3)]},
     ]},
    {"market": "United Kingdom", "primary": "high-value",
     "headline": "Long stays and solid spend: stopovers, culture and nightlife.",
     "plays": [
         {"pillar": "high-value", "initiatives": [
             "Stopover packages on routes to Australia and Southeast Asia.",
             "Culture and nightlife itineraries (WestK, Old Town Central, Lan Kwai Fong)."],
          "kpis": [("spend", 0.05), ("growth", 8)]},
         {"pillar": "gba", "initiatives": [
             "Multi-destination Asia itineraries starting or ending in Hong Kong.",
             "Promote 144-hour visa-free transit into the Greater Bay Area."],
          "kpis": [("multi", 3), ("nights", 0.2)]},
     ]},
    {"market": "Indonesia", "primary": "mega-events",
     "headline": "A family market that fell sharply in 2026: rebuild with family and Muslim-friendly products.",
     "plays": [
         {"pillar": "mega-events", "initiatives": [
             "Family theme-park bundles timed to Indonesian school holidays and Lebaran.",
             "Muslim-friendly dining and prayer-room guide covering events and attractions."],
          "kpis": [("growth", 10), ("family", 3)]},
         {"pillar": "gba", "initiatives": [
             "Hong Kong + Macao packages through agents in Jakarta and Surabaya.",
             "Ferry / HZMB transfers bundled at a single price."],
          "kpis": [("multi", 3), ("spend", 0.05)]},
     ]},
    {"market": "Russia", "primary": "high-value",
     "headline": "A surging market made up mostly of first-timers: convert curiosity into longer stays and repeat visits.",
     "plays": [
         {"pillar": "high-value", "initiatives": [
             "Winter-sun and city-break packages via direct and Gulf-hub flights.",
             "Russian-language visitor information at major attractions and hotels."],
          "kpis": [("spend", 0.05), ("nights", 0.3)]},
         {"pillar": "mega-events", "initiatives": [
             "New Year and winter festival packages.",
             "Repeat-visit offers for first-time visitors (second-trip discounts with partner hotels)."],
          "kpis": [("growth", 15), ("overnight", 3)]},
     ]},
    {"market": "Germany", "primary": "high-value",
     "headline": "A fast-growing, first-timer market with short stays and below-average spend.",
     "plays": [
         {"pillar": "high-value", "initiatives": [
             "Link trade-fair travellers (Frankfurt, Munich) to HKCEC and AsiaWorld-Expo exhibitions.",
             "Hiking and Geopark packages (Dragon's Back, Sai Kung) that add nights."],
          "kpis": [("nights", 0.3), ("spend", 0.08)]},
         {"pillar": "gba", "initiatives": [
             "Hong Kong as the start of Greater Bay Area and Southeast Asia round trips.",
             "German-language multi-destination itineraries with tour operators."],
          "kpis": [("multi", 3), ("growth", 8)]},
     ]},
    {"market": "France", "primary": "high-value",
     "headline": "Culture-led first-timers with growing arrivals: art, design and gastronomy.",
     "plays": [
         {"pillar": "high-value", "initiatives": [
             "Art and design itineraries (M+, Palace Museum, PMQ, Tai Kwun) with French media partners.",
             "Gastronomy weeks pairing Hong Kong and French chefs."],
          "kpis": [("spend", 0.05), ("nights", 0.2)]},
         {"pillar": "gba", "initiatives": [
             "Hong Kong + Macao + Guangzhou cultural-heritage circuits.",
             "Multi-destination Asia itineraries through French tour operators."],
          "kpis": [("multi", 3), ("first", 3)]},
     ]},
    {"market": "Middle East", "primary": "high-value",
     "headline": "The highest spend per visitor of all markets: luxury, Muslim-friendly and MICE.",
     "plays": [
         {"pillar": "high-value", "initiatives": [
             "Luxury retail, family and Muslim-friendly hotel packages promoted in Saudi Arabia and the UAE.",
             "Expand halal-certified dining and prayer facilities at major attractions."],
          "kpis": [("spend", 0.05), ("growth", 15)]},
         {"pillar": "gba", "initiatives": [
             "Hong Kong + Macao + Greater Bay Area itineraries sold with Gulf carriers.",
             "Turkish- and Arabic-language trip planning content."],
          "kpis": [("multi", 3), ("nights", 0.2)]},
     ]},
]

log = logging.getLogger("tourism")


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
class SourceRegistry:
    """Tracks the provenance of every input file and any manual inputs still pending."""

    def __init__(self):
        self.items = []
        self.pending = []

    def add(self, sid, name, url, mode, note=""):
        self.items.append({"id": sid, "name": name, "url": url, "mode": mode, "note": note})
        log.info("  %-28s %s", sid, mode.upper())


def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def num(value):
    if value in ("", None):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = str(value).replace(",", "").strip()
    return float(cleaned) if cleaned else None


def clean(text):
    return re.sub(r"\s+", " ", str(text)).strip()


def load_manual(registry):
    """Read manual CSVs; register empty ones as pending."""
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
            source = rows[0].get("source") or "Source not stated."
            registry.add("manual_" + fname[:-4], desc, "data/manual/" + fname, "manual",
                         "{} rows supplied manually ({}).".format(len(rows), source))
        else:
            registry.pending.append({"id": fname[:-4], "tab": tab, "item": desc, "source": where,
                                     "file": "data/manual/" + fname, "columns": cols})
    return out


def load_country_profiles(registry):
    """Read the user-supplied country profiles, preserving the submitted CSV."""
    path = MANUAL_DIR / "visitor_profile.csv"
    with path.open(newline="", encoding="utf-8-sig") as fh:
        raw = list(csv.reader(fh))
    if not raw:
        raise ValueError("visitor_profile.csv is empty")
    if len(raw[0]) == 1:
        if any(len(row) != 1 for row in raw if row):
            raise ValueError("Inconsistent country profile CSV row format")
        raw = [next(csv.reader(row)) for row in raw if row and row[0].strip()]
    if raw[0] != ["period", "market", "dimension", "category", "value"]:
        raise ValueError("visitor_profile.csv must contain period,market,dimension,category,value")
    periods = {"2025 H1": "2025-H1", "2025 H2": "2025-H2",
               "2026 H1": "2026-H1", "2025 Full Year": "2025"}
    dimensions = {"age_group", "first_timer_pct", "mean_age", "avg_nights",
                  "per_capita_overnight_hkd", "trip_purpose", "companion", "origin_region", "place_rank"}
    entries, seen, purposes = [], set(), {}
    for row in raw[1:]:
        if not any(value.strip() for value in row):
            continue
        if len(row) != 5:
            raise ValueError("Invalid country profile row: {}".format(row))
        period, market, dimension, category, value = (value.strip() for value in row)
        key = (period, market, dimension, category)
        number = num(value)
        if period not in periods or market not in HKTB_MARKETS or dimension not in dimensions \
                or not category or number is None or not math.isfinite(number) or number < 0 or key in seen:
            raise ValueError("Invalid or duplicate country profile row: {}".format(row))
        if dimension in ("age_group", "first_timer_pct", "trip_purpose", "companion", "origin_region") and number > 100:
            raise ValueError("Invalid country profile percentage: {}".format(row))
        seen.add(key)
        period = periods[period]
        if dimension == "trip_purpose":
            purposes.setdefault((period, market), {})[category] = number
            continue
        if dimension == "age_group":
            dimension = "age_share_pct"
        entries.append({"period": period, "market": market, "dimension": dimension,
                        "category": category, "value": str(number), "source": "User-provided; original source not stated"})
        if period == "2025-H1" and dimension == "per_capita_overnight_hkd":
            entries.append({"period": "2025", "market": market, "dimension": "per_capita_overnight_h1_hkd",
                            "category": category, "value": str(number), "source": "User-provided; original source not stated"})
    categories = ["Sameday visitors", "Vacation", "Visiting friends / relatives", "Business", "En-route", "Others"]
    for (period, market), values in purposes.items():
        if set(values) != set(categories) or abs(sum(values.values()) - 100) > 3.5:
            raise ValueError("Incomplete or invalid country purpose percentages for {} {}".format(period, market))
        entries.append({"period": period, "market": market, "dimension": "country_visitor_type_share",
                        "category": "Same-day", "value": str(values["Sameday visitors"]),
                        "source": "User-provided; original source not stated"})
        for category in categories[1:]:
            entries.append({"period": period, "market": market, "dimension": "country_trip_purpose",
                            "category": category, "value": str(values[category]),
                            "source": "User-provided; original source not stated"})
    registry.add("country_profile_update", "User-provided country visitor profiles",
                 "data/manual/visitor_profile.csv", "manual", "Original source not stated.")
    return entries


def merge_country_profiles(baseline, updates):
    replaced = {(r["period"], r["market"], r["dimension"]) for r in updates}
    return [r for r in baseline if (r["period"], r["market"], r["dimension"]) not in replaced] + updates


def country_age_quarters(rows):
    """Validate standalone quarterly age counts without filling missing periods."""
    valid_periods = {"2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4", "2026-Q1", "2026-Q2"}
    valid_ages = {age for _, age in AGE_COLUMNS}
    seen = set()
    result = []
    for row in rows:
        period, market, age = (row.get("period") or "").strip(), (row.get("market") or "").strip(), (row.get("age_group") or "").strip()
        source = (row.get("source") or "").strip()
        count = num(row.get("count"))
        key = (period, market, age)
        if period not in valid_periods or market not in HKTB_MARKETS or age not in valid_ages or not source \
                or count is None or not math.isfinite(count) or count < 0 or not count.is_integer() or key in seen:
            raise ValueError("Invalid or duplicate country_age_quarterly.csv row: {}".format(row))
        seen.add(key)
        result.append({"period": period, "market": market, "age_group": age, "count": int(count), "source": source})
    return result


def read_xls(data):
    """Minimal BIFF8 (.xls) reader -> {sheet_name: {(row, col): value}} with strings and numbers."""
    workbook = _ole_stream(data, ("Workbook", "Book"))
    records, pos = [], 0
    while pos + 4 <= len(workbook):
        rid, size = struct.unpack_from("<HH", workbook, pos)
        records.append((rid, workbook[pos + 4:pos + 4 + size]))
        pos += 4 + size
    sst, names, sheets, cells = [], [], {}, None
    for i, (rid, body) in enumerate(records):
        if rid == 0x85:  # BOUNDSHEET
            length, wide = body[6], body[7] & 1
            names.append(body[8:8 + length * (2 if wide else 1)].decode("utf-16-le" if wide else "latin-1"))
        elif rid == 0xFC:  # SST (+ CONTINUE records)
            chunks = [body]
            j = i + 1
            while j < len(records) and records[j][0] == 0x3C:
                chunks.append(records[j][1])
                j += 1
            sst = _parse_sst(chunks)
        elif rid == 0x809 and struct.unpack_from("<H", body, 2)[0] == 0x10:  # BOF of a worksheet
            cells = sheets.setdefault(names[len(sheets)], {})
        elif cells is None:
            continue
        elif rid == 0xFD:  # LABELSST
            r, c, _, k = struct.unpack_from("<HHHI", body)
            cells[(r, c)] = sst[k]
        elif rid == 0x203:  # NUMBER
            r, c, _, v = struct.unpack_from("<HHHd", body)
            cells[(r, c)] = v
        elif rid == 0x27E:  # RK
            r, c, _, v = struct.unpack_from("<HHHI", body)
            cells[(r, c)] = _rk(v)
        elif rid == 0xBD:  # MULRK
            r, c = struct.unpack_from("<HH", body)
            for k in range((len(body) - 6) // 6):
                cells[(r, c + k)] = _rk(struct.unpack_from("<I", body, 6 + k * 6)[0])
        elif rid == 0x06 and body[12:14] != b"\xff\xff":  # FORMULA with a cached number
            r, c = struct.unpack_from("<HH", body)
            cells[(r, c)] = struct.unpack_from("<d", body, 6)[0]
    return sheets


def _ole_stream(data, wanted):
    sector = 1 << struct.unpack_from("<H", data, 30)[0]
    mini_sector = 1 << struct.unpack_from("<H", data, 32)[0]
    n_fat, dir_start = struct.unpack_from("<II", data, 44)
    mini_cutoff, mini_fat_start, _, difat_start, n_difat = struct.unpack_from("<IIIII", data, 56)
    sec = lambda i: data[512 + i * sector:512 + (i + 1) * sector]  # noqa: E731
    difat = list(struct.unpack_from("<109I", data, 76))
    s = difat_start
    for _ in range(n_difat):
        block = sec(s)
        difat += struct.unpack_from("<%dI" % (sector // 4 - 1), block)
        s = struct.unpack_from("<I", block, sector - 4)[0]
    fat = []
    for f in difat[:n_fat]:
        fat += struct.unpack_from("<%dI" % (sector // 4), sec(f))

    def chain(start, table, read):
        out, s = [], start
        while s < 0xFFFFFFFA:
            out.append(read(s))
            s = table[s]
        return b"".join(out)

    directory = chain(dir_start, fat, sec)
    entries = []
    for i in range(len(directory) // 128):
        e = directory[i * 128:(i + 1) * 128]
        name_len = struct.unpack_from("<H", e, 64)[0]
        entries.append((e[:max(name_len - 2, 0)].decode("utf-16-le"), *struct.unpack_from("<II", e, 116)))
    for name, start, size in entries:
        if name not in wanted:
            continue
        if size >= mini_cutoff:
            return chain(start, fat, sec)[:size]
        mini_fat = list(struct.unpack("<%dI" % (len(chain(mini_fat_start, fat, sec)) // 4), chain(mini_fat_start, fat, sec)))
        mini = chain(entries[0][1], fat, sec)
        return chain(start, mini_fat, lambda i: mini[i * mini_sector:(i + 1) * mini_sector])[:size]
    raise ValueError("no workbook stream in .xls file")


def _rk(v):
    if v & 2:
        x = float((v >> 2) - (1 << 30) if v & 0x80000000 else v >> 2)
    else:
        x = struct.unpack("<d", struct.pack("<Q", (v & 0xFFFFFFFC) << 32))[0]
    return x / 100 if v & 1 else x


def _parse_sst(chunks):
    data, ci, pos = chunks[0], 0, 8
    out = []
    for _ in range(struct.unpack_from("<I", data, 4)[0]):
        if pos >= len(data):
            ci, pos = ci + 1, 0
            data = chunks[ci]
        length, flags = struct.unpack_from("<HB", data, pos)
        pos += 3
        runs = ext = 0
        if flags & 8:
            runs = struct.unpack_from("<H", data, pos)[0]
            pos += 2
        if flags & 4:
            ext = struct.unpack_from("<I", data, pos)[0]
            pos += 4
        parts, wide, left = [], flags & 1, length
        while left:
            if pos >= len(data):
                ci += 1
                data, wide, pos = chunks[ci], chunks[ci][0] & 1, 1
            take = min(left, (len(data) - pos) // (2 if wide else 1))
            raw = data[pos:pos + take * (2 if wide else 1)]
            parts.append(raw.decode("utf-16-le" if wide else "latin-1"))
            pos += len(raw)
            left -= take
        skip = runs * 4 + ext
        while skip:
            if pos >= len(data):
                ci, pos = ci + 1, 0
                data = chunks[ci]
            step = min(skip, len(data) - pos)
            pos += step
            skip -= step
        out.append("".join(parts))
    return out


def xls_tables(sheets, titles, end_month="Jun"):
    """Tables in the HKTB TEAIT workbook -> {title: {row label: {year: value}}}.

    A table starts at one of the given English titles in column C, its header rows map
    'Jan - <end_month> YYYY' to columns, each data row has an English label in column D, and the
    table ends at the first row without values (footnotes).
    """
    tables = {}
    for cells in sheets.values():
        rows = defaultdict(dict)
        for (r, c), v in cells.items():
            rows[r][c] = v
        title, years = None, {}
        for r in sorted(rows):
            row = rows[r]
            if isinstance(row.get(2), str) and clean(row[2]) in titles:
                title, years = clean(row[2]), {}
                continue
            if not title:
                continue
            for c, v in row.items():
                m = re.match(r"Jan - {} (\d{{4}})".format(re.escape(end_month)), str(v).strip())
                if m and m.group(1) not in years.values():
                    years[c] = m.group(1)
            values = {y: row[c] for c, y in years.items() if isinstance(row.get(c), float)}
            if isinstance(row.get(3), str) and values:
                tables.setdefault(title, {})[re.sub(r"\s*\(\d\)$", "", clean(row[3]))] = values
            elif title in tables and not values:
                title, years = None, {}
    return tables


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


def load_hktb_arrivals(registry):
    """Arrivals by nationality from HKTB's monthly workbooks: Jan-Jun by market, visitor type, gender and age."""
    files = sorted(path for path in (ROOT / "data").glob(HKTB_ARRIVALS_GLOB) if not path.name.startswith("~$"))
    monthly, h1 = [], []
    for path in files:
        year = re.match(r"\d{4}", path.name).group(0)
        sheets = read_xlsx(path.read_bytes())
        header = sheets.get("Table 4", {}).get(3, {}).get("D", "")
        period = re.search(r"\bJan to (Jun|Dec) (\d{4})\b", header)
        if not period or period.group(2) != year:
            raise ValueError("{}: unrecognized Table 4 reporting period".format(path.name))
        if period.group(1) != "Jun":
            log.info("  Skipping non-H1 nationality workbook: %s", path.name)
            continue

        def rows_by_name(sheet):
            out = {}
            for row in sheets.get(sheet, {}).values():
                name = re.sub(r"\s+", " ", html.unescape(row.get("E", ""))).strip()
                name = HKTB_NAME_ALIASES.get(name, name)
                if name and name not in out:
                    out[name] = row
            return out

        appendix, table4, table9 = rows_by_name("Appendix"), rows_by_name("Table 4"), rows_by_name("Table 9")
        total_by_month = {m: num(appendix["Total"].get(c)) for c, m in APPENDIX_MONTH_COLUMNS}
        for col, m in APPENDIX_MONTH_COLUMNS:
            month = "{}-{:02d}".format(year, m)
            if total_by_month[m] is None:
                continue
            named = 0
            for market in list(HKTB_MARKETS) + sorted(HKTB_EXTRA_H1_MARKETS):
                value = int(num(appendix[market][col]))
                named += value
                monthly.append({"month": month, "market": market, "arrivals": value})
            monthly.append({"month": month, "market": "Other markets", "arrivals": int(total_by_month[m]) - named})
        for name, row4 in table4.items():
            label = name if name in HKTB_MARKETS or name in HKTB_EXTRA_H1_MARKETS else HKTB_SEGMENT_ROWS.get(name)
            if not label:
                continue
            row9 = table9.get(name, {})
            arrivals = int(num(row4["F"]))
            age_counts = {}
            if all(row9.get(c) is not None for c, _ in AGE_COLUMNS):
                for col, age_label in AGE_COLUMNS:
                    count = num(row9[col]) * arrivals / 100
                    if abs(count - round(count)) > 0.0001:
                        raise ValueError("{}: age percentage does not resolve to a count for {}".format(path.name, name))
                    age_counts[age_label] = round(count)
                if sum(age_counts.values()) != arrivals:
                    raise ValueError("{}: age counts do not sum to arrivals for {}".format(path.name, name))
            h1.append({
                "period": "{}-H1".format(year), "market": label,
                "arrivals": arrivals, "same_day": int(num(row4["J"])), "overnight": int(num(row4["N"])),
                "male_pct": round(num(row9.get("G")), 1) if row9.get("G") else None,
                "mean_age": round(num(row9.get("T")), 1) if row9.get("T") else None,
                "age": {label_: round(num(row9[c]), 1) for c, label_ in AGE_COLUMNS if row9.get(c)},
                "age_counts": age_counts,
            })
    if files:
        registry.add("hktb_arrivals_nationality", "HKTB: Visitor arrival statistics by nationality (monthly workbooks)",
                     "data/" + HKTB_ARRIVALS_GLOB, "manual",
                     "Jan-Jun 2025 & Jan-Jun 2026 editions: monthly arrivals, same-day/overnight, gender and age by market.")
    return monthly, h1


def build_market_playbooks(profile_rows, market_h1):
    """Market playbooks for the 2027 pillars: HKTB-data baselines with proposed 2027 targets."""
    def pv(period, market, dimension, category=None):
        for r in profile_rows:
            if r["period"] == period and r["market"] == market and r["dimension"] == dimension \
                    and (category is None or r["category"] == category) and r["value"] not in ("", None):
                return float(r["value"])
        return None

    def h1(period, market):
        return next((r for r in market_h1 if r["period"] == period and r["market"] == market), None)

    def places(market):
        rows = [r for r in profile_rows if r["period"] == "2026-H1" and r["market"] == market and r["dimension"] == "place_rank"]
        return [r["category"] for r in sorted(rows, key=lambda r: float(r["value"]))]

    playbooks = []
    for spec in MARKET_PLAYBOOKS:
        m = spec["market"]
        now, before = h1("2026-H1", m), h1("2025-H1", m)
        yoy = round((now["arrivals"] / before["arrivals"] - 1) * 100, 1) if now and before else None
        overnight = round(now["overnight"] / now["arrivals"] * 100, 1) if now else None
        segment = HKTB_MARKETS[m] if HKTB_MARKETS[m] != "Emerging" else "Long-haul"
        top_places = places(m)

        def kpi(spec_kpi):
            kind, *args = spec_kpi
            if kind == "growth":
                return {"metric": "Arrivals growth (YoY)", "baseline": "{:+.1f}% (Jan-Jun 2026)".format(yoy) if yoy is not None else "n/a",
                        "target_2027": "{:+.0f}%".format(args[0])}
            if kind == "overnight":
                base = math.floor(overnight + 0.5)
                return {"metric": "Overnight share of arrivals", "baseline": "{}%".format(base),
                        "target_2027": "{}%".format(base + args[0])}
            if kind == "nights":
                v = pv("2026-H1", m, "avg_nights")
                return {"metric": "Average nights (overnight visitors)", "baseline": "{:.1f}".format(v), "target_2027": "{:.1f}".format(v + args[0])}
            if kind == "spend":
                v = pv("2026-H1", m, "per_capita_overnight_hkd")
                return {"metric": "Spend per overnight visitor", "baseline": "HK${:,.0f}".format(v),
                        "target_2027": "HK${:,.0f}".format(round(v * (1 + args[0]), -2))}
            if kind == "first":
                v = pv("2026-H1", m, "first_timer_pct")
                return {"metric": "First-time visitors", "baseline": "{:.0f}%".format(v), "target_2027": "{:.0f}%".format(v + args[0])}
            if kind == "family":
                v = pv("2026-H1", m, "companion", "With family members")
                return {"metric": "Overnight visitors travelling with family", "baseline": "{:.0f}%".format(v),
                        "target_2027": "{:.0f}%".format(v + args[0])}
            if kind == "multi":
                v = pv("2025", segment, "itinerary", "Multi-destination")
                return {"metric": "Multi-destination trips ({} segment)".format(segment), "baseline": "{:.0f}% (2025)".format(v),
                        "target_2027": "{:.0f}%".format(v + args[0])}
            if kind == "place":
                name, target = args
                rank = top_places.index(name) + 1 if name in top_places else None
                return {"metric": "{}: rank among places visited".format(name),
                        "baseline": "#{}".format(rank) if rank else "Not in top 10", "target_2027": target}
            raise ValueError("unknown KPI kind " + kind)

        playbooks.append({
            "market": m, "origin": HKTB_MARKETS[m], "primary": spec["primary"], "headline": spec["headline"],
            "facts": {
                "arrivals_h1_2026": now["arrivals"] if now else None, "yoy_pct": yoy, "overnight_pct": overnight,
                "nights": pv("2026-H1", m, "avg_nights"), "spend_hkd": pv("2026-H1", m, "per_capita_overnight_hkd"),
                "first_timer_pct": pv("2026-H1", m, "first_timer_pct"), "mean_age": pv("2026-H1", m, "mean_age"),
                "top_places": top_places[:3],
            },
            "plays": [{"pillar": p["pillar"], "initiatives": p["initiatives"], "kpis": [kpi(k) for k in p["kpis"]]} for p in spec["plays"]],
        })
    return playbooks



# --------------------------------------------------------------------------- #
# Executive summary inputs (files supplied with the project)
# --------------------------------------------------------------------------- #
T_TOTAL = "Total Tourism Expenditure Associated to Inbound Tourism"
T_OVERNIGHT_AREA = "Total Overnight Visitor Spending by Major Market Areas"
T_OVERNIGHT_PC = "Per Capita Overnight Visitor Spending by Major Market Areas"
T_SAMEDAY_AREA = "Total Same-day Visitor Spending by Major Market Areas"
T_SAMEDAY_PC = "Per Capita Same-day Visitor Spending by Major Market Areas"


def month_key(year, mon):
    return "{}-{:02d}".format(year, MONTHS.index(mon.strip()[:3].title()) + 1)


def load_monthly_arrivals(registry):
    """Monthly arrivals by region -> total, segment and TEAIT market-area series."""
    by_month = defaultdict(lambda: defaultdict(float))
    for r in read_csv(DATA_DIR / ARRIVALS_CSV):
        month = month_key(r["Year"].strip(), r["MM"])
        value = num(r["OBS_VALUE"]) or 0
        region = clean(r["REGION"])
        area = REGION_AREA.get(region)
        by_month[month]["All"] += value
        if area:
            by_month[month][area] += value
            by_month[month][AREA_SEGMENT[area]] += value
        elif region == "Not identified":
            by_month[month]["Short-haul"] += value
    months = [m for m in sorted(by_month) if m <= DATA_END]
    registry.add("arrivals_by_region", "Visitor arrivals by nationality / region (monthly)", "data/" + ARRIVALS_CSV, "supplied",
                 "{} to {}; regions grouped into the TEAIT market areas.".format(months[0], months[-1]))
    return months, {m: {k: int(round(v)) for k, v in by_month[m].items()} for m in months}


def load_length_of_stay(registry):
    out = {}
    for r in read_csv(DATA_DIR / LENGTH_OF_STAY_CSV):
        mon, yy = r["CCYY"].strip().split("-")
        month = month_key("20" + yy, mon)
        if month <= DATA_END:
            out[month] = num(r["Length of stay"])
    registry.add("length_of_stay", "Average length of stay of overnight visitors (monthly)", "data/" + LENGTH_OF_STAY_CSV, "supplied",
                 "Nights per overnight visitor, {} to {}.".format(min(out), max(out)))
    return out


def load_targets(registry):
    targets = {}
    for year in H1_YEARS:
        with open(DATA_DIR / KPI_CSV.format(year), newline="", encoding="utf-8-sig") as fh:
            rows = list(csv.reader(fh))
        values = {clean(r[1]).lower(): num(r[2]) for r in rows[1:] if len(r) > 2 and num(r[2]) is not None}
        targets[year] = {
            "arrivals": values["total visitor arrivals"],
            "length_of_stay": values["average length of stay of overnight visitors (nights)"],
            "overnight_per_capita_hkd": values["per capital spending of overnight visitor (hk$)"],
            "satisfaction": values["satisfaction"],
            "receipts_hkd_m": round(values["total spending of inbound toursim"] / 1e6, 3),
        }
    registry.add("kpi_targets", "Government targets for 2025 and 2026", "data/" + KPI_CSV.format("2025"), "supplied",
                 "Arrivals, total spending, length of stay, overnight spend per visitor and satisfaction.")
    return targets


def load_visitor_types(registry):
    out = defaultdict(dict)
    for r in read_csv(DATA_DIR / VISITOR_TYPE_CSV):
        out[r["year"]][r["origin"]] = {"visitors": int(num(r["total_visitors"])), "overnight": int(num(r["overnight_visitors"])),
                                       "same_day": int(num(r["same_day_visitors"]))}
    registry.add("visitor_types_h1", "Jan-Jun overnight and same-day visitors by segment", "data/" + VISITOR_TYPE_CSV, "supplied",
                 "From the HKTB visitor-type workbooks (Table 4).")
    return dict(out)


def load_expenditure(registry):
    titles = {T_TOTAL, T_OVERNIGHT_AREA, T_OVERNIGHT_PC, T_SAMEDAY_AREA, T_SAMEDAY_PC, *SPEND_CATEGORY_TABLES.values()}
    tables = xls_tables(read_xls((DATA_DIR / EXPENDITURE_XLS).read_bytes()), titles)
    missing = titles - set(tables)
    if missing:
        raise ValueError("TEAIT tables not found: " + ", ".join(sorted(missing)))
    registry.add("hktb_teait", "HKTB: Tourism Expenditure Associated to Inbound Tourism, Jan-Jun 2025 and 2026",
                 "data/" + EXPENDITURE_XLS, "supplied",
                 "Spending by visitor type, market area and category. Passenger international transportation is a C&SD figure within the HKTB total.")
    return tables


def load_quarterly(registry):
    sheets = read_xlsx((DATA_DIR / QUARTERLY_XLSX).read_bytes())
    quarterly = []
    for row in sheets["Quarterly Update"].values():
        q = re.match(r"Q([1-4])$", row.get("B", "").strip())
        if re.match(r"\d{4}$", row.get("A", "").strip()) and q and num(row.get("C")) is not None:
            quarterly.append({"year": int(row["A"]), "quarter": int(q.group(1)), "value": num(row["C"])})
    overnight = {}
    for row in sheets["Market Area Averages"].values():
        area = html.unescape(row.get("A", "")).strip()
        if area in AREA_SEGMENT:
            overnight[area] = {"2025": int(num(row["C"])), "2026": int(num(row["F"]))}
    registry.add("quarterly_overnight_spend", "Average spend per overnight visitor (quarterly) and market-area overnight visitors",
                 "data/" + QUARTERLY_XLSX, "supplied", "Compiled from the TEAIT releases and the HKTB visitor-type workbooks.")
    return sorted(quarterly, key=lambda q: (q["year"], q["quarter"])), overnight


def load_quarterly_visitor_spend(registry):
    """Derive standalone quarterly spend per visitor from cumulative TEAIT releases."""
    titles = {T_TOTAL, T_OVERNIGHT_PC, T_SAMEDAY_PC}
    previous = {}
    result = []
    for year, quarter, end_month, filename in QUARTERLY_TEAIT_FILES:
        tables = xls_tables(read_xls((DATA_DIR / filename).read_bytes()), titles, end_month)
        if quarter == 1:
            previous = {}
        record = {"year": year, "quarter": quarter}
        for kind, total_row, per_capita_table in (
            ("overnight", "Overnight Visitors", T_OVERNIGHT_PC),
            ("same_day", "Same-day Visitors", T_SAMEDAY_PC),
        ):
            total = tables[T_TOTAL][total_row][str(year)]
            per_capita = tables[per_capita_table]["Total"][str(year)]
            if total <= 0 or per_capita <= 0:
                raise ValueError("{}: invalid cumulative {} spending".format(filename, kind))
            count = total * 1e6 / per_capita
            prior_total, prior_count = previous.get(kind, (0, 0))
            if total <= prior_total or count <= prior_count:
                raise ValueError("{}: invalid quarterly {} spending".format(filename, kind))
            record[kind + "_per_capita_hkd"] = (total - prior_total) * 1e6 / (count - prior_count)
            previous[kind] = (total, count)
        result.append(record)
        registry.add("quarterly_visitor_spend_{}_q{}".format(year, quarter),
                     "HKTB TEAIT cumulative expenditure to {} {}".format(end_month, year),
                     "data/" + filename, "supplied",
                     "Standalone quarters derived from cumulative visitor-type and market-area spending.")
    return result


def load_quarterly_segment_spend(monthly):
    """Derive quarterly market expenditure per arrival from cumulative TEAIT releases."""
    titles = {T_OVERNIGHT_AREA, T_SAMEDAY_AREA}
    aliases = {
        "Mainland China": ("Mainland China", "Mainland", "Chinese Mainland"),
        "Macau SAR": ("Macau SAR", "Macao SAR"),
    }
    previous = {}
    result = []
    for year, quarter, end_month, filename in QUARTERLY_TEAIT_FILES:
        tables = xls_tables(read_xls((DATA_DIR / filename).read_bytes()), titles, end_month)
        if quarter == 1:
            previous = {}
        for segment in SEGMENTS:
            total = 0
            for area, area_segment in AREA_SEGMENT.items():
                if area_segment != segment:
                    continue
                for title in titles:
                    rows = tables[title]
                    name = next((name for name in aliases.get(area, (area,)) if name in rows), None)
                    if name is None or str(year) not in rows[name]:
                        raise ValueError("{}: missing {} spending for {}".format(filename, title, area))
                    total += rows[name][str(year)]
            spending = total - previous.get(segment, 0)
            months = ["{}-{:02d}".format(year, month) for month in range((quarter - 1) * 3 + 1, quarter * 3 + 1)]
            arrivals = sum(monthly[month][segment] for month in months)
            if spending <= 0 or arrivals <= 0:
                raise ValueError("{}: invalid quarterly spending or arrivals for {}".format(filename, segment))
            result.append({
                "year": year, "quarter": quarter, "segment": segment,
                "spend_hkd_m": spending, "arrivals": arrivals,
                "average_spend_hkd": spending * 1e6 / arrivals,
            })
            previous[segment] = total
    return result


def build_summary(registry):
    months, monthly = load_monthly_arrivals(registry)
    los = load_length_of_stay(registry)
    targets = load_targets(registry)
    types = load_visitor_types(registry)
    tables = load_expenditure(registry)
    quarterly, area_overnight = load_quarterly(registry)
    quarterly_visitor_spend = load_quarterly_visitor_spend(registry)
    quarterly_segment_spend = load_quarterly_segment_spend(monthly)

    h1, areas, categories = {}, [], []
    for year in H1_YEARS:
        seg = types[year]
        total = tables[T_TOTAL]
        h1[year] = {
            "receipts_hkd_m": total[T_TOTAL][year],
            "destination_hkd_m": total["Total Destination Consumption Expenditure"][year],
            "overnight_spend_hkd_m": total["Overnight Visitors"][year],
            "same_day_spend_hkd_m": total["Same-day Visitors"][year],
            "overnight_visitors": sum(s["overnight"] for s in seg.values()),
            "same_day_visitors": sum(s["same_day"] for s in seg.values()),
            "overnight_per_capita_hkd": tables[T_OVERNIGHT_PC]["Total"][year],
            "same_day_per_capita_hkd": tables[T_SAMEDAY_PC]["Total"][year],
        }
        h1_months = ["{}-{:02d}".format(year, m) for m in range(1, 7)]
        for area, segment in AREA_SEGMENT.items():
            overnight_spend = tables[T_OVERNIGHT_AREA][area][year]
            same_day_spend = tables[T_SAMEDAY_AREA][area][year]
            areas.append({
                "area": area, "segment": segment, "year": year,
                "arrivals": sum(monthly[m].get(area, 0) for m in h1_months),
                "overnight_visitors": area_overnight.get(area, {}).get(year),
                "spend_hkd_m": round(overnight_spend + same_day_spend, 3),
                "overnight_spend_hkd_m": overnight_spend, "same_day_spend_hkd_m": same_day_spend,
                "overnight_per_capita_hkd": tables[T_OVERNIGHT_PC][area][year],
                "same_day_per_capita_hkd": tables[T_SAMEDAY_PC][area][year],
            })
        for (vtype, segment), title in SPEND_CATEGORY_TABLES.items():
            for category, values in tables[title].items():
                if category != "Total":
                    categories.append({"visitor_type": vtype, "segment": segment, "category": category, "year": year,
                                       "spend_hkd_m": values[year]})

    summary = {
        "months": months,
        "arrivals_monthly": monthly,
        "areas": [{"area": a, "segment": s} for a, s in AREA_SEGMENT.items()],
        "length_of_stay_monthly": los,
        "targets": targets,
        "segments_h1": types,
        "h1": h1,
        "area_h1": areas,
        "spend_categories": categories,
        "quarterly_overnight_per_capita": quarterly,
        "quarterly_visitor_spend": quarterly_visitor_spend,
        "quarterly_segment_spend": quarterly_segment_spend,
    }
    return summary, months


# --------------------------------------------------------------------------- #
# 2027 strategy pillars (rationale and KPIs from the HKTB / TEAIT data)
# --------------------------------------------------------------------------- #
def build_pillars(summary, profile_rows):
    def pv(period, market, dimension, category):
        for r in profile_rows:
            if r["period"] == period and r["market"] == market and r["dimension"] == dimension and r["category"] == category:
                return num(r["value"])
        return None

    def change(new, old):
        return (new / old - 1) * 100 if old else 0.0

    seg_now, seg_before = summary["segments_h1"]["2026"], summary["segments_h1"]["2025"]
    total = sum(s["visitors"] for s in seg_now.values())
    same_day_share = sum(s["same_day"] for s in seg_now.values()) / total * 100
    long_haul_share = seg_now["Long-haul"]["visitors"] / total * 100
    mainland_share = seg_now["Mainland"]["visitors"] / total * 100
    mainland_overnight = seg_now["Mainland"]["overnight"] / seg_now["Mainland"]["visitors"] * 100
    h1_now, h1_before = summary["h1"]["2026"], summary["h1"]["2025"]
    per_capita = {(a["area"], a["year"]): a["overnight_per_capita_hkd"] for a in summary["area_h1"]}
    month_totals = {m: v["All"] for m, v in summary["arrivals_monthly"].items() if m.startswith("2026")}
    peak, low = max(month_totals, key=month_totals.get), min(month_totals, key=month_totals.get)
    cat = {(c["category"], c["year"]): c["spend_hkd_m"] for c in summary["spend_categories"]
           if c["visitor_type"] == "Overnight" and c["segment"] == "All markets"}
    hotel_growth = change(cat[("Hotel Bills", "2026")], cat[("Hotel Bills", "2025")])
    entertainment_growth = change(cat[("Entertainment", "2026")], cat[("Entertainment", "2025")])
    long_multi = pv("2025", "Long-haul", "itinerary", "Multi-destination")
    short_macao = pv("2025", "Short-haul", "other_destination", "Macao SAR")
    month_label = lambda m: datetime.strptime(m, "%Y-%m").strftime("%b %Y")  # noqa: E731

    return [
        {
            "id": "high-value", "number": 1,
            "title": "High-Value, Long-Haul Experience & MICE Diversification",
            "tagline": "From same-day shopping to overnight, experience-driven stays",
            "rationale": [
                "Same-day visitors account for {:.0f}% of Jan-Jun 2026 arrivals but spend HK${:,.0f} per head vs HK${:,.0f} for overnight visitors.".format(
                    same_day_share, h1_now["same_day_per_capita_hkd"], h1_now["overnight_per_capita_hkd"]),
                "Long-haul markets are only {:.1f}% of arrivals yet spend HK${:,.0f} per overnight visitor in the Americas and HK${:,.0f} in Europe, Africa & the Middle East.".format(
                    long_haul_share, per_capita[("The Americas", "2026")], per_capita[("Europe, Africa & the Middle East", "2026")]),
                "Overnight spend per visitor was flat: HK${:,.0f} in Jan-Jun 2025 and HK${:,.0f} in Jan-Jun 2026.".format(
                    h1_before["overnight_per_capita_hkd"], h1_now["overnight_per_capita_hkd"]),
            ],
            "initiatives": [
                "Scale 'CityWalk' neighbourhood trails (Sham Shui Po, Sai Kung, Central-Western) into bookable multi-day itineraries.",
                "Long-haul air-capacity incentives and stopover packages with airline partners through HKIA.",
                "MICE bid fund targeting association congresses at AsiaWorld-Expo, HKCEC and Kai Tak.",
                "Night-time economy and cultural districts (WestK, M+, Palace Museum) bundled as premium overnight products.",
            ],
            "kpis": [
                {"metric": "Overnight share of arrivals", "baseline": "{:.1f}%".format(100 - same_day_share),
                 "target_2027": "{:.1f}%".format(100 - same_day_share + 3)},
                {"metric": "Long-haul share of arrivals", "baseline": "{:.1f}%".format(long_haul_share),
                 "target_2027": "{:.1f}%".format(long_haul_share + 1.5)},
                {"metric": "Spend per overnight visitor (HKD)", "baseline": "{:,.0f}".format(h1_now["overnight_per_capita_hkd"]),
                 "target_2027": "{:,.0f}".format(round(h1_now["overnight_per_capita_hkd"] * 1.05, -1))},
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
                "Monthly arrivals ranged from {:.1f}M ({}) to {:.1f}M ({}) in the first half of 2026: events can fill the softer months.".format(
                    month_totals[low] / 1e6, month_label(low), month_totals[peak] / 1e6, month_label(peak)),
                "Hotel bills were HK${:.1f}bn of overnight visitor spending in Jan-Jun 2026, {:+.1f}% YoY.".format(
                    cat[("Hotel Bills", "2026")] / 1000, hotel_growth),
                "Overnight entertainment spending was HK${:.1f}bn ({:+.1f}% YoY), leaving room for event-led growth.".format(
                    cat[("Entertainment", "2026")] / 1000, entertainment_growth),
            ],
            "initiatives": [
                "Anchor a 12-month mega-event calendar at Kai Tak Sports Park (concerts, rugby sevens, e-sports).",
                "'Sports + Tourism', 'Culture + Tourism' bundles: event ticket + hotel + attraction passes.",
                "Target shoulder months (Jun, Sep) with signature festivals to smooth seasonality.",
                "Event-impact dashboard tracking incremental arrivals, hotel nights and spend per event.",
            ],
            "kpis": [
                {"metric": "Mega-events hosted", "baseline": "2025-26 calendar", "target_2027": "+20% events"},
                {"metric": "Overnight hotel-bill spending (YoY)", "baseline": "{:+.1f}%".format(hotel_growth), "target_2027": "+8-10%"},
                {"metric": "Overnight entertainment spending (YoY)", "baseline": "{:+.1f}%".format(entertainment_growth), "target_2027": "+5%"},
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
                "Mainland visitors made up {:.0f}% of Jan-Jun 2026 arrivals; only {:.0f}% of them stayed overnight.".format(
                    mainland_share, mainland_overnight),
                "Same-day Mainland visitors grew {:+.0f}% YoY against {:+.0f}% for overnight Mainland visitors.".format(
                    change(seg_now["Mainland"]["same_day"], seg_before["Mainland"]["same_day"]),
                    change(seg_now["Mainland"]["overnight"], seg_before["Mainland"]["overnight"])),
            ] + (["In 2025, {:.0f}% of long-haul overnight visitors made Hong Kong part of a multi-destination trip and {:.0f}% of short-haul visitors also went to Macao.".format(
                long_multi, short_macao)] if long_multi is not None and short_macao is not None else []),
            "initiatives": [
                "Joint 'One Trip, Multiple Destinations' packages with Macao and GBA cities.",
                "Single-ticketing across HSR, HZMB and ferries with integrated attraction passes.",
                "Optimise transit visa and 144-hour visa-free routing for international visitors via HKIA.",
                "Convert same-day Mainland flows into overnight stays with evening events and hotel bundles.",
            ],
            "kpis": [
                {"metric": "Multi-destination itineraries sold", "baseline": "Pilot", "target_2027": "500k travellers"},
                {"metric": "Mainland overnight conversion", "baseline": "{:.0f}%".format(mainland_overnight), "target_2027": "+3pp"},
                {"metric": "Long-haul multi-destination trips", "baseline": "{:.0f}% (2025)".format(long_multi) if long_multi is not None else "n/a",
                 "target_2027": "+5pp"},
            ],
            "timeline": [
                {"phase": "Q1 2027", "action": "Launch single-ticket pilot (HSR + HZMB + attraction pass)."},
                {"phase": "Q3 2027", "action": "Extend transit-visa routing campaign to long-haul source markets."},
            ],
        },
    ]


def simplify_ring(points, tolerance):
    """Reduce boundary vertices while keeping the district outline at map scale."""
    if len(points) <= 3:
        return points

    def distance_sq(point, start, end):
        dx, dy = end[0] - start[0], end[1] - start[1]
        if dx == 0 and dy == 0:
            return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2
        t = max(0, min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)))
        x, y = start[0] + t * dx, start[1] + t * dy
        return (point[0] - x) ** 2 + (point[1] - y) ** 2

    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    limit = tolerance * tolerance
    while stack:
        first, last = stack.pop()
        farthest, farthest_distance = None, limit
        for index in range(first + 1, last):
            distance = distance_sq(points[index], points[first], points[last])
            if distance > farthest_distance:
                farthest, farthest_distance = index, distance
        if farthest is not None:
            keep.add(farthest)
            stack.extend(((first, farthest), (farthest, last)))
    return [points[index] for index in sorted(keep)]


def build_district_boundaries(registry):
    """Create compact SVG paths from the supplied official district GeoJSON."""
    path = DATA_DIR / "hksar_18_district_boundary.json"
    if not path.is_file():
        raise FileNotFoundError("Missing official district boundaries: {}".format(path))
    with open(path, encoding="utf-8-sig", errors="replace") as fh:
        source = json.load(fh)

    registry.add(
        "hk_district_boundaries",
        "Hong Kong 18 administrative district boundaries",
        "https://www.had.gov.hk/psi/hong-kong-administrative-boundaries/hksar_18_district_boundary.json",
        "supplied",
        "Official district polygons from the Home Affairs Department; stored locally for offline builds.",
    )
    features = []
    all_points = []
    for feature in source["features"]:
        geometry = feature["geometry"]
        polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
        rings = []
        for polygon in polygons:
            for ring in polygon:
                points = [(float(point[0]), float(point[1])) for point in ring]
                rings.append(points)
                all_points.extend(points)
        features.append({"district": feature["properties"]["District"], "rings": rings})

    if not all_points:
        raise ValueError("The official district-boundary file contains no coordinates.")

    longitude_scale = math.cos(math.radians(22.3))
    projected = [(longitude * longitude_scale, latitude) for longitude, latitude in all_points]
    min_x = min(point[0] for point in projected)
    max_x = max(point[0] for point in projected)
    min_y = min(point[1] for point in projected)
    max_y = max(point[1] for point in projected)
    width, height, padding = 640, 420, 12
    scale = min((width - padding * 2) / (max_x - min_x), (height - padding * 2) / (max_y - min_y))

    def map_point(point):
        x, y = point[0] * longitude_scale, point[1]
        return padding + (x - min_x) * scale, height - padding - (y - min_y) * scale

    output = []
    for feature in features:
        commands = []
        for ring in feature["rings"]:
            simplified = simplify_ring(ring, 0.00005)
            if len(simplified) < 3:
                continue
            coords = [map_point(point) for point in simplified]
            commands.append("M" + "L".join("{:.1f},{:.1f}".format(x, y) for x, y in coords) + "Z")
        output.append({"district": feature["district"], "path": "".join(commands)})
    return output


# --------------------------------------------------------------------------- #
# Build JSON outputs
# --------------------------------------------------------------------------- #
def build_outputs(registry):
    log.info("Loading sources:")
    summary, months = build_summary(registry)
    manual = load_manual(registry)
    market_monthly, market_h1 = load_hktb_arrivals(registry)
    profile_rows = merge_country_profiles(manual["visitor_profile_baseline.csv"], load_country_profiles(registry))
    district_boundaries = build_district_boundaries(registry)

    demographics = {
        "markets": [{"market": m, "origin": o} for m, o in HKTB_MARKETS.items()],
        "market_monthly": market_monthly,
        "market_h1": market_h1,
        "country_age_quarterly": country_age_quarters(manual["country_age_quarterly.csv"]),
        "visitor_profile": [{"period": r["period"], "market": r["market"], "dimension": r["dimension"],
                             "category": r["category"], "value": num(r["value"])} for r in profile_rows],
        "mainland_origin_provinces": [
            {"period": r["period"], "rank": int(num(r["rank"])), "province_zh": r["province_zh"],
             "province_en": r["province_en"], "share_pct": num(r["share_pct"]),
             "all_visitors_share_pct": num(r["all_visitors_share_pct"])}
            for r in manual["mainland_origin_provinces.csv"]
        ],
    }
    playbooks = build_market_playbooks(profile_rows, market_h1) if profile_rows and market_h1 else []
    pillars = build_pillars(summary, profile_rows)
    for p in pillars:
        p["focus_markets"] = [b["market"] for b in playbooks if b["primary"] == p["id"]]
    return {
        "summary.json": summary,
        "visitor_demographics.json": demographics,
        "strategy_2027.json": {"pillars": pillars, "market_playbooks": playbooks},
        "hk_district_boundaries.json": {"districts": district_boundaries},
    }, (months[0], months[-1])


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="output directory for JSON files")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    registry = SourceRegistry()
    outputs, coverage = build_outputs(registry)
    meta = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "coverage": {"start": coverage[0], "end": coverage[1]},
        "sources": registry.items,
        "pending": registry.pending,
    }
    args.out.mkdir(parents=True, exist_ok=True)
    log.info("Writing outputs to %s:", args.out)
    for name, payload in outputs.items():
        path = args.out / name
        path.write_text(json.dumps({"meta": meta, **payload}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        log.info("  %-28s %6.1f KB", name, path.stat().st_size / 1024)
    if registry.pending:
        log.info("Pending (fill data/manual/*.csv to enable): %s", ", ".join(p["id"] for p in registry.pending))


if __name__ == "__main__":
    main()
