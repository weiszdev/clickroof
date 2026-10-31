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
- Rationale: Comparison is part of the marketplace idea. An earlier draft cited a close-rate lift that was not sourced; that figure was removed.

**Decision 8: Roof confirm instead of a 6-photo picker**
- Rationale: The first prototype asked homeowners to match one of six roof drawings. The quote flow now shows squares, pitch, and plane count and asks them to confirm or edit. An unsourced "35% fewer errors" claim that used to sit here was removed. Without a Google Solar key the figures are a labeled sample.

**Decision 9: Deposit captured before contractor acceptance (not after)**
- Rationale: Creates job-ready lead for contractor. Eliminates tire-kickers. Contractor SLA guarantee protects homeowner. Industry precedent: Priceline's "Name Your Price" pre-commitment model.

---

### TECH DECISIONS

**Decision 10: Supabase over custom Postgres**
- Rationale: Faster MVP build, built-in auth/RLS, real-time subscriptions for contractor job board, cost-effective at scale

**Decision 11: Stripe for all payments (not PayPal as primary)**
- Rationale: Stripe supports Apple Pay, Google Pay, ACH, card, Venmo via Stripe Link. Single integration for all payment methods. Better fraud tooling.

**Decision 12: Mobile-first, funnel-optimized layout**
- Rationale: The quote flow is laid out for a phone screen. An unsourced mobile-traffic percentage that used to sit here was removed.

**Decision 13: EagleView as primary measurement API, GeoSpan as backup**
- Rationale: EagleView has the deepest U.S. coverage and is the industry standard. GeoSpan is faster/cheaper for initial quote estimates. Two-tier: GeoSpan for instant quote, EagleView for binding proposal.

---

### MARKETING DECISIONS

**Decision 14: Private pilot ambassador program as go-to-market**
- Rationale: In-person contractor outreach was the working idea. An unsourced multiple versus cold outreach that used to sit here was removed.

**Decision 15: Anchor city = Bismarck ND (Capital Exteriors / Jon Roise)**
- Rationale: Founding partner is in Bismarck, and the hail file and storm pages are built for that market. An unsourced claim about statewide wages and competition that used to sit here was removed.

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
- Rationale: The published site is static HTML on GitHub Pages. An unsourced conversion-drop percentage that used to sit here was removed. The contractor portal mock is also static HTML; a React portal was planned and is not what is in the repo.

**Decision 22: Contractor portal is React SPA**
- Rationale: Complex state management (job board, quote config, analytics), real-time updates, form-heavy interface — React is appropriate here.

---

*Log maintained by: ClickRoof Platform Team*
*Last updated: March 2026*
