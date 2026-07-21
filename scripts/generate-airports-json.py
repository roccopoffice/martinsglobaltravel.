"""Build assets/airports.json from OurAirports CSV (IATA airports worldwide)."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "scripts" / "airports.csv"
OUT = ROOT / "assets" / "airports.json"

US_STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia",
}

TYPE_RANK = {
    "large_airport": 0,
    "medium_airport": 1,
    "small_airport": 2,
    "heliport": 3,
    "seaplane_base": 4,
    "closed": 9,
}


def main():
    if not CSV.exists():
        raise SystemExit(f"Missing {CSV}. Download OurAirports airports.csv first.")

    airports = []
    seen = set()

    with CSV.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            code = (row.get("iata_code") or "").strip().upper()
            if len(code) != 3 or code in seen:
                continue
            seen.add(code)

            atype = (row.get("type") or "").strip()
            if atype == "closed":
                continue

            country = (row.get("iso_country") or "").strip().upper()
            region = (row.get("iso_region") or "").strip().upper()
            city = (row.get("municipality") or "").strip()
            name = (row.get("name") or "").strip()
            keywords = (row.get("keywords") or "").strip()
            scheduled = (row.get("scheduled_service") or "").strip().lower() == "yes"

            state = ""
            state_name = ""
            if country == "US" and region.startswith("US-") and len(region) == 5:
                state = region[3:]
                state_name = US_STATES.get(state, "")

            airports.append(
                {
                    "code": code,
                    "name": name,
                    "city": city,
                    "country": country,
                    "region": region,
                    "state": state,
                    "stateName": state_name,
                    "type": atype,
                    "scheduled": scheduled,
                    "rank": TYPE_RANK.get(atype, 5),
                    "keywords": keywords,
                }
            )

    airports.sort(key=lambda a: (a["rank"], a["country"], a["state"], a["city"], a["code"]))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(airports, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT} ({len(airports)} airports, {OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
