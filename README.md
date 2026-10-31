# ClickRoof.com

> **The Priceline of Roofing™** — Instant roof quotes. Real contractor pricing. Lock your price in 60 seconds.

---

## Overview

ClickRoof is a national marketplace platform that connects homeowners with pre-vetted roofing contractors through a seamless, instant-quote, deposit-first buying experience. No salespeople. No waiting. No runaround.

Inspired by **Jon Roise / Capital Exteriors** — Bismarck, ND — founded 2006.

---

## Repository Structure

```
clickroof/
├── public/
│   ├── index.html              # Homeowner site and quote flow
│   ├── js/                     # Hail lookup, roof range, step tracking
│   ├── data/hail-bismarck.json # Static hail file (built, not fetched live)
│   └── storms/                 # One page per Bismarck hail day
├── scripts/build_hail.py       # NOAA SWDI → JSON + storm pages
├── contractor-portal/
│   └── index.html              # Contractor portal mock
├── docs/
│   ├── BUSINESS_PLAN.md
│   └── DECISIONS.md
└── .github/workflows/build-hail.yml  # Manual-only hail rebuild
```

---

## Live site

GitHub Pages serves this repo from the `main` branch at the repository root ([weiszdev.github.io/clickroof](https://weiszdev.github.io/clickroof/)). `.nojekyll` disables Jekyll. The root `index.html` redirects to `public/index.html`.

Local preview:

```bash
python3 -m http.server 8765
```

Then open `http://localhost:8765/public/index.html` and `http://localhost:8765/public/storms/`. A file:// open will not load the hail JSON.

---

## Key Features

### Consumer Site (`public/index.html`)
- Address → roof confirm (squares, pitch, planes) → anonymous price range → contact
- Google Solar only when a key is supplied in the browser; otherwise a labeled sample
- Possible-hail line from `public/data/hail-bismarck.json` within about 10 km
- Contact form: name, phone or email, one consent checkbox per named roofer
- Step events on `window.clickroofEvents` (no analytics vendor)

### Contractor Portal (`contractor-portal/index.html`)
- Real-time job board with deposit-verified leads
- One-click accept/decline with homeowner notification
- Pricing configuration per material and complexity
- Revenue analytics + monthly chart
- Possible-hail notice (not a damage confirmation)
- Service area management
- Reviews panel stays empty until real ClickRoof reviews exist

---

## Hail file

`scripts/build_hail.py` pulls NOAA NCEI SWDI hail signatures for the Bismarck area (the same nx3hail records as the monthly CSVs on ncei.noaa.gov) and writes `public/data/hail-bismarck.json` plus `public/storms/<date>-bismarck.html`. MRMS MESH grids on `s3://noaa-mrms-pds` are optional (`--with-mesh`, needs `grib_ls`). If NOAA cannot be reached, the script keeps an existing real file, or writes data labeled `sample`.

```bash
python3 scripts/build_hail.py
```

`.github/workflows/build-hail.yml` runs that script on manual dispatch only and uploads an artifact. It does not commit.

---

## Pilot Ambassador Marketing Program

Private pilots (PPL/IFR) visit cities on roofing road trips to sign up anchor contractors. An unsourced conversion multiple that used to sit in this paragraph was removed.

---

## Founding Partner

**Capital Exteriors, Inc.**
Bismarck, ND · Founded 2006 (as Roise Rain Gutter Inc.)
Owner: Jon Roise
25+ years · Roofing · Metal Roofs · Siding · Gutters · Insurance Claims

---

## Tech stack

GitHub Pages publishes the static HTML in this repo. The table below is an old production plan, not what is deployed.

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + TailwindCSS |
| Backend | Node.js + Supabase |
| Payments | Stripe (Apple Pay, Google Pay, Venmo, ACH) |
| Aerial Data | Google Maps + Nearmap |
| Property Data | Zillow API + County Assessor |
| Measurements | EagleView / GeoSpan |
| E-sign | Dropbox Sign |
| Auth | Clerk.dev |
| Hosting | Vercel + Railway |

---

---

*© 2026 ClickRoof Inc. All rights reserved.*
