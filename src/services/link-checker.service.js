/**
 * Service to check if real estate listings (Idealista, Fotocasa, Habitaclia, etc.)
 * are still active or have been delisted / deactivated.
 */

const DELISTED_PATTERNS = [
    /el anuncio ya no est[áa] publicado/i,
    /anuncio dado de baja/i,
    /inmueble dado de baja/i,
    /este inmueble ya no est[áa] disponible/i,
    /este anuncio ha sido dado de baja/i,
    /vivienda no disponible/i,
    /anuncio no disponible/i,
    /inmueble no disponible/i,
    /este piso se ha vendido/i,
    /este piso se ha alquilado/i
];

/**
 * Check a property URL's health & availability status
 * @param {string} url - Target property listing URL
 * @returns {Promise<{active: boolean, status: string, httpCode: number, message: string, checkedAt: string}>}
 */
async function checkPropertyLink(url) {
    const checkedAt = new Date().toISOString();

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        return {
            active: false,
            status: 'unknown',
            httpCode: 0,
            message: 'URL inválida o no especificada',
            checkedAt
        };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            redirect: 'follow',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const httpCode = response.status;
        const finalUrl = response.url || url;

        // 404 Not Found o 410 Gone = Inmueble dado de baja directamente
        if (httpCode === 404 || httpCode === 410) {
            return {
                active: false,
                status: 'inactive',
                httpCode,
                message: 'Anuncio retirado del portal (HTTP 404/410)',
                checkedAt
            };
        }

        // Si fue redirigido a la raíz de búsqueda general (comportamiento típico de Fotocasa al expirar)
        if (url.includes('fotocasa.es') && (finalUrl.endsWith('/comprar/viviendas/') || finalUrl.includes('/es/comprar/viviendas/listado'))) {
            return {
                active: false,
                status: 'inactive',
                httpCode,
                message: 'Redirigido al listado general (inmueble expirado)',
                checkedAt
            };
        }

        // Si el código es 200, inspeccionamos el contenido HTML
        if (httpCode === 200) {
            const html = await response.text();

            for (const pattern of DELISTED_PATTERNS) {
                if (pattern.test(html)) {
                    return {
                        active: false,
                        status: 'inactive',
                        httpCode,
                        message: 'El portal indica que el anuncio ya no está publicado',
                        checkedAt
                    };
                }
            }

            return {
                active: true,
                status: 'active',
                httpCode: 200,
                message: 'Anuncio activo y publicado',
                checkedAt
            };
        }

        // Si el portal devuelve 403 (por protección anti-bot) pero no 404/410, se mantiene como activo o indeterminado
        if (httpCode === 403) {
            return {
                active: true,
                status: 'active',
                httpCode,
                message: 'Protección anti-bot del portal (se asume activo)',
                checkedAt
            };
        }

        return {
            active: httpCode < 400,
            status: httpCode < 400 ? 'active' : 'inactive',
            httpCode,
            message: `Respuesta del portal (HTTP ${httpCode})`,
            checkedAt
        };
    } catch (err) {
        return {
            active: true, // Si hay timeout o error de red puntual, no lo marcamos como inactivo para no generar falsos positivos
            status: 'unknown',
            httpCode: 0,
            message: `No se pudo conectar con el portal (${err.message})`,
            checkedAt
        };
    }
}

module.exports = {
    checkPropertyLink,
    DELISTED_PATTERNS
};
