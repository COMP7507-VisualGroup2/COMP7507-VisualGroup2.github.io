import unittest

from process_tourism_data import (
    AREA_SEGMENT, SEGMENTS, T_OVERNIGHT_AREA, T_SAMEDAY_AREA, SourceRegistry,
    load_expenditure, load_monthly_arrivals, load_quarterly_segment_spend, load_visitor_types,
    load_quarterly_visitor_spend,
)


class QuarterlyVisitorSpendTest(unittest.TestCase):
    def test_standalone_quarters(self):
        rows = load_quarterly_visitor_spend(SourceRegistry())
        self.assertEqual(
            [(row["year"], row["quarter"]) for row in rows],
            [(2025, 1), (2025, 2), (2025, 3), (2025, 4), (2026, 1), (2026, 2)],
        )
        self.assertEqual(
            [(round(row["overnight_per_capita_hkd"] / 100), round(row["same_day_per_capita_hkd"] / 100)) for row in rows],
            [(55, 12), (53, 11), (53, 11), (58, 12), (55, 12), (54, 11)],
        )

    def test_quarterly_segment_spending(self):
        registry = SourceRegistry()
        _, monthly = load_monthly_arrivals(registry)
        rows = load_quarterly_segment_spend(monthly)
        self.assertEqual(len(rows), 18)
        mainland = [row for row in rows if row["segment"] == "Mainland"]
        self.assertEqual(
            [round(row["average_spend_hkd"]) for row in mainland],
            [2832, 2677, 2677, 2736, 2714, 2572],
        )
        self.assertEqual(
            [round(row["average_spend_hkd"]) for row in rows if row["segment"] == "Short-haul" and row["quarter"] in (3, 4)],
            [3845, 4141],
        )
        tables = load_expenditure(registry)
        visitor_types = load_visitor_types(registry)
        for year in ("2025", "2026"):
            for segment in SEGMENTS:
                h1 = [row for row in rows if row["year"] == int(year) and row["quarter"] <= 2 and row["segment"] == segment]
                self.assertEqual(sum(row["arrivals"] for row in h1), visitor_types[year][segment]["visitors"])
        for segment in SEGMENTS:
            h1 = [row for row in rows if row["year"] == 2026 and row["segment"] == segment]
            expected = sum(
                tables[title][area]["2026"]
                for area, group in AREA_SEGMENT.items() if group == segment
                for title in (T_OVERNIGHT_AREA, T_SAMEDAY_AREA)
            )
            self.assertAlmostEqual(sum(row["spend_hkd_m"] for row in h1), expected, places=2)


if __name__ == "__main__":
    unittest.main()
