import { z } from 'zod';
export declare const RequestOtpSchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
export declare const VerifyOtpSchema: z.ZodObject<{
    email: z.ZodString;
    otp: z.ZodString;
}, z.core.$strip>;
export declare const UserSessionSchema: z.ZodObject<{
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    email: z.ZodString;
    role: z.ZodDefault<z.ZodString>;
    token: z.ZodString;
}, z.core.$strip>;
export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type UserSession = z.infer<typeof UserSessionSchema>;
