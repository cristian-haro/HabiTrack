const { z } = require('zod');

const calculatorSettingsSchema = z.object({
    downpaymentPct: z.coerce.number().min(0).max(100).default(20),
    notaryRegistryPct: z.coerce.number().min(0).max(10).default(1.5),
    appraisalCost: z.coerce.number().min(0).default(400),
    newBuildAjd: z.coerce.number().min(0).max(10).default(1.0),
    ccaaRates: z.record(z.string(), z.coerce.number().min(0).max(30)).optional(),
    mortgageInterestRate: z.coerce.number().min(0).max(30).default(3.0),
    mortgageDurationYears: z.coerce.number().int().min(1).max(50).default(30)
});

module.exports = {
    calculatorSettingsSchema
};
