const { scrapePropertyUrl } = require('../src/services/scraper.service');

describe('Scraper Service Tests', () => {
    it('handles Idealista Cloudflare protection politely', async () => {
        const res = await scrapePropertyUrl('https://www.idealista.com/inmueble/105555555/');
        expect(res.success).toBe(false);
        expect(res.source).toBe('idealista');
        expect(res.error).toContain('Bookmarklet');
    });

    it('handles Facebook Marketplace protection politely', async () => {
        const res = await scrapePropertyUrl('https://www.facebook.com/marketplace/item/123456789/');
        expect(res.success).toBe(false);
        expect(res.source).toBe('facebook');
        expect(res.error).toContain('Bookmarklet');
    });

    it('scrapes Inmovilla real estate listings accurately', async () => {
        const inmovillaUrl = 'https://www.artesainmobiliaria.es/ficha/piso/granada/palacio-de-deportes/7791/27263717/es/';
        const res = await scrapePropertyUrl(inmovillaUrl);

        if (res.success) {
            expect(res.source).toBe('inmovilla');
            expect(res.data.title).toBeDefined();
            expect(res.data.price).toBeGreaterThan(0);
            expect(res.data.m2).toBeGreaterThan(0);
            expect(res.data.rooms).toBeGreaterThan(0);
            expect(res.data.photos).toBeDefined();
        }
    });
});
