import { z } from 'zod';

// Contrato formal Zod para Inmuebles en HabiTrack
export const PropertyStatusSchema = z.enum([
  'interesado',
  'contactado',
  'visita_pendiente',
  'visitado',
  'oferta_presentada',
  'descartado',
  'comprado'
]);

export const PropertyContractSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  user_id: z.union([z.string(), z.number()]).optional(),
  workspace_id: z.union([z.string(), z.number()]).nullable().optional(),
  titulo: z.string().min(1, { message: 'El título es obligatorio' }),
  precio: z.number().positive({ message: 'El precio debe ser un número positivo' }),
  enlace: z.string().url({ message: 'Debe ser una URL válida' }).optional().or(z.literal('')),
  portal: z.string().optional(),
  localidad: z.string().optional(),
  comunidad_autonoma: z.string().default('Andalucía'),
  superficie_m2: z.number().nonnegative().optional().default(0),
  habitaciones: z.number().int().nonnegative().optional().default(0),
  banos: z.number().int().nonnegative().optional().default(0),
  estado: PropertyStatusSchema.default('interesado'),
  tipo_vivienda: z.enum(['segunda_mano', 'obra_nueva']).default('segunda_mano'),
  fotos: z.array(z.string()).default([]),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  notas: z.string().optional().default('')
});

export const PropertyFilterSchema = z.object({
  estado: PropertyStatusSchema.optional(),
  workspace_id: z.union([z.string(), z.number()]).optional(),
  min_precio: z.number().optional(),
  max_precio: z.number().optional(),
  localidad: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(20)
});

// Inferencias de tipos TypeScript
export type PropertyStatus = z.infer<typeof PropertyStatusSchema>;
export type PropertyContract = z.infer<typeof PropertyContractSchema>;
export type PropertyFilter = z.infer<typeof PropertyFilterSchema>;
