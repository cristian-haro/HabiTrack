declare const _exports: {
    validate: typeof validate;
};
export = _exports;
/**
 * Middleware factory for validating incoming requests with Zod schemas
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
declare function validate(schema: import('zod').ZodSchema, source?: 'body' | 'query' | 'params'): (req: any, res: any, next: any) => any;
