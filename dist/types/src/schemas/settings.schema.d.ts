declare const _exports: {
    calculatorSettingsSchema: z.ZodObject<{
        downpaymentPct: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        notaryRegistryPct: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        appraisalCost: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        newBuildAjd: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        ccaaRates: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodCoercedNumber<unknown>>>;
        mortgageInterestRate: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        mortgageDurationYears: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    }, z.core.$strip>;
};
export = _exports;
import { z } from 'zod';
