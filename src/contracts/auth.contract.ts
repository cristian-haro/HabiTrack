import { z } from 'zod';

// Contrato formal Zod para autenticación Passwordless OTP
export const RequestOtpSchema = z.object({
  email: z.string().email({ message: 'El correo electrónico debe ser válido' }).toLowerCase().trim()
});

export const VerifyOtpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  otp: z.string().length(6, { message: 'El código OTP debe tener exactamente 6 dígitos' }).regex(/^\d+$/, { message: 'El código OTP sólo debe contener números' })
});

export const UserSessionSchema = z.object({
  id: z.union([z.string(), z.number()]),
  email: z.string().email(),
  role: z.string().default('user'),
  token: z.string()
});

// Inferencias de tipos TypeScript
export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type UserSession = z.infer<typeof UserSessionSchema>;
