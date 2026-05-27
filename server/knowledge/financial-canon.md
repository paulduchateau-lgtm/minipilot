# Financial Canon — The Fork CFO Copilot

> Condensed reference corpus for LLM context. Each concept: definition + formula if applicable.
> Bilingual labels: FR term / EN equivalent where relevant.
> The Fork = Tripadvisor subsidiary, restaurant marketplace, FR/IT/ES/UK/NL/DE/PT/SE/PL.

---

## 1. IFRS / US GAAP Alignment

### IFRS Standards (The Fork entity-level)

**IAS 1 — Presentation of Financial Statements**: Current/non-current distinction, minimum line items (revenue, finance costs, tax, profit). The Fork prepares local IFRS statements before consolidation into TRIP US GAAP.

**IFRS 8 — Operating Segments**: Segments based on internal reporting to CODM. The Fork reported as part of Tripadvisor segment structure. Requires disclosure of segment revenue, profit/loss, assets if reported to CODM.

**IFRS 15 — Revenue from Contracts with Customers** (5-step model):
1. Identify contract (restaurant subscription or diner reservation)
2. Identify performance obligations (listing, reservation facilitation, SaaS access)
3. Determine transaction price (commission per cover or monthly SaaS fee)
4. Allocate to performance obligations
5. Recognize when obligation satisfied

- **Commission revenue**: recognized at point-in-time when reservation is seated. No-shows with penalty = recognize penalty fee.
- **SaaS revenue (TheFork Manager)**: recognized over time (monthly subscription period). Setup fees allocated over contract term if not distinct.
- **Principal vs Agent**: The Fork acts as agent (does not control restaurant service). Revenue = net commission, not gross transaction value.

**IFRS 16 — Leases**: Right-of-use asset + lease liability for office leases. Short-term (<12 months) and low-value exemptions available. Impact on EBITDA: lease payments replaced by depreciation + interest.

### US GAAP Standards (Tripadvisor parent consolidation)

**ASC 606 — Revenue Recognition**: Substantially converged with IFRS 15. Fewer practical expedients. Minimal adjustments expected for marketplace/SaaS model at consolidation.

**ASC 280 — Segment Reporting**: Segments aligned with CODM view. The Fork included in segment disclosure. Requires reconciliation of segment totals to consolidated amounts.

**ASC 842 — Leases**: Similar to IFRS 16 but classifies as operating or finance. Operating leases: single straight-line expense (vs IFRS 16 front-loaded depreciation + interest).

### SOX 404 Compliance (NYSE-listed parent)

- **ICFR**: Internal Controls over Financial Reporting. The Fork must maintain controls testable by TRIP auditors.
- **Key controls**: revenue recognition cut-off, commission calculation accuracy, FX translation, intercompany reconciliation, access controls on financial systems.
- **Material weakness**: reasonable possibility of material misstatement not prevented/detected. vs **Significant deficiency**: less severe.
- **COSO framework**: 5 components — control environment, risk assessment, control activities, information & communication, monitoring.

---

## 2. Corporate Finance Vocabulary

### Vernimmen (FR) / CFA (EN) — Side by Side

| FR (Vernimmen) | EN (CFA) | Definition / Formule |
|---|---|---|
| Chiffre d'affaires (CA) | Revenue / Net Sales | Total recognized revenue |
| Marge brute | Gross Margin | CA - Cout des ventes. % = Marge brute / CA |
| Excedent Brut d'Exploitation (EBE) | EBITDA | CA - charges d'exploitation hors D&A |
| Resultat d'exploitation (REX) | Operating Income / EBIT | EBE - Dotations aux amortissements et provisions |
| Resultat net | Net Income | After financial result, tax, exceptional items |
| Capacite d'autofinancement (CAF) | Cash Flow from Ops (approx) | Resultat net + D&A + provisions nettes |
| Besoin en Fonds de Roulement (BFR) | Working Capital Requirement | Stocks + Creances clients - Dettes fournisseurs |
| Fonds de Roulement (FR) | Net Working Capital | Capitaux permanents - Actifs immobilises |
| Tresorerie nette | Net Cash Position | FR - BFR |
| Free Cash Flow (FCF) | Free Cash Flow | EBIT x (1-t) + D&A - CapEx - delta BFR |
| Cout Moyen Pondere du Capital (CMPC) | WACC | (E/V) x ke + (D/V) x kd x (1-t) |
| Rentabilite des capitaux investis | ROIC | NOPAT / Invested Capital |
| Taux de rentabilite interne (TRI) | IRR | Rate where NPV = 0 |
| Valeur Actuelle Nette (VAN) | NPV | Sum of discounted future cash flows - investment |
| Ratio couverture service dette | DSCR | EBITDA / (Principal + Interest). >1.2x comfortable |
| Effet de levier financier | Financial Leverage | Net Debt / EBITDA |
| Valeur d'entreprise (VE) | Enterprise Value (EV) | Market Cap + Net Debt + Minorities - Associates |
| Multiple VE/EBE | EV/EBITDA | Primary valuation multiple for tech/marketplace |

