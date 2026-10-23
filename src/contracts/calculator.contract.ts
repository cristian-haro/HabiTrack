import { z } from 'zod';

// Contrato formal Zod para la Calculadora Financiera de Compraventa e Hipotecas en España
export const AutonomousCommunitySchema = z.enum([
  'Andalucía',
  'Aragón',
  'Asturias',
  'Baleares',
  'Canarias',
  'Cantabria',
  'Castilla-La Mancha',
  'Castilla y León',
  'Cataluña',
  'Comunidad Valenciana',
  'Extremadura',
  'Galicia',
  'Madrid',
  'Murcia',
  'Navarra',
  'País Vasco',
  'La Rioja',
  'Ceuta',
  'Melilla'
]);

export const CalculateExpensesInputSchema = z.object({
  precio: z.number().positive({ message: 'El precio debe ser mayor a 0' }),
  comunidad_autonoma: AutonomousCommunitySchema.default('Andalucía'),
  tipo_vivienda: z.enum(['segunda_mano', 'obra_nueva']).default('segunda_mano'),
  porcentaje_financiacion: z.number().min(0).max(100).default(80),
  plazo_anos: z.number().int().min(1).max(40).default(30),
  tipo_interes_anual: z.number().min(0).max(20).default(3.0),
  tasacion_estimada: z.number().nonnegative().default(400),
  gestoria_estimada: z.number().nonnegative().default(400)
});

export const CalculateExpensesOutputSchema = z.object({
  precio: z.number(),
  impuestos: z.object({
    tipo: z.enum(['ITP', 'IVA_AJD']),
    tipo_impositivo_pct: z.number(),
    importe: z.number()
  }),
  gastos_notaria_registro: z.number(),
  tasacion: z.number(),
  gestoria: z.number(),
  total_gastos_compra: z.number(),
  hipoteca: z.object({
    capital_prestado: z.number(),
    cuota_mensual: z.number(),
    total_intereses: z.number(),
    coste_total_prestamo: z.number()
  }),
  capital_propio_necesario: z.number() // Ahorro requerido en firma
});

// Inferencias de tipos TypeScript
export type AutonomousCommunity = z.infer<typeof AutonomousCommunitySchema>;
export type CalculateExpensesInput = z.infer<typeof CalculateExpensesInputSchema>;
export type CalculateExpensesOutput = z.infer<typeof CalculateExpensesOutputSchema>;
