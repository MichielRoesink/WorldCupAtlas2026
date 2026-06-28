import csv
import json
import urllib.request

URL = "https://raw.githubusercontent.com/datasets/country-codes/master/data/country-codes.csv"

with urllib.request.urlopen(URL) as response:
    text = response.read().decode("utf-8")

countries = {}

reader = csv.DictReader(text.splitlines())

for row in reader:
    numeric = row.get("ISO3166-1-numeric")
    alpha3 = row.get("ISO3166-1-Alpha-3")
    name = row.get("CLDR display name") or row.get("official_name_en")

    if not numeric or not alpha3 or not name:
        continue

    countries[numeric.zfill(3)] = {
        "code": alpha3,
        "name": name,
        "flag": "",
        "confederation": ""
    }

with open("docs/data/countries.json", "w", encoding="utf-8") as f:
    json.dump(countries, f, indent=2, ensure_ascii=False)

print(f"Created countries.json with {len(countries)} countries")