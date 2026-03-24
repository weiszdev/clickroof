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
│   └── index.html              # Consumer-facing public website
├── contractor-portal/
│   └── index.html              # Contractor backend dashboard
├── docs/
│   ├── BUSINESS_PLAN.md        # Full business plan, revenue model, market research
│   └── DECISIONS.md            # All design & architecture decisions with rationale
└── README.md
```

---

## Live Preview

Open `public/index.html` in any browser to see the consumer site.
Open `contractor-portal/index.html` to see the contractor portal.

---

## Key Features

### Consumer Site (`public/index.html`)
- Address → instant aerial property data pull
- 5-step quote wizard (address → roof type → materials → quotes → deposit)
- Multi-contractor comparison (Priceline-style)
- Apple Pay / Google Pay / Venmo / Card checkout
- Price-lock deposit with auto-generated contract
- Mobile-first, funnel-optimized layout

### Contractor Portal (`contractor-portal/index.html`)
- Real-time job board with deposit-verified leads
- One-click accept/decline with homeowner notification
- Pricing configuration per material and complexity
- Revenue analytics + monthly chart
- Storm alert system with affected homes count
- Service area management
- Ratings dashboard

---

## Market Data

- **$31B** U.S. roofing market (2024)
- **101,679** roofing companies in the U.S.
- **$21,050–$30,680** average full roof replacement (2025)
- **6.6% CAGR** through 2032
- **0%** current e-commerce penetration in residential roofing

---

## Revenue Model

| Source | Est. Year 1 | Est. Year 3 |
|--------|-------------|-------------|
| Contractor subscriptions ($199–$699/mo) | $1.8M | $18M |
| Platform deposit fees (1.5%) | $432K | $5.4M |
| Data/measurement upsells | $200K | $1.5M |
| **Total** | **~$2.4M** | **~$25M** |

---

## Pilot Ambassador Marketing Program

Private pilots (PPL/IFR) visit cities on "roofing road trips" to sign up anchor contractors in each new market. Win-win: pilots earn flight hours + commission, ClickRoof gets warm in-person B2B leads at 4–6x higher conversion than cold digital.

---

## Founding Partner

**Capital Exteriors, Inc.**
Bismarck, ND · Founded 2006 (as Roise Rain Gutter Inc.)
Owner: Jon Roise
25+ years · Roofing · Metal Roofs · Siding · Gutters · Insurance Claims

---

## Tech Stack (Planned Production)

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

## Startup Cost Estimate

| Item | Range |
|------|-------|
| Platform development (MVP) | $85K–$140K |
| Legal + contracts | $12K–$20K |
| Payment integration | $3K–$5K |
| EagleView API | $5K–$10K |
| Branding | $8K–$15K |
| 10-city pilot program | $25K–$40K |
| Year 1 marketing | $50K–$100K |
| Year 1 operations | $180K–$250K |
| **Seed Requirement** | **$370K–$580K** |

---

*© 2026 ClickRoof Inc. All rights reserved.*
