#!/usr/bin/env python3
"""Build a static hail file and storm pages for the Bismarck, ND area.

The site is GitHub Pages (static). This script does not run in the browser.

Data, both free and keyless:
  * NOAA NCEI SWDI NEXRAD Level-III hail signatures (nx3hail), the same
    records as the monthly CSVs at
    https://www.ncei.noaa.gov/pub/data/swdi/database-csv/v2/
    Fetched already clipped to a Bismarck bounding box from the SWDI
    web service so the multi-hundred-megabyte monthly gzip is not required.
  * NOAA MRMS MESH_Max_1440min on the public AWS bucket s3://noaa-mrms-pds
    (HTTPS, no account). A downtown grid sample is attached only when
    ``grib_ls`` (ecCodes) is installed and ``--with-mesh`` is passed.
    Address matching uses the SWDI points, which have lat/lon.

NOAA data is used without implying NOAA endorsement. The JSON is a
derived summary, not an original NOAA product.

Usage:
  python scripts/build_hail.py
  python scripts/build_hail.py --sample
  python scripts/build_hail.py --with-mesh

If the network fetch fails and a previous real file is already in place,
that file is left untouched and the process exits 1. Pass --allow-sample
to overwrite it with clearly labeled sample points.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "public" / "data" / "hail-bismarck.json"
STORMS_DIR = ROOT / "public" / "storms"

# Downtown Bismarck. The fetch box is wider than the 10 km match radius
# so a house on the edge of town still has nearby points to test.
CENTER = {"lat": 46.808327, "lon": -100.783739}
BBOX = {"south": 46.50, "west": -101.20, "north": 47.12, "east": -100.35}
MATCH_RADIUS_KM = 10
PAGE_RADIUS_KM = 15
MIN_PAGE_INCHES = 1.0

SWDI = "https://www.ncei.noaa.gov/swdiws/csv/nx3hail/{start}:{end}?bbox={west},{south},{east},{north}"
MESH_URL = (
    "https://noaa-mrms-pds.s3.amazonaws.com/CONUS/MESH_Max_1440min_00.50/"
    "{ymd}/{name}"
)
USER_AGENT = "ClickRoof-hail-build/1.0 (static site; github.com/weiszdev/clickroof)"

SAMPLE_EVENTS = [
    {
        "date": "2026-08-12",
        "time_utc": "2026-08-12T03:00:00Z",
        "lat": 46.80,
        "lon": -100.78,
        "inches": 1.75,
        "radar": "SAMPLE",
        "cell_id": "SAMPLE",
        "prob": None,
        "sevprob": None,
    }
]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * radius * math.asin(min(1.0, math.sqrt(a)))


def season_months(today: date) -> list[tuple[date, date]]:
    """May through October, or through the current month once hail season has started."""
    if today.month >= 5:
        last_month = min(today.month, 10)
        year = today.year
    else:
        last_month = 10
        year = today.year - 1
    spans = []
    for month in range(5, last_month + 1):
        start = date(year, month, 1)
        if month == 12:
            end = date(year, 12, 31)
        else:
            end = date(year, month + 1, 1) - timedelta(days=1)
        if end > today:
            end = today
        spans.append((start, end))
    return spans


def fetch(url: str, timeout: int = 90) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/csv,*/*"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def parse_swdi(text: str) -> list[dict]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return []
    header = [part.strip().lower() for part in lines[0].split(",")]
    index = {name: pos for pos, name in enumerate(header)}
    rows = []
    for line in lines[1:]:
        if line.lower().startswith("count,") or line.lower().startswith("totaltime"):
            continue
        parts = line.split(",")
        if len(parts) < len(header):
            continue
        try:
            lat = float(parts[index["lat"]])
            lon = float(parts[index["lon"]])
            inches = float(parts[index["maxsize"]])
            ztime = parts[index["ztime"]]
        except (KeyError, ValueError):
            continue
        if not ztime or ztime[0] not in "12":
            continue
        if inches <= 0:
            continue
        if not (BBOX["south"] <= lat <= BBOX["north"] and BBOX["west"] <= lon <= BBOX["east"]):
            continue
        rows.append(
            {
                "date": ztime[:10],
                "time_utc": ztime if ztime.endswith("Z") else ztime + "Z",
                "lat": round(lat, 5),
                "lon": round(lon, 5),
                "inches": round(inches, 2),
                "radar": parts[index["wsr_id"]] if "wsr_id" in index else "",
                "cell_id": parts[index["cell_id"]] if "cell_id" in index else "",
                "prob": _maybe_int(parts, index, "prob"),
                "sevprob": _maybe_int(parts, index, "sevprob"),
            }
        )
    return rows


def _maybe_int(parts: list[str], index: dict, name: str):
    if name not in index:
        return None
    try:
        return int(float(parts[index[name]]))
    except ValueError:
        return None


def fetch_swdi(today: date) -> list[dict]:
    events: list[dict] = []
    for start, end in season_months(today):
        url = SWDI.format(
            start=start.strftime("%Y%m%d"),
            end=end.strftime("%Y%m%d"),
            west=BBOX["west"],
            south=BBOX["south"],
            east=BBOX["east"],
            north=BBOX["north"],
        )
        print(f"fetch {start.isoformat()}..{end.isoformat()}", file=sys.stderr)
        payload = fetch(url)
        month_rows = parse_swdi(payload.decode("utf-8", errors="replace"))
        print(f"  {len(month_rows)} signatures", file=sys.stderr)
        events.extend(month_rows)
    events.sort(key=lambda row: (row["time_utc"], row["radar"], row["cell_id"]))
    return events


def day_summaries(events: list[dict]) -> list[dict]:
    by_day: dict[str, list[dict]] = {}
    for event in events:
        by_day.setdefault(event["date"], []).append(event)
    summaries = []
    for day, rows in sorted(by_day.items()):
        largest = max(rows, key=lambda row: row["inches"])
        near = [row for row in rows if haversine_km(CENTER["lat"], CENTER["lon"], row["lat"], row["lon"]) <= PAGE_RADIUS_KM]
        near_max = max((row["inches"] for row in near), default=0)
        summaries.append(
            {
                "date": day,
                "signatures": len(rows),
                "max_inches": largest["inches"],
                "max_inches_within_15km": near_max,
                "page": near_max >= MIN_PAGE_INCHES,
            }
        )
    return summaries


def try_mesh(day: str, work: Path) -> dict | None:
    """Sample MRMS MESH at downtown Bismarck for the UTC day, if grib_ls exists."""
    tool = shutil.which("grib_ls")
    if not tool:
        return None
    stamp = datetime.strptime(day, "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)
    ymd = stamp.strftime("%Y%m%d")
    name = f"MRMS_MESH_Max_1440min_00.50_{ymd}-000000.grib2.gz"
    url = MESH_URL.format(ymd=ymd, name=name)
    dest = work / name
    try:
        dest.write_bytes(fetch(url, timeout=120))
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        print(f"mesh download skipped for {day}: {exc}", file=sys.stderr)
        return None
    # grib_ls -l lat,lon,mode prints the nearest grid value. Mode 1 is nearest.
    completed = subprocess.run(
        [tool, "-p", "shortName", "-l", f"{CENTER['lat']},{CENTER['lon']},1", "-w", "shortName=unknown", str(dest)],
        capture_output=True,
        text=True,
        timeout=60,
    )
    # ecCodes prints a table; the value column is not stable across builds.
    # Fall back to a plain -l listing, which includes a "Value" line.
    listing = subprocess.run(
        [tool, "-l", f"{CENTER['lat']},{CENTER['lon']},1", str(dest)],
        capture_output=True,
        text=True,
        timeout=60,
    )
    inches = _parse_grib_value(listing.stdout + "\n" + completed.stdout)
    if inches is None:
        print(f"mesh parse skipped for {day}", file=sys.stderr)
        return None
    return {
        "date": day,
        "downtown_inches": round(inches, 2),
        "file": name,
        "url": url,
    }


def _parse_grib_value(text: str) -> float | None:
    for line in text.splitlines():
        lowered = line.lower()
        if "value" not in lowered:
            continue
        bits = line.replace("=", " ").replace(",", " ").split()
        for bit in reversed(bits):
            try:
                return float(bit)
            except ValueError:
                continue
    return None


def dataset(events: list[dict], *, label: str, mesh_note: str, mesh_samples: list[dict]) -> dict:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    disclaimer = (
        "Radar-estimated hail size. Possible hail damage only — not a confirmed inspection. "
        "NOAA data is used without implying NOAA endorsement. This file is a derived summary, "
        "not an original NOAA product. NEXRAD signature times are UTC and can fall on the "
        "previous evening in Central time."
    )
    if label == "sample":
        disclaimer = "SAMPLE DATA for layout only. Not a NOAA measurement. " + disclaimer
    return {
        "label": label,
        "area": {"name": "Bismarck, ND", "center": CENTER, "bbox": BBOX},
        "match_radius_km": MATCH_RADIUS_KM,
        "generated_at": now,
        "disclaimer": disclaimer,
        "sources": [
            {
                "id": "ncei-swdi-nx3hail",
                "title": "NOAA NCEI Severe Weather Data Inventory, NEXRAD Level-III hail signatures",
                "url": "https://www.ncei.noaa.gov/pub/data/swdi/database-csv/v2/",
            }
        ],
        "mesh": {
            "bucket": "s3://noaa-mrms-pds",
            "product": "CONUS/MESH_Max_1440min_00.50",
            "status": "sampled" if mesh_samples else "not_parsed",
            "samples": mesh_samples,
            "note": mesh_note,
        },
        "days": day_summaries(events),
        "events": events,
    }


def write_pages(payload: dict) -> list[str]:
    STORMS_DIR.mkdir(parents=True, exist_ok=True)
    pages = []
    for day in payload["days"]:
        if not day["page"]:
            continue
        name = f"{day['date']}-bismarck.html"
        (STORMS_DIR / name).write_text(storm_page(day["date"]), encoding="utf-8")
        pages.append(name)
    (STORMS_DIR / "index.html").write_text(storm_index(payload, pages), encoding="utf-8")
    return pages


def storm_page(day: str) -> str:
    safe = html_escape(day)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Possible hail near Bismarck — {safe} UTC</title>
  <meta name="description" content="Radar-estimated hail signatures near Bismarck, North Dakota. Possible hail damage only, not a confirmed inspection." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {{ --navy:#0A1628; --amber:#F59E0B; --muted:#94A3B8; --white:#FAFAFA; }}
    * {{ box-sizing: border-box; }}
    body {{ margin:0; font-family:"DM Sans",sans-serif; background:var(--navy); color:var(--white); }}
    header, main, footer {{ max-width: 880px; margin: 0 auto; padding: 1.25rem 1.25rem; }}
    a {{ color: var(--amber); }}
    h1 {{ font-family: Syne, sans-serif; font-size: clamp(1.6rem, 4vw, 2.2rem); line-height: 1.15; margin: 0.4rem 0 0.6rem; }}
    .eyebrow {{ color: var(--amber); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }}
    p {{ color: var(--muted); line-height: 1.55; }}
    #mapWrap svg {{ width: 100%; height: auto; display: block; border-radius: 12px; }}
    form {{ display: grid; grid-template-columns: 2fr 1fr 70px 90px auto; gap: 0.5rem; align-items: end; margin: 1rem 0; }}
    label {{ display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.75rem; color: var(--muted); }}
    input {{ background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color: var(--white); border-radius: 8px; padding: 0.7rem 0.6rem; font: inherit; }}
    button {{ background: var(--amber); color: var(--navy); font-weight: 700; border: 0; border-radius: 10px; padding: 0.75rem 1rem; cursor: pointer; }}
    #checkResult {{ color: var(--white); }}
    footer {{ border-top: 1px solid rgba(255,255,255,0.08); font-size: 0.78rem; }}
    @media (max-width: 720px) {{ form {{ grid-template-columns: 1fr 1fr; }} }}
  </style>
</head>
<body data-storm-date="{safe}">
  <header>
    <a href="../index.html">← ClickRoof</a>
    <div class="eyebrow">Bismarck storm check</div>
    <h1 id="stormTitle">Hail near Bismarck</h1>
    <p id="stormLead">Loading radar signatures…</p>
    <p id="stormCount"></p>
  </header>
  <main>
    <div id="mapWrap"></div>
    <h2 style="font-family:Syne,sans-serif;font-size:1.25rem;margin-top:1.5rem;">Check my address</h2>
    <p>Looks up this static Bismarck file within about 10 km. Wording stays at possible hail damage.</p>
    <form id="checkForm">
      <label>Street address<input id="addr" name="address" autocomplete="street-address" required placeholder="123 Main St" /></label>
      <label>City<input id="city" name="city" value="Bismarck" autocomplete="address-level2" /></label>
      <label>State<input id="region" name="state" value="ND" autocomplete="address-level1" /></label>
      <label>ZIP<input id="zip" name="zip" inputmode="numeric" autocomplete="postal-code" placeholder="58501" /></label>
      <button type="submit">Check my address</button>
    </form>
    <p id="checkResult"></p>
    <a id="quoteLink" hidden href="../index.html">Continue to the quote</a>
  </main>
  <footer>
    <p>North Dakota insurance-claim contracts: on a residential roofing contract paid by insurance, you may cancel until midnight of the fifth business day after you sign, or after a coverage denial. NDCC 26.1-39.2. ClickRoof does not confirm hail damage and does not offer to pay a deductible.</p>
    <p>Points are NEXRAD hail-signature locations from NOAA NCEI SWDI, not a measured swath at every house. <a href="index.html">All Bismarck storm pages</a></p>
  </footer>
  <script src="../js/track.js?v=3"></script>
  <script src="../js/geo.js?v=3"></script>
  <script src="../js/hail.js?v=3"></script>
  <script src="../js/storm-page.js?v=3"></script>
</body>
</html>
"""