### Additional Key Ratios

- **Regle de 40 / Rule of 40**: Revenue Growth % + EBITDA Margin % >= 40%. Benchmark for SaaS/marketplace.
- **LTV/CAC**: Lifetime Value / Customer Acquisition Cost. Healthy >= 3x.
- **Payback Period**: CAC / Monthly Contribution Margin. Target < 18 months.
- **Burn Multiple**: Net Burn / Net New ARR. <1x excellent, 1-2x good.

---

## 3. Marketplace Economics

### Core Metrics

**GMV (Gross Merchandise Value)**: Total transaction value facilitated. The Fork: seated covers x average ticket. Not revenue.

**Take Rate / Taux de commission**: Net Revenue / GMV. Blended rate = commission revenue / total GMV. Varies by market and product tier.

**Net Revenue / Revenu net**: GMV x Take Rate + SaaS subscriptions. IFRS 15 recognized revenue.

**Liquidity**: Probability diner finds a table and restaurant gets bookings. = successful reservations / total search-to-book attempts.

**Supply/Demand Balance**: Supply = restaurant seats on platform. Demand = diner bookings. Imbalance = friction.

**Disintermediation Risk**: Restaurants bypass platform for direct bookings. Mitigated by: discovery value, yield management tools, loyalty (Yums), demand generation.

### a16z Marketplace Frameworks

**Flywheel**: More diners -> more value for restaurants -> more supply -> more selection -> more diners. Network effects compound.

**GMV vs Net Revenue growth**: Declining take rate with growing GMV can mask revenue deceleration. Track both.

**Rake optimization**: Too high = churn + disintermediation. Too low = unsustainable economics. Maximize revenue without destroying supply retention.

**Multi-tenanting**: Restaurants list on multiple platforms. Switching cost driven by integration depth (POS, CRM data, yield management).

### Unit Economics (Per Transaction)

