declare const _exports: {
    sendOtpSchema: z.ZodObject<{
        email: z.ZodPipe<z.ZodString, z.ZodString>;
    }, z.core.$strip>;
    verifyOtpSchema: z.ZodObject<{
        email: z.ZodPipe<z.ZodString, z.ZodString>;
        code: z.ZodPipe<z.ZodPipe<z.ZodCoercedString<unknown>, z.ZodTransform<string, string>>, z.ZodString>;
    }, z.core.$strip>;
};
export = _exports;
import { z } from 'zod';
