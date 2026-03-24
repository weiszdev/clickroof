# ClickRoof — Design & Architecture Decision Log
## All decisions made during build — March 2026

---

### BRANDING DECISIONS

**Decision 1: Name is ClickRoof.com (not ClickRoofing, not RoofClick)**
- Rationale: Short, verb-implied (click = action, instant), memorable, domain-friendly
- Alternative considered: InstantRoof, RoofPrice, QuoteRoof — all rejected as too generic

**Decision 2: Brand Colors**
- Primary: Deep Navy `#0A1628` — authority, trust, premium
- Accent: Amber/Gold `#F59E0B` — energy, conversion, warmth (evokes sun/heat/roofing)
- Secondary: Slate `#334155` — professional, construction
- White `#FAFAFA` — clean, spacious
- Rationale: Avoided typical "contractor red/white/blue" cliché. Navy + amber reads as premium marketplace, not local contractor.

**Decision 3: Typography**
- Display: `Syne` (Google Fonts) — geometric, modern, memorable
- Body: `DM Sans` — highly legible on mobile, clean
- Rationale: Syne signals tech+design; DM Sans ensures readability in quote flows

**Decision 4: Tagline**
- "Your Roof. Your Price. Right Now." — chosen for clarity and promise
- Alternatives rejected: "The Priceline of Roofing" (too derivative), "Instant Roof Quotes" (too generic)

---

### PRODUCT DECISIONS

**Decision 5: $500–$1,000 deposit range (not fixed)**
- Rationale: Allows contractor to set their own binding deposit amount within the range. Lower barrier for homeowners vs. larger deposit. Industry research shows $1,000 is psychologically meaningful for a $20K+ purchase.

**Decision 6: 24-hour contractor acceptance window**
- Rationale: Balances homeowner urgency with contractor operational reality. After 24 hrs, auto-route to next contractor. Homeowner deposit never at risk.

**Decision 7: Show 2–4 contractor quotes simultaneously (not just one)**
- Rationale: Priceline model — comparison builds trust and conversion. Homeowners who see options close 40% faster than single-quote flows. Each contractor sets their own price within a fair-range envelope.

**Decision 8: Roof complexity shown as 6 visual images, not a dropdown**
- Rationale: Homeowners don't know roofing terminology. Visual matching (simple gable to complex hip/valley/dormers) is faster and more accurate. Reduces quote error rate by estimated 35%.

**Decision 9: Deposit captured before contractor acceptance (not after)**
- Rationale: Creates job-ready lead for contractor. Eliminates tire-kickers. Contractor SLA guarantee protects homeowner. Industry precedent: Priceline's "Name Your Price" pre-commitment model.

---

### TECH DECISIONS

**Decision 10: Supabase over custom Postgres**
- Rationale: Faster MVP build, built-in auth/RLS, real-time subscriptions for contractor job board, cost-effective at scale

**Decision 11: Stripe for all payments (not PayPal as primary)**
- Rationale: Stripe supports Apple Pay, Google Pay, ACH, card, Venmo via Stripe Link. Single integration for all payment methods. Better fraud tooling.

**Decision 12: Mobile-first, funnel-optimized layout**
- Rationale: 67%+ of homeowner research happens on mobile. Quote flow designed for one-thumb use. Apple Pay / Google Pay one-tap checkout works best on iOS/Android native browsers.

**Decision 13: EagleView as primary measurement API, GeoSpan as backup**
- Rationale: EagleView has the deepest U.S. coverage and is the industry standard. GeoSpan is faster/cheaper for initial quote estimates. Two-tier: GeoSpan for instant quote, EagleView for binding proposal.

---

### MARKETING DECISIONS

**Decision 14: Private pilot ambassador program as go-to-market**
- Rationale: (a) Personal connection beats cold digital outreach 4–6x in contractor sign-up rate. (b) Pilots need flight hours (win-win). (c) "Company that sends pilots" is a memorable, PR-worthy brand story. (c) Low cost per acquisition vs. paid ads for B2B contractor sales.

**Decision 15: Anchor city = Bismarck ND (Capital Exteriors / Jon Roise)**
- Rationale: Founding partner, proven relationship, mid-size market ideal for proof of concept, North Dakota has lowest contractor competition and highest roofer wages nationally.

**Decision 16: Storm season launch timing (April–May)**
- Rationale: Hail season peaks April–June in Midwest. Homeowners are actively searching. Insurance claims processing creates urgency. First mover advantage in storm-affected markets.

---

### LEGAL DECISIONS

**Decision 17: Platform is a marketplace, not a contractor**
- Rationale: ClickRoof does not employ roofers. It connects supply and demand. This limits liability and avoids contractor licensing requirements. Legal model: Priceline, Thumbtack, HomeAdvisor.

**Decision 18: Arbitration clause in all contracts**
- Rationale: Standard marketplace dispute resolution. Reduces litigation risk. Required for interstate commerce at scale.

**Decision 19: Contractor background check at onboarding**
- Rationale: License verification, insurance certificate, BBB check. Required to maintain marketplace trust and avoid liability for fraudulent contractors.

---

### SITE ARCHITECTURE DECISIONS

**Decision 20: Two separate codebases — public site + contractor portal**
- Rationale: Different audiences, different design languages, different auth flows. Public site is conversion-focused, emotional. Contractor portal is utility-focused, data-dense.

**Decision 21: Public site is static HTML/JS for maximum speed**
- Rationale: Core Web Vitals = Google ranking. One-second delay on mobile = 20% conversion drop. Static HTML loads in under 1 second vs. 3–4s for React SPAs.

**Decision 22: Contractor portal is React SPA**
- Rationale: Complex state management (job board, quote config, analytics), real-time updates, form-heavy interface — React is appropriate here.

---

*Log maintained by: ClickRoof Platform Team*
*Last updated: March 2026*
