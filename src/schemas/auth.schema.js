const { z } = require('zod');

const emailField = z.string({
    required_error: 'El correo electrónico es obligatorio.'
})
.trim()
.toLowerCase()
.pipe(z.string().email('Introduce un correo electrónico válido.'));

const sendOtpSchema = z.object({
    email: emailField
});

const verifyOtpSchema = z.object({
    email: emailField,
    code: z.coerce.string({
        required_error: 'El código de verificación es obligatorio.'
    }).transform(val => val.trim()).pipe(z.string().min(4, 'El código debe tener al menos 4 caracteres.'))
});

module.exports = {
    sendOtpSchema,
    verifyOtpSchema
};