- **Average Commission per Cover**: Revenue per seated diner (commission model).
- **Contribution Margin per Transaction**: Commission - variable costs (payment processing, support, infrastructure).
- **CAC (Cout d'Acquisition Client)**: Marketing spend / new diners (demand side) OR sales cost / new restaurants (supply side). Track both separately.
- **LTV (Valeur Vie Client)**: Restaurants: monthly revenue x gross margin % x avg lifetime months. Diners: avg bookings/year x commission/booking x retention years.
- **Payback / Periode de retour**: CAC / monthly contribution margin.

---

## 4. SaaS Metrics (TheFork Manager B2B)

### Revenue Metrics

**ARR (Annual Recurring Revenue)**: Annualized active subscriptions. ARR = MRR x 12. Only contractually recurring; excludes one-time fees.

**MRR (Monthly Recurring Revenue)**: Sum of monthly subscription values. Components: New + Expansion - Contraction - Churned MRR.

**NRR (Net Revenue Retention / Retention nette)**: Revenue from existing cohort after churn and expansion. = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR. Target > 110%.

**GRR (Gross Revenue Retention / Retention brute)**: Before expansion. = (Starting MRR - Contraction - Churn) / Starting MRR. Always <= 100%. Target > 90%.

### Churn Metrics

**Logo Churn / Churn de clients**: Customers lost / total customers at period start. Monthly < 2% = healthy SMB SaaS.

**Revenue Churn / Churn de revenus**: MRR lost from churned + contracted / Starting MRR. More important than logo churn.

**Net Churn / Churn net**: Revenue churn - expansion revenue. Negative = growth from existing base without new sales.

### Efficiency Metrics

**Rule of 40**: ARR Growth % + FCF Margin % >= 40. Calculate TheFork Manager independently from marketplace.

**SaaS Magic Number**: Net New ARR (quarter) / S&M Spend (prior quarter). >0.75 efficient, <0.5 optimize first.

**CAC Payback (SaaS)**: Acquisition cost / (MRR x Gross Margin %). Months to recover. Target < 12 months SMB.

**Expansion Revenue Rate**: Upsell + cross-sell MRR / Starting MRR. Land-and-expand. TheFork Manager tiers: basic -> premium -> enterprise.

---

## 5. FP&A / Controle de Gestion

### DFCG Vocabulary

**Budget**: Annual financial plan, fixed reference for variance analysis.

**Forecast / Prevision**: Updated projection (quarterly or rolling). Replaces budget as best estimate mid-year.

**Atterrissage / Landing**: Year-end forecast = actuals-to-date + forecast remaining periods.

**Ecart / Variance**: Actual - Budget (or Forecast). Favorable = positive profit impact.

### Variance / Bridge Analysis

**Volume variance**: (Actual vol - Budget vol) x Budget price. Change in number of covers.

**Price/Rate variance**: (Actual price - Budget price) x Actual volume. Change in avg commission per cover.

**Mix variance**: Channel/market/product mix shift impact on blended margin. Higher share of high-commission markets = improved blended take rate.

**FX variance / Ecart de change**: Currency movement impact. Primary: EUR -> USD for TRIP reporting. Secondary: GBP, SEK, PLN.

**Bridge format**: Starting point -> Volume -> Price -> Mix -> FX -> Cost actions -> New initiatives -> End point. Standard CFO communication format.

### Planning Approaches

**Zero-Based Budgeting (ZBB / Budget base zero)**: Every expense justified from zero each cycle. Not incremental. For cost optimization phases.

**Driver-Based Planning / Planification par inducteurs**: Model built on operational drivers (covers, restaurants, conversion rate) not financial lines. Key drivers: active restaurants, covers/restaurant, commission rate, SaaS subscribers, ARPU.

**Rolling Forecast / Prevision glissante**: Continuous 12-18 month forecast updated monthly/quarterly. Replaces static annual budget.

**Scenario Planning**: Base, upside, downside. Stress-test: cover growth, churn, FX, competitive pricing.

### Pigment Alignment

Pigment = FP&A planning platform. Key integration:
- **Dimensions**: Entity (country), Product (commission/SaaS), Channel, Time (monthly)
- **Metrics hierarchy**: Operational drivers -> P&L -> cash flow -> balance sheet
- **Actuals integration**: ERP/accounting -> Pigment for variance analysis
- **Workflow**: Budget submission -> consolidation -> approval -> lock. Forecast cycles same flow.

---

## 6. Restaurant / Hospitality Sector

### Operational KPIs

**Covers / Couverts**: Diners seated. Primary volume metric. Utilization = actual covers / available seats.

**Average Ticket / Ticket moyen**: Spend per diner (food + bev). By market: FR ~28 EUR, IT ~25 EUR, ES ~22 EUR, UK ~32 GBP. Fine dining outliers higher.

**No-show Rate / Taux de no-show**: Unhonored reservations / total reservations. Industry avg 15-20%. The Fork mitigates via confirmations, CC guarantees, Yums penalty.

**Reservation Conversion**: Searches -> bookings -> seated. Funnel metric. Higher = better liquidity.

**RevPASH (Revenue Per Available Seat Hour)**: Restaurant yield metric. Total revenue / (seats x operating hours). Hotel equivalent: RevPAR.

### Yield Management

**Dynamic pricing**: Discount off-peak (e.g. -30% Tuesday lunch) to fill empty seats. Special Offers and Yums deals drive off-peak demand.

**Table allocation**: Balance walk-ins, direct, platform bookings to maximize RevPASH. TheFork Manager provides tools.

**Overbooking**: Accept more reservations than capacity to offset no-shows. Requires predictive modeling.

### Seasonality by Market

| Market | Peak | Trough | Notes |
|---|---|---|---|
| FR | Jun-Jul, Dec | Jan, Aug (Paris) | Summer regional shift, Noel peak |
| IT | Apr-Jun, Sep-Oct, Dec | Jan, Aug | Tourism peaks, Ferragosto dip |
| ES | Mar-Jun, Sep-Oct | Jan-Feb | Easter, coastal summer shift |
| UK | Nov-Dec | Jan | Christmas peak, Dry January trough |
| NL/DE | May-Sep, Dec | Jan-Feb | Outdoor season, Weihnachten |
| PT | Apr-Oct | Nov-Jan | Tourism alignment |
| SE | May-Aug, Dec | Jan-Mar | Short summer, Jul/Lucia |
| PL | May-Sep, Dec | Jan-Feb | Growing market, holiday peaks |

### Competitive Landscape

**OpenTable** (Booking Holdings): Dominant US/UK. Subscription + per-cover. Stronger fine dining.

**Google Maps/Reserve**: Zero-commission discovery. Disintermediation threat. Defense: yield tools, loyalty, CRM add value beyond discovery.

**Direct booking**: Restaurant own website/phone. Lower cost, lower discovery. The Fork defense = incremental demand restaurants cannot generate alone.

**Resy** (American Express): US-focused, premium. Limited European presence.

---

## 7. Tripadvisor Parent Reporting

### Segment Structure

Tripadvisor (NASDAQ: TRIP) segments:
- **Brand Tripadvisor**: Core platform, hotel meta, experiences
- **Viator**: Experiences marketplace
- **TheFork**: Restaurant marketplace

Each reports: Revenue, Adjusted EBITDA, D&A, Segment operating income. Corporate overhead allocated or shown separately.

### Intercompany Transactions

**Management fees**: TRIP charges The Fork for shared services (legal, HR, IT, overhead). Must comply with OECD transfer pricing guidelines.

**IP licensing**: Brand/technology licensing fees. Must be arm's length.

**Intercompany balances**: Receivables/payables eliminated in consolidation. Reconciled quarterly for SOX.

### Transfer Pricing

**Arm's length principle**: Priced as between unrelated parties. Methods: CUP (comparable uncontrolled price), TNMM (transactional net margin), Cost-plus.

**Documentation**: Master file + Local file per BEPS Action 13. CbCR (Country-by-Country Reporting) for TRIP group.

**Risk areas**: Commission allocation across jurisdictions, IP ownership, management fee levels, intra-group financing.

### FX Translation (EUR -> USD)

**Functional currency**: Each entity uses local currency (EUR FR/IT/ES/NL/DE/PT; GBP UK; SEK SE; PLN PL). Primary group = EUR.

**ASC 830 / IAS 21 translation**:
- P&L: average rate for period
- Balance sheet assets/liabilities: closing rate
- Equity: historical rates
- CTA (Cumulative Translation Adjustment): difference to OCI

**Impact**: EUR/USD moves affect TRIP consolidated. EUR weakening = lower USD revenue/profit. Creates translation variance in bridge.

### Quarterly Cadence

| Activity | Timing | Notes |
|---|---|---|
| Month-end close | WD+5 | Local entity close, IFRS adjustments |
| Consolidation package | WD+8 | Submit to TRIP in USD (HFM/OneStream) |
| Intercompany recon | WD+7 | Must tie before consolidation |
| Quarterly earnings | ~4 wks post Q-end | TRIP 10-Q/10-K, earnings call |
| Forecast submission | Mid-quarter | Updated remaining-year forecast |
| Budget cycle | Sep-Nov | Annual budget next FY |
| SOX testing | Ongoing + year-end | Continuous controls monitoring |

Fiscal year = calendar year. Q1 Jan-Mar, Q2 Apr-Jun, Q3 Jul-Sep, Q4 Oct-Dec. No 4-4-5.

---

## Appendix: Key Abbreviations

| Abbrev | Full | FR |
|---|---|---|
| ARR | Annual Recurring Revenue | Revenu recurrent annualise |
| BFR | Besoin en Fonds de Roulement | Working Capital Requirement |
| CAC | Customer Acquisition Cost | Cout d'acquisition client |
| CAGR | Compound Annual Growth Rate | Taux de croissance annuel compose |
| CapEx | Capital Expenditure | Investissements |
| CTA | Cumulative Translation Adjustment | Ecart de conversion cumule |
| D&A | Depreciation & Amortization | Dotations aux amortissements |
| DSCR | Debt Service Coverage Ratio | Ratio couverture de la dette |
| EBE | Excedent Brut d'Exploitation | EBITDA |
| FCF | Free Cash Flow | Flux de tresorerie disponible |
| FTE | Full-Time Equivalent | Equivalent temps plein (ETP) |
| GMV | Gross Merchandise Value | Volume brut de marchandises |
| ICFR | Internal Controls over Financial Reporting | Controles internes reporting |
| LTV | Lifetime Value | Valeur vie client |
| NRR | Net Revenue Retention | Retention nette de revenus |
| OCI | Other Comprehensive Income | Autres elements resultat global |
| ROIC | Return on Invested Capital | Retour sur capitaux investis |
| WACC | Weighted Avg Cost of Capital | CMPC |
| ZBB | Zero-Based Budgeting | Budget base zero |
