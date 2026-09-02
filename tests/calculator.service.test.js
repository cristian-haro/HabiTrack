const { calculatePurchaseExpenses } = require('../src/services/calculator.service');

describe('Calculator Service - Spanish Real Estate Purchase Calculations', () => {
    it('calculates secondhand property expenses in Madrid (6% ITP)', () => {
        const result = calculatePurchaseExpenses({
            price: 200000,
            ccaa: 'Madrid',
            estateType: 'secondhand',
            downpaymentPct: 20,
            notaryRegistryPct: 1.5,
            appraisalCost: 400,
            mortgageInterestRate: 3.0,
            mortgageDurationYears: 30
        });

        // 6% of 200,000 = 12,000
        expect(result.tax.ratePct).toBe(6.0);
        expect(result.tax.amount).toBe(12000);

        // 1.5% of 200,000 = 3,000
        expect(result.notaryRegistryAmount).toBe(3000);
        expect(result.appraisalCost).toBe(400);

        // Total expenses = 12000 + 3000 + 400 = 15400
        expect(result.totalExpenses).toBe(15400);

        // Downpayment: 20% of 200,000 = 40,000
        expect(result.downpayment.amount).toBe(40000);

        // Mortgage principal: 160,000
        expect(result.mortgage.principal).toBe(160000);

        // Upfront needed: 40000 + 15400 = 55400
        expect(result.totalUpfrontNeeded).toBe(55400);

        // Total cost: 200000 + 15400 = 215400
        expect(result.totalCost).toBe(215400);

        // Monthly quota for 160,000 EUR at 3% for 30 years is ~674.56 EUR
        expect(result.mortgage.monthlyQuota).toBeCloseTo(674.56, 1);
    });

    it('calculates secondhand property expenses in Cataluña (10% ITP)', () => {
        const result = calculatePurchaseExpenses({
            price: 300000,
            ccaa: 'Cataluña',
            estateType: 'secondhand'
        });

        // 10% of 300,000 = 30,000
        expect(result.tax.ratePct).toBe(10.0);
        expect(result.tax.amount).toBe(30000);
    });

    it('calculates new build property expenses (10% IVA + 1% AJD)', () => {
        const result = calculatePurchaseExpenses({
            price: 250000,
            ccaa: 'Andalucía',
            estateType: 'new'
        });

        // 11% total tax (10% IVA + 1% AJD) = 27,500
        expect(result.tax.ratePct).toBe(11.0);
        expect(result.tax.amount).toBe(27500);
    });

    it('calculates new build property in Canarias (6.5% IGIC + 1% AJD)', () => {
        const result = calculatePurchaseExpenses({
            price: 200000,
            ccaa: 'Canarias',
            estateType: 'new'
        });

        // 7.5% total tax (6.5% IGIC + 1% AJD) = 15,000
        expect(result.tax.ratePct).toBe(7.5);
        expect(result.tax.amount).toBe(15000);
    });

    it('supports custom CCAA tax rates override', () => {
        const result = calculatePurchaseExpenses({
            price: 100000,
            ccaa: 'Madrid',
            estateType: 'secondhand',
            customCcaaRates: {
                'Madrid': 4.0 // E.g. youth discount
            }
        });

        expect(result.tax.ratePct).toBe(4.0);
        expect(result.tax.amount).toBe(4000);
    });
});
