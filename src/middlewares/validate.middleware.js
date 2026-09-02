const { ZodError } = require('zod');

/**
 * Middleware factory for validating incoming requests with Zod schemas
 * @param {import('zod').ZodSchema} schema 
 * @param {'body' | 'query' | 'params'} source 
 */
function validate(schema, source = 'body') {
    return (req, res, next) => {
        try {
            const parsed = schema.parse(req[source]);
            req[source] = parsed;
            next();
        } catch (error) {
            if (error instanceof ZodError || error.name === 'ZodError') {
                const errorList = error.issues || error.errors || [];
                const issues = errorList.map(err => ({
                    field: Array.isArray(err.path) ? err.path.join('.') : '',
                    message: err.message
                }));
                return res.status(400).json({
                    error: issues[0]?.message || 'Datos de entrada inválidos.',
                    details: issues
                });
            }
            next(error);
        }
    };
}

module.exports = {
    validate
};
