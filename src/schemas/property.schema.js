const { z } = require('zod');

const propertySchema = z.object({
    title: z.string({
        required_error: 'El título es obligatorio.'
    }).min(1, 'El título no puede estar vacío.').max(255),
    price: z.coerce.number({
        required_error: 'El precio es obligatorio.'
    }).positive('El precio debe ser un número positivo.'),
    m2: z.coerce.number().positive().nullable().optional(),
    ccaa: z.string({
        required_error: 'La Comunidad Autónoma es obligatoria.'
    }).min(1, 'La Comunidad Autónoma no puede estar vacía.'),
    rooms: z.coerce.number().int().min(0).default(0).optional(),
    baths: z.coerce.number().int().min(0).default(0).optional(),
    estate_type: z.enum(['secondhand', 'new']).default('secondhand').optional(),
    garage: z.enum(['si', 'no', 'opcional']).default('no').optional(),
    zone: z.string().nullable().optional(),
    url: z.string().url('URL inválida.').nullable().optional().or(z.literal('')),
    photos: z.string().nullable().optional(),
    elevator: z.enum(['si', 'no', 'desconocido']).default('desconocido').optional(),
    comments: z.string().nullable().optional(),
    rating: z.coerce.number().int().min(0).max(5).default(0).optional(),
    latitude: z.coerce.number().nullable().optional(),
    longitude: z.coerce.number().nullable().optional(),
    status: z.enum(['active', 'inactive', 'unknown']).default('active').optional(),
    last_checked_at: z.string().nullable().optional()
});

const queryUrlSchema = z.object({
    url: z.string({
        required_error: 'La URL es obligatoria.'
    }).url('Introduce una URL válida.')
});

module.exports = {
    propertySchema,
    queryUrlSchema
};
