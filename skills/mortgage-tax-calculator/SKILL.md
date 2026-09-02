---
name: mortgage-tax-calculator
description: >-
  Expert guidance and financial formulas for calculating property purchase taxes
  (ITP, IVA, AJD) and mortgage amortization quotas in Spain across all 17 Autonomous Communities.
---

# Mortgage & Tax Calculator Skill for Spain

This skill provides regulatory tax rates and financial formulas for property transactions in Spain.

## Tax Breakdown by Property Type

### 1. Second-Hand Housing (Vivienda de Segunda Mano)
Subject to **ITP (Impuesto de Transmisiones Patrimoniales)** managed by Autonomous Communities:

| Autonomous Community | General ITP Rate (%) |
| :--- | :--- |
| **Cataluña, C. Valenciana** | 10.0% |
| **Cantabria, Castilla-La Mancha, Galicia** | 9.0% |
| **Aragón, Asturias, Baleares, Castilla y León, Extremadura, Murcia** | 8.0% |
| **Andalucía, La Rioja** | 7.0% |
| **Canarias** | 6.5% |
| **Madrid, Navarra, Ceuta, Melilla** | 6.0% |
| **País Vasco** | 4.0% |

### 2. New Build Housing (Obra Nueva)
* **IVA (Impuesto sobre el Valor Añadido):** 10.0% (general) or 6.5% IGIC in Canarias.
* **AJD (Actos Jurídicos Documentados):** General standard is 1.0% to 1.5% depending on the region.

## Additional Purchase Expenses
* **Notary & Property Registry:** Typically ~1.0% - 1.5% of the purchase price.
* **Appraisal (Tasación Hipotecaria):** Fixed estimate of ~300€ - 500€ (default 400€).

## Mortgage Amortization Formula (French System)
Monthly payment $M$ for principal $P$, monthly interest rate $r = \frac{\text{TIN}}{12}$, and total payments $n = \text{years} \times 12$:

$$M = P \cdot \frac{r(1+r)^n}{(1+r)^n - 1}$$

## Implementation Reference
See the core logic implemented in [calculator.service.js](file:///C:/Users/crist/Documents/GitHub/HabiTrack/src/services/calculator.service.js).
