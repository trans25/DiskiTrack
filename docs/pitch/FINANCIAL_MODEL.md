# DiskiTrack — Simple Financial Model

> **IMPORTANT:** Every number below is an *illustrative assumption*. Replace each one with
> your own validated figure before you pitch. The purpose of this document is to show the
> *structure* of the economics and prove you think like an operator.

---

## 1. Pricing tiers (assumptions)

| Tier      | Who it is for                | Teams | Price / month |
|-----------|------------------------------|-------|---------------|
| Starter   | Single team / small club     | 1     | R199          |
| Club      | Multi-age-group club         | up to 5 | R499        |
| Academy   | Academy / large club         | up to 15 | R1,199     |

> Blended average revenue per club (ARPU) assumed below: **R450 / month**.

---

## 2. Cost to serve (assumptions)

| Item                          | Monthly cost (fixed) |
|-------------------------------|----------------------|
| Backend hosting (Render)      | R500                 |
| Frontend hosting (Vercel)     | R0 – R400            |
| Managed PostgreSQL database   | R400                 |
| Email (SMTP) / domain / misc  | R200                 |
| **Total fixed infra**         | **~R1,500 / month**  |

**Marginal cost per extra club:** near R0 (this is the SaaS advantage — say this out loud).

---

## 3. Unit economics (assumptions)

| Metric                                   | Value         | Notes                                   |
|------------------------------------------|---------------|-----------------------------------------|
| ARPU (avg revenue per club / month)      | R450          | blended across tiers                    |
| Gross margin per club                    | ~95%          | infra cost per club is tiny             |
| Customer Acquisition Cost (CAC)          | R900          | ~2 months of revenue (assumption)       |
| Average customer lifetime                | 24 months     | assumption                              |
| Lifetime Value (LTV = ARPU × lifetime × margin) | ~R10,260 | R450 × 24 × 0.95                        |
| **LTV : CAC ratio**                      | **~11 : 1**   | healthy is >3:1                         |
| CAC payback period                       | ~2 months     | strong                                  |

---

## 4. Revenue projection (illustrative)

Assumes steady net club growth and R450 ARPU.

| Month | Paying clubs | MRR (R) | Infra cost (R) | Gross profit (R) |
|-------|--------------|---------|----------------|------------------|
| 1     | 5            | 2,250   | 1,500          | 750              |
| 3     | 15           | 6,750   | 1,500          | 5,250            |
| 6     | 40           | 18,000  | 1,800          | 16,200           |
| 12    | 120          | 54,000  | 2,500          | 51,500           |
| 24    | 400          | 180,000 | 4,000          | 176,000          |

- **MRR** = Monthly Recurring Revenue = paying clubs × ARPU.
- **ARR** at month 12 ≈ R648,000; at month 24 ≈ R2.16m (illustrative).

### Break-even
- Fixed infra (~R1,500/mo) is covered at roughly **4 paying clubs**.
- Including a modest salary/marketing budget, set your real break-even target and state it clearly.

---

## 5. Use of funds (template — fill in your ask)

Suppose the ask is **RX**. Example allocation:

| Category                  | % of raise | Purpose                                      |
|---------------------------|------------|----------------------------------------------|
| Product & engineering     | 35%        | Finish final features, mobile polish, QA     |
| Sales & marketing         | 35%        | Acquire first 100+ clubs, demos, partnerships|
| Customer support & success| 15%        | Onboarding, retention                        |
| Infrastructure & ops      | 5%         | Hosting, security, compliance                |
| Contingency               | 10%        | Buffer                                        |

State the **runway** this buys (e.g. 12–18 months) and the **milestones** it unlocks
(e.g. "100 paying clubs and R50k MRR").

---

## 6. The three numbers to memorise
1. **ARPU:** ~R450 / club / month (your price).
2. **Market size:** number of target clubs you can realistically reach.
3. **The ask:** how much, for what, and what the investor gets in return.

---

*Replace all assumptions with researched figures. Investors forgive small numbers; they do not
forgive made-up numbers you cannot defend.*