def storm_index(payload: dict, pages: list[str]) -> str:
    items = []
    by_date = {day["date"]: day for day in payload["days"]}
    for name in pages:
        day = name.split("-bismarck")[0]
        # name is YYYY-MM-DD-bismarck.html; split above is wrong for the last hyphen.
        day = name[:10]
        info = by_date.get(day, {})
        inches = info.get("max_inches_within_15km", "")
        items.append(
            f'<li><a href="{html_escape(name)}">{html_escape(day)} UTC</a> — '
            f'radar estimated up to about {html_escape(inches)} in within 15 km of downtown. '
            f'Possible hail damage, not a confirmed inspection.</li>'
        )
    label = payload.get("label", "")
    banner = ""
    if label == "sample":
        banner = "<p><strong>Sample data.</strong> These pages are not a NOAA measurement.</p>"
    elif not items:
        banner = "<p>No day in this file reached 1 inch within 15 km of downtown Bismarck.</p>"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bismarck hail days</title>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    body {{ margin:0; font-family:"DM Sans",sans-serif; background:#0A1628; color:#FAFAFA; }}
    main {{ max-width: 720px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }}
    a {{ color: #F59E0B; }}
    h1 {{ font-family: Syne, sans-serif; }}
    li {{ margin: 0.6rem 0; line-height: 1.45; }}
    p, li {{ color: #94A3B8; }}
  </style>
</head>
<body>
  <main>
    <a href="../index.html">← ClickRoof</a>
    <h1>Bismarck hail days</h1>
    {banner}
    <p>{html_escape(payload.get("disclaimer", ""))}</p>
    <ul>
      {''.join(items)}
    </ul>
    <p>North Dakota insurance-claim contracts: you may cancel a residential roofing contract paid by insurance until midnight of the fifth business day after you sign, or after a coverage denial. NDCC 26.1-39.2.</p>
  </main>
</body>
</html>
"""


def html_escape(value) -> str:
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def write_dataset(payload: dict) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    pages = write_pages(payload)
    print(f"wrote {DATA_PATH.relative_to(ROOT)} ({len(payload['events'])} signatures, {len(pages)} storm pages)")


def existing_is_real() -> bool:
    if not DATA_PATH.exists():
        return False
    try:
        current = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return False
    return current.get("label") not in (None, "sample")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build static Bismarck hail JSON and storm pages")
    parser.add_argument("--sample", action="store_true", help="Write labeled sample data and skip the network")
    parser.add_argument("--allow-sample", action="store_true", help="Overwrite a real file with sample data if NOAA cannot be reached")
    parser.add_argument("--with-mesh", action="store_true", help="Sample MRMS MESH at downtown when grib_ls is installed")
    args = parser.parse_args()

    mesh_note = (
        "Address lookup uses NCEI hail-signature locations so a static page can match within "
        "about 10 km. MRMS MESH_Max_1440min GRIB2 is on s3://noaa-mrms-pds with no AWS account. "
        "This build does not parse those grids unless you pass --with-mesh on a machine with ecCodes grib_ls."
    )
    if args.sample:
        payload = dataset(SAMPLE_EVENTS, label="sample", mesh_note=mesh_note, mesh_samples=[])
        write_dataset(payload)
        return 0

    today = datetime.now(timezone.utc).date()
    try:
        events = fetch_swdi(today)
    except (urllib.error.URLError, TimeoutError, ssl.SSLError, OSError) as exc:
        print(f"NOAA fetch failed: {exc}", file=sys.stderr)
        if existing_is_real() and not args.allow_sample:
            print("left the existing real hail file in place", file=sys.stderr)
            return 1
        payload = dataset(SAMPLE_EVENTS, label="sample", mesh_note=mesh_note, mesh_samples=[])
        write_dataset(payload)
        print("wrote SAMPLE data", file=sys.stderr)
        return 0

    if not events:
        print("NOAA returned no Bismarck-area signatures", file=sys.stderr)
        if existing_is_real() and not args.allow_sample:
            return 1
        payload = dataset(SAMPLE_EVENTS, label="sample", mesh_note=mesh_note, mesh_samples=[])
        write_dataset(payload)
        return 0

    mesh_samples: list[dict] = []
    if args.with_mesh:
        if not shutil.which("grib_ls"):
            print("grib_ls not installed; MESH sample skipped", file=sys.stderr)
            mesh_note += " --with-mesh was set, but grib_ls was not on PATH."
        else:
            work = ROOT / "public" / "data" / ".mesh-tmp"
            work.mkdir(parents=True, exist_ok=True)
            for day in day_summaries(events):
                if not day["page"]:
                    continue
                sample = try_mesh(day["date"], work)
                if sample:
                    mesh_samples.append(sample)
            shutil.rmtree(work, ignore_errors=True)
            if mesh_samples:
                mesh_note = (
                    "Downtown Bismarck MESH_Max_1440min samples are included per storm day. "
                    "The address match still uses SWDI signature locations."
                )
    payload = dataset(events, label="noaa-swdi", mesh_note=mesh_note, mesh_samples=mesh_samples)
    write_dataset(payload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
