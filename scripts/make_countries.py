import csv
import json
import urllib.request

URL = "https://raw.githubusercontent.com/datasets/country-codes/master/data/country-codes.csv"
CONFEDERATIONS = {
    "NLD": "UEFA",
    "BEL": "UEFA",
    "GER": "UEFA",
    "FRA": "UEFA",
    "ESP": "UEFA",
    "POR": "UEFA",
    "ITA": "UEFA",
    "ENG": "UEFA",

    "BRA": "CONMEBOL",
    "ARG": "CONMEBOL",
    "URU": "CONMEBOL",

    "USA": "CONCACAF",
    "CAN": "CONCACAF",
    "MEX": "CONCACAF",

    "JPN": "AFC",
    "KOR": "AFC",
    "AUS": "AFC",

    "MAR": "CAF",
    "SEN": "CAF",
    "EGY": "CAF"
}
def flag_from_alpha2(alpha2):
    if not alpha2 or len(alpha2) != 2:
        return ""

    return "".join(
        chr(127397 + ord(char.upper()))
        for char in alpha2
    )

with urllib.request.urlopen(URL) as response:
    text = response.read().decode("utf-8")

countries = {}

reader = csv.DictReader(text.splitlines())

for row in reader:
    numeric = row.get("ISO3166-1-numeric")
    alpha2 = row.get("ISO3166-1-Alpha-2")
    alpha3 = row.get("ISO3166-1-Alpha-3")
    name = row.get("CLDR display name") or row.get("official_name_en")

    if not numeric or not alpha2 or not alpha3 or not name:
        continue

    countries[numeric.zfill(3)] = {
        "code": alpha3,
        "name": name,
        "flag": flag_from_alpha2(alpha2),
        "confederation": CONFEDERATIONS.get(alpha3, "")
    }

with open("docs/data/countries.json", "w", encoding="utf-8") as f:
    json.dump(countries, f, indent=2, ensure_ascii=False)

print(f"Created countries.json with {len(countries)} countries")