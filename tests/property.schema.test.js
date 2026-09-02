const { propertySchema, queryUrlSchema } = require('../src/schemas/property.schema');
const { sendOtpSchema, verifyOtpSchema } = require('../src/schemas/auth.schema');

describe('Zod Schemas Validation', () => {
    describe('propertySchema', () => {
        it('validates a valid property payload and assigns defaults', () => {
            const raw = {
                title: 'Piso céntrico con terraza',
                price: '185000',
                ccaa: 'Madrid',
                rooms: '3',
                baths: '2'
            };

            const parsed = propertySchema.parse(raw);
            expect(parsed.title).toBe('Piso céntrico con terraza');
            expect(parsed.price).toBe(185000);
            expect(parsed.rooms).toBe(3);
            expect(parsed.baths).toBe(2);
            expect(parsed.estate_type).toBe('secondhand');
            expect(parsed.garage).toBe('no');
            expect(parsed.elevator).toBe('desconocido');
        });

        it('rejects payload without title or price', () => {
            expect(() => propertySchema.parse({ price: 100000, ccaa: 'Madrid' })).toThrow();
            expect(() => propertySchema.parse({ title: 'Casa', ccaa: 'Madrid' })).toThrow();
            expect(() => propertySchema.parse({ title: 'Casa', price: 100000 })).toThrow();
        });
    });

    describe('authSchemas', () => {
        it('cleans and lowercases valid email in sendOtpSchema', () => {
            const result = sendOtpSchema.parse({ email: '  TestUser@Gmail.COM  ' });
            expect(result.email).toBe('testuser@gmail.com');
        });

        it('rejects invalid email formats', () => {
            expect(() => sendOtpSchema.parse({ email: 'not-an-email' })).toThrow();
        });

        it('validates otp verify payload', () => {
            const result = verifyOtpSchema.parse({ email: 'user@test.com', code: ' 123456 ' });
            expect(result.code).toBe('123456');
        });
    });

    describe('queryUrlSchema', () => {
        it('validates a proper URL query parameter', () => {
            const parsed = queryUrlSchema.parse({ url: 'https://www.fotocasa.es/es/comprar/vivienda/madrid/123' });
            expect(parsed.url).toContain('fotocasa.es');
        });

        it('rejects non-URL string', () => {
            expect(() => queryUrlSchema.parse({ url: 'invalid-url' })).toThrow();
        });
    });
});
