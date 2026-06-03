# DiskiTrack — Investor Q&A Prep

> Prepared answers to the questions a finance person will ask. Edit the bracketed
> `[...]` parts with your real numbers and decisions before pitching.

---

## A. Problem & Market

**Q: Who exactly is your customer?**
A: Grassroots football clubs and academies that run multiple age-group teams
(under-13 to seniors, plus ladies sides) and have no affordable tool to track
matches and player development. Beachhead market: South African clubs and academies.

**Q: How big is the market?**
A: [Insert number] registered clubs/academies in South Africa, expanding to
[insert] across Africa. Even capturing a small percentage at R450/month is a
meaningful business. (Replace with researched figures.)

**Q: What do they use today?**
A: WhatsApp groups, paper team sheets, and spreadsheets. Nothing measures player
development or stores match data in one place.

**Q: Is this a must-have or a nice-to-have?**
A: For serious academies focused on player development and selling players,
measurable data is becoming a must-have. We start with those clubs.

---

## B. Business Model & Pricing

**Q: How do you make money?**
A: SaaS subscription, billed per club per month, in tiers by number of teams/players.
Blended ARPU ~R450/month. Expansion revenue later from video analysis, scouting, and payments.

**Q: What is the price?**
A: Starter R199, Club R499, Academy R1,199 per month (assumptions — adjust to your research).

**Q: What are your gross margins?**
A: ~95%. The platform is multi-tenant, so one deployment serves unlimited clubs and the
marginal cost of an extra club is effectively zero.

**Q: What is your CAC and LTV?**
A: Assumed CAC ~R900 (about two months of revenue), LTV ~R10,260 over a 24-month lifetime,
giving an LTV:CAC of ~11:1 and a ~2-month payback. (See FINANCIAL_MODEL.md.)

---

## C. Traction & Validation

**Q: How many paying customers do you have?**
A: Be honest. Current status: product is built and deployed, in final development stages,
with [X pilot clubs / a waitlist of Y]. Next milestone is the first paying pilots.

**Q: Have you validated this with real clubs?**
A: [Describe conversations, interest, letters of intent, or pilots.] If you have none yet,
say your immediate plan is to sign [N] pilot clubs in the next [period].

---

## D. Financials & Unit Economics

**Q: What does it cost to run today?**
A: ~R1,500/month in fixed infrastructure (Render backend, Vercel frontend, managed
PostgreSQL, email/domain). Break-even on infra at roughly four paying clubs.

**Q: What will you spend the investment on?**
A: Roughly 35% product, 35% sales & marketing, 15% customer success, 5% infra, 10% contingency.
This buys [12–18] months of runway to reach [milestone, e.g. 100 paying clubs].

**Q: When do you break even?**
A: Infra break-even is ~4 clubs. Full break-even including salary/marketing is at
[insert] clubs / R[insert] MRR.

---

## E. Growth & Go-to-Market

**Q: How will you acquire customers?**
A: Direct outreach to academies, partnerships with regional federations and leagues,
coach networks, referrals, and demos at tournaments.

**Q: Can it scale?**
A: Yes — the multi-tenant architecture means adding a club is a database record, not new
infrastructure. We can serve thousands of clubs on the same platform at near-zero added cost.

**Q: What is the expansion path?**
A: More teams per club (upsell), more clubs per region, then other countries, then other
sports, plus add-on modules (video, scouting, payments).

---

## F. Competition & Moat

**Q: Who are your competitors?**
A: Hudl, Wyscout, and Veo at the top of the pyramid; spreadsheets and WhatsApp at the bottom.
We sit in the affordable middle, purpose-built for grassroots and academies.

**Q: What stops a competitor copying you?**
A: Local focus and pricing, accumulated club/match data, relationships with leagues and
federations, and switching costs once a club's history lives in DiskiTrack.

---

## G. Team & Risk

**Q: Why you?**
A: [Your background, why you understand this market, what you have already built solo.]
You have already built and deployed a production-grade, secure, multi-tenant platform — that
de-risks execution.

**Q: What are the biggest risks?**
A: 1) Adoption/behaviour change at grassroots level; 2) willingness to pay; 3) churn.
Mitigations: pilot programmes, simple onboarding, mobile-first UX, and clear ROI for clubs.

**Q: What exactly are you asking for?**
A: [Amount] in exchange for [equity % / loan terms], to fund [use of funds] and reach
[milestones] within [timeframe].

---

## H. Technical questions (translated to business value)

| If they ask...                      | Answer in business terms                                  |
|-------------------------------------|-----------------------------------------------------------|
| "Is it secure?"                     | Role-based access and strict per-club data isolation.     |
| "Will it handle many customers?"    | Multi-tenant; one platform scales to thousands of clubs.  |
| "What are running costs?"           | ~R1,500/month fixed today; near-zero per extra club.      |
| "Is it actually built?"             | Yes — live in production on Render + Vercel.              |
| "How fast can you onboard a club?"  | Self-service registration with admin approval workflow.   |

---

## The close
Walk in able to say, in one breath:
> "We charge about **R450 per club per month** at ~95% margin. There are **[X] target clubs**
> in our market. We are asking for **R[amount]** to go from final development to **[milestone]**
> paying clubs in **[timeframe]**."
