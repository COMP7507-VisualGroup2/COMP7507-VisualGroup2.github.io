import csv
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from process_tourism_data import country_age_quarters, load_country_profiles, merge_country_profiles


class CountryAgeQuarterlyTest(unittest.TestCase):
    def test_accepts_valid_standalone_count(self):
        row = {"period": "2025-Q1", "market": "Japan", "age_group": "0-15", "count": "123", "source": "HKTB"}
        self.assertEqual(country_age_quarters([row])[0]["count"], 123)

    def test_rejects_bad_or_duplicate_counts(self):
        row = {"period": "2026-Q2", "market": "Japan", "age_group": "16-25", "count": "12", "source": "HKTB"}
        for invalid in (
            {**row, "period": "2026-Q3"},
            {**row, "count": "-1"},
            {**row, "count": "1.5"},
            {**row, "source": ""},
        ):
            with self.assertRaises(ValueError):
                country_age_quarters([invalid])
        with self.assertRaises(ValueError):
            country_age_quarters([row, row])


class CountryProfileUpdateTest(unittest.TestCase):
    def load_rows(self, rows, quoted=False):
        class Registry:
            def add(self, *args):
                pass

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "visitor_profile.csv"
            with path.open("w", newline="", encoding="utf-8") as file:
                writer = csv.writer(file)
                for row in rows:
                    if quoted:
                        inner = io.StringIO(newline="")
                        csv.writer(inner, lineterminator="").writerow(row)
                        writer.writerow([inner.getvalue()])
                    else:
                        writer.writerow(row)
            with patch("process_tourism_data.MANUAL_DIR", Path(directory)):
                return load_country_profiles(Registry())

    def test_formats_purpose_and_preserves_unrelated_baseline(self):
        header = ["period", "market", "dimension", "category", "value"]
        rows = [header, ["2025 H1", "Japan", "per_capita_overnight_hkd", "Spend", "4200"],
                ["2026 H1", "Japan", "age_group", "26-35", "30"]]
        for category, value in [("Sameday visitors", 20), ("Vacation", 50),
                                ("Visiting friends / relatives", 10), ("Business", 10),
                                ("En-route", 5), ("Others", 5)]:
            rows.append(["2026 H1", "Japan", "trip_purpose", category, str(value)])
        regular = self.load_rows(rows)
        self.assertEqual(self.load_rows(rows, quoted=True), regular)
        baseline = [
            {"period": "2026-H1", "market": "Japan", "dimension": "age_share_pct", "category": "old"},
            {"period": "2026-H1", "market": "All", "dimension": "age_share_pct", "category": "keep"},
        ]
        merged = merge_country_profiles(baseline, regular)
        self.assertNotIn(baseline[0], merged)
        self.assertIn(baseline[1], merged)
        self.assertTrue(any(r["dimension"] == "country_visitor_type_share" and r["value"] == "20.0" for r in merged))
        self.assertEqual(sum(r["dimension"] == "country_trip_purpose" for r in merged), 5)
        self.assertTrue(any(r["period"] == "2025" and r["dimension"] == "per_capita_overnight_h1_hkd"
                            and r["value"] == "4200.0" for r in merged))

    def test_rejects_duplicate_and_incomplete_purpose(self):
        header = ["period", "market", "dimension", "category", "value"]
        row = ["2026 H1", "Japan", "trip_purpose", "Vacation", "50"]
        for rows in ([header, row], [header, row, row]):
            with self.assertRaises(ValueError):
                self.load_rows(rows)


if __name__ == "__main__":
    unittest.main()
