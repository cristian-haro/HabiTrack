---
name: mortgage-tax-calculator
description: Provides regulatory tax rates (ITP, IVA, AJD) and financial formulas for calculating property purchase costs and French mortgage amortization quotas across Spain's 17 Autonomous Communities. Use when calculating property acquisition expenses, financing breakdowns, or monthly mortgage quotes.
---

# Mortgage & Tax Calculator

Provides financial calculation formulas, statutory tax brackets, and amortisation mechanics for residential property transactions across Spain.

## When to Use

- Estimating property purchase expenses (second-hand vs new developments).
- Calculating ITP (Impuesto de Transmisiones Patrimoniales) by Spanish Autonomous Community.
- Computing IVA (10%) and AJD (Actos Juridicos Documentados) for new build homes.
- Simulating monthly mortgage installments and required upfront savings.

## Steps

### 1. Identify Property Type & Jurisdiction
1. Determine whether the property is:
   - **Second-hand (Segunda Mano):** Subject to ITP (no IVA).
   - **New build (Obra Nueva):** Subject to 10% IVA (6.5% IGIC in Canarias) + AJD.
2. Resolve the Autonomous Community where the property is located to select the applicable ITP/AJD tax rate.

### 2. Tax Rates Reference Matrix
Apply the baseline regional ITP brackets:

| Autonomous Community | General ITP Rate (%) |
| :--- | :--- |
| **Cataluña, C. Valenciana** | 10.0% |
| **Cantabria, Castilla-La Mancha, Galicia** | 9.0% |
| **Aragón, Asturias, Baleares, Castilla y León, Extremadura, Murcia** | 8.0% |
| **Andalucía, La Rioja** | 7.0% |
| **Canarias** | 6.5% (IGIC) |
| **Madrid, Navarra, Ceuta, Melilla** | 6.0% |
| **País Vasco** | 4.0% |

### 3. Calculate Notary, Registry & Ancillary Costs
1. **Notary & Land Registry (Notaría y Registro):** Estimate at ~1.0% to 1.5% of purchase price.
2. **Management Agency (Gestoría):** Estimate ~300€ - 500€ (default 400€).
3. **Appraisal (Tasación Hipotecaria):** Estimate ~300€ - 500€ (default 400€).

### 4. French Amortization Formula Execution
Calculate monthly installment $M$ for principal $P$, nominal interest rate $r = \frac{\text{TIN}}{12}$, and total payment periods $n = \text{years} \times 12$:

$$M = P \cdot \frac{r(1+r)^n}{(1+r)^n - 1}$$

Compute required upfront capital:
$$\text{Ahorro requerido} = (\text{Precio} - P) + \text{Total Impuestos} + \text{Gastos}$$

## Gotchas

- **Reduced tax rates**: Many Autonomous Communities offer reduced ITP rates (e.g. 3.5% - 5%) for buyers under 35 years old, large families, or buyers with disabilities. Always allow manual rate overrides.
- **Verification**: Reference core implementation in `src/services/calculator.service.js` and keep financial formulas synchronized.
