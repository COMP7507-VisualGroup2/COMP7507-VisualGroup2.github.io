import unittest

from process_tourism_data import SourceRegistry, load_hktb_arrivals


class HktbArrivalsTest(unittest.TestCase):
    def test_vietnam_monthly_and_h1_arrivals(self):
        monthly, h1 = load_hktb_arrivals(SourceRegistry())
        vietnam = {row["period"]: row for row in h1 if row["market"] == "Vietnam"}
        self.assertEqual(vietnam["2025-H1"]["arrivals"], 33892)
        self.assertEqual(vietnam["2026-H1"]["arrivals"], 29511)
        self.assertEqual(vietnam["2026-H1"]["same_day"], 2266)
        self.assertEqual(vietnam["2026-H1"]["overnight"], 27245)
        vietnam_months = [row for row in monthly if row["market"] == "Vietnam"]
        self.assertEqual(len(vietnam_months), 12)
        for year in ("2025", "2026"):
            self.assertEqual(sum(row["arrivals"] for row in vietnam_months if row["month"].startswith(year)), vietnam[year + "-H1"]["arrivals"])
        self.assertEqual(sum(row["arrivals"] for row in monthly if row["month"] == "2026-01"), 4811700)
        segment = next(row for row in h1 if row["period"] == "2026-H1" and row["market"] == "Short-haul")
        self.assertEqual(segment["arrivals"], 3993305)

    def test_age_counts_reconstructed_from_unrounded_workbook_percentages(self):
        _, h1 = load_hktb_arrivals(SourceRegistry())
        total = next(row for row in h1 if row["period"] == "2026-H1" and row["market"] == "All markets")
        self.assertEqual(total["age_counts"]["0-15"], 2059419)
        for row in h1:
            if row["age_counts"]:
                self.assertEqual(sum(row["age_counts"].values()), row["arrivals"])

    def test_h1_rows_and_months_are_unique_when_full_year_workbook_is_present(self):
        monthly, h1 = load_hktb_arrivals(SourceRegistry())
        h1_keys = [(row["period"], row["market"]) for row in h1]
        month_keys = [(row["month"], row["market"]) for row in monthly]
        self.assertEqual(len(h1_keys), len(set(h1_keys)))
        self.assertEqual(len(month_keys), len(set(month_keys)))
        japan = next(row for row in h1 if row["period"] == "2025-H1" and row["market"] == "Japan")
        self.assertEqual(japan["arrivals"], 348654)


if __name__ == "__main__":
    unittest.main()
