/**
 * Service to analyze real estate URLs and extract structured property data
 */
async function scrapePropertyUrl(urlStr) {
    const url = new URL(urlStr);
    
    // Headers mimicking a real browser
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3'
    };

    // If it is Idealista, return a structured response indicating the block
    if (url.hostname.includes('idealista.com')) {
        return {
            success: false,
            source: 'idealista',
            error: 'Idealista bloquea las peticiones automáticas desde el servidor (error 403 de Cloudflare). Por favor, utiliza el Bookmarklet para extraer todos los datos y fotos en 1 click.'
        };
    }

    // If it is Facebook, return a structured response indicating the block
    if (url.hostname.includes('facebook.com')) {
        return {
            success: false,
            source: 'facebook',
            error: 'Facebook bloquea las peticiones automáticas desde el servidor (requiere inicio de sesión). Por favor, utiliza el Bookmarklet para extraer todos los datos y fotos en 1 click.'
        };
    }

    const response = await fetch(urlStr, { headers });
    if (!response.ok) {
        if (response.status === 403 || response.status === 405 || response.status === 429 || response.status === 503) {
            const siteName = url.hostname.replace('www.', '');
            return {
                success: false,
                source: siteName.split('.')[0],
                error: `El portal ${siteName} bloquea las peticiones automáticas desde servidores en la nube con código ${response.status}. Por favor, utiliza el Bookmarklet de 1-click en tu navegador para extraer los datos al instante.`
            };
        }
        throw new Error(`El servidor respondió con código ${response.status}`);
    }

    const html = await response.text();

    // 1. Structured Fotocasa Parser
    if (url.hostname.includes('fotocasa.es')) {
        const match = html.match(/<script type="application\/json" id="__initial_props__">([\s\S]*?)<\/script>/i);
        if (match && match[1]) {
            try {
                const data = JSON.parse(match[1]);
                const entity = data.realEstateAdDetailEntityV2 || data.realEstate || {};
                const features = data.realEstate?.features || {};
                
                // Extract photo URLs
                const photoList = [];
                if (entity.multimedias && Array.isArray(entity.multimedias)) {
                    entity.multimedias.forEach(item => {
                        if (item.url && (item.type === 'image' || !item.type)) {
                            photoList.push(item.url);
                        }
                    });
                }

                // Check garage & elevator from features list
                let garage = 'no';
                let elevator = 'desconocido';
                if (Array.isArray(entity.features)) {
                    const parkingFeat = entity.features.find(f => f.type === 'PARKING');
                    if (parkingFeat && parkingFeat.value !== 'NO') {
                        garage = 'si';
                    }
                    const elevatorFeat = entity.features.find(f => f.type === 'ELEVATOR');
                    if (elevatorFeat) {
                        elevator = elevatorFeat.value === 'YES' ? 'si' : 'no';
                    }
                }

                // Construct neighborhood zone
                let zone = '';
                if (entity.address) {
                    const parts = [];
                    if (entity.address.locality) parts.push(entity.address.locality);
                    if (entity.address.province) parts.push(entity.address.province);
                    zone = parts.join(', ');
                }

                const ccaa = entity.address?.autonomousCommunity || 'Andalucía';
                let estate_type = 'secondhand';
                if (entity.constructionType === 'new') estate_type = 'new';

                return {
                    success: true,
                    source: 'fotocasa',
                    data: {
                        title: data.propertyTitle || entity.description || 'Piso en Fotocasa',
                        price: entity.price?.amount || data.realEstate?.price || 0,
                        m2: features.surface || null,
                        rooms: features.rooms || 0,
                        baths: features.bathrooms || 0,
                        estate_type,
                        garage,
                        elevator,
                        zone,
                        ccaa,
                        photos: photoList.join(', '),
                        latitude: entity.address?.coordinates?.lat || null,
                        longitude: entity.address?.coordinates?.lng || null,
                        comments: entity.description || '',
                        url: urlStr
                    }
                };
            } catch (jsonErr) {
                console.warn('Error parsing fotocasa JSON, falling back to regex parser', jsonErr);
            }
        }
    }

    // 2. Structured Inmovilla CMS Parser (Artesa Inmobiliaria, Apinmo, etc.)
    const isInmovilla = url.hostname.includes('inmovilla') || 
                        url.hostname.includes('apinmo') || 
                        url.pathname.includes('/ficha/') || 
                        html.includes('inmovilla') || 
                        html.includes('fichapropiedad') || 
                        html.includes('apinmo.com');

    if (isInmovilla) {
        try {
            const inmoData = {
                title: '',
                price: 0,
                m2: null,
                rooms: 0,
                baths: 0,
                estate_type: 'secondhand',
                garage: 'no',
                elevator: 'desconocido',
                zone: '',
                ccaa: 'Andalucía',
                photos: '',
                latitude: null,
                longitude: null,
                comments: '',
                url: urlStr
            };

            // Title
            const titleMatch = html.match(/<div[^>]*class=["'][^"']*fichapropiedad-tituloprincipal[^"']*["'][^>]*>[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
                               html.match(/<section[^>]*id=["']modulo-fichapropiedad["'][\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
                               html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
            if (titleMatch && titleMatch[1]) {
                inmoData.title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
            }

            // Price
            const priceMatch = html.match(/class=["'][^"']*fichapropiedad-precio[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|p)>/i) ||
                               html.match(/<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i);
            if (priceMatch && priceMatch[1]) {
                const rawP = priceMatch[1].replace(/<[^>]+>/g, '').replace(/[^\d]/g, '');
                inmoData.price = rawP ? parseInt(rawP, 10) : 0;
            }

            // Surface (m2)
            const m2Match = html.match(/Superficie\s+(?:Construida|Útil|util)[^<]*<\/span>\s*<span[^>]*class=["']valor["'][^>]*>([\s\S]*?)<\/span>/i) ||
                            html.match(/Superficie\s+(?:Construida|Útil|util)[^<]*<\/div>[\s\S]*?<div[^>]*class=["'][^"']*fichapropiedad-datos-derecha[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
                            html.match(/(\d+)\s*(?:m²|m2|m<sup>2<\/sup>)/i);
            if (m2Match && m2Match[1]) {
                const cleanM = m2Match[1].replace(/<[^>]+>/g, '').match(/\d+/);
                if (cleanM) inmoData.m2 = parseInt(cleanM[0], 10);
            }

            // Rooms
            const habMatch = html.match(/Habitaciones[^<]*<\/span>\s*<span[^>]*class=["']valor["'][^>]*>([\s\S]*?)<\/span>/i) ||
                             html.match(/Habitaciones[^<]*<\/div>[\s\S]*?<div[^>]*class=["'][^"']*fichapropiedad-datos-derecha[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
                             html.match(/(\d+)\s*(?:hab|dormitorio|habitac)/i);
            if (habMatch && habMatch[1]) {
                const cleanH = habMatch[1].replace(/<[^>]+>/g, '').match(/\d+/);
                if (cleanH) inmoData.rooms = parseInt(cleanH[0], 10);
            }

            // Baths
            const banosMatch = html.match(/Baños[^<]*<\/span>\s*<span[^>]*class=["']valor["'][^>]*>([\s\S]*?)<\/span>/i) ||
                              html.match(/Baños[^<]*<\/div>[\s\S]*?<div[^>]*class=["'][^"']*fichapropiedad-datos-derecha[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
                              html.match(/(\d+)\s*(?:baño|aseo|wc)/i);
            if (banosMatch && banosMatch[1]) {
                const cleanB = banosMatch[1].replace(/<[^>]+>/g, '').match(/\d+/);
                if (cleanB) inmoData.baths = parseInt(cleanB[0], 10);
            }

            // Zone & City
            const zoneMatch = html.match(/Zona\s*\/\s*Ciudad[^<]*<\/span>\s*<span[^>]*class=["']valor["'][^>]*>([\s\S]*?)<\/span>/i) ||
                              html.match(/Zona\s*\/\s*Ciudad[^<]*<\/div>[\s\S]*?<div[^>]*class=["'][^"']*fichapropiedad-datos-derecha[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
            const streetMatch = html.match(/Calle[^<]*<\/span>\s*<span[^>]*class=["']valor["'][^>]*>([\s\S]*?)<\/span>/i) ||
                                html.match(/Calle[^<]*<\/div>[\s\S]*?<div[^>]*class=["'][^"']*fichapropiedad-datos-derecha[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

            const zParts = [];
            if (streetMatch && streetMatch[1]) zParts.push(streetMatch[1].replace(/<[^>]+>/g, '').trim());
            if (zoneMatch && zoneMatch[1]) zParts.push(zoneMatch[1].replace(/<[^>]+>/g, '').trim());
            if (zParts.length > 0) inmoData.zone = zParts.join(', ');

            // Calidades (Ascensor, Parking)
            if (/bloqueCalidadPropiedad[\s\S]*?Ascensor/i.test(html) || /Ascensor/i.test(html)) {
                inmoData.elevator = 'si';
            }
            if (/bloqueCalidadPropiedad[\s\S]*?(?:Garaje|Parking|Cochera)/i.test(html) || /(?:Garaje|Parking|Cochera)/i.test(html)) {
                inmoData.garage = 'si';
            }

            // Description
            const descMatch = html.match(/<div[^>]*id=["']fichapropiedad-bloquedescripcion["'][^>]*>([\s\S]*?)<\/div>/i) ||
                              html.match(/<div[^>]*class=["'][^"']*fichapropiedad-descripcion[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
                              html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
            if (descMatch && descMatch[1]) {
                inmoData.comments = descMatch[1].replace(/<[^>]+>/g, '').trim();
            }

            // Photos HD Extraction
            const photosList = [];
            const seenBase = new Set();
            const cfRegex = /cargafoto=["']([^"']+)["']/gi;
            let cf;
            while ((cf = cfRegex.exec(html)) !== null) {
                let pUrl = cf[1].replace(/s\.(jpg|jpeg|webp|png)(\?.*)?$/i, '.$1$2').replace(/\?n$/i, '');
                if (!pUrl.startsWith('http')) {
                    if (pUrl.startsWith('//')) pUrl = 'https:' + pUrl;
                    else if (pUrl.startsWith('/')) pUrl = url.origin + pUrl;
                }
                const fn = pUrl.split('/').pop().split('?')[0].toLowerCase().replace(/\.(jpg|jpeg|webp|png)$/i, '');
                if (fn && !seenBase.has(fn)) {
                    seenBase.add(fn);
                    photosList.push(pUrl);
                }
            }

            if (photosList.length > 0) {
                inmoData.photos = photosList.slice(0, 15).join(', ');
            } else {
                const ogImg = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
                if (ogImg && ogImg[1]) inmoData.photos = ogImg[1];
            }

            // Infer CCAA
            const textToScan = (inmoData.title + ' ' + inmoData.zone + ' ' + inmoData.comments).toLowerCase();
            const CCAA_MAP = {
                'Andalucía': ['granada', 'sevilla', 'málaga', 'malaga', 'marbella', 'córdoba', 'cordoba', 'cádiz', 'cadiz', 'almería', 'almeria', 'jaén', 'jaen', 'huelva'],
                'Madrid': ['madrid', 'alcalá', 'getafe', 'leganés', 'móstoles'],
                'Cataluña': ['barcelona', 'girona', 'tarragona', 'lleida'],
                'Comunidad Valenciana': ['valencia', 'alicante', 'castellón'],
                'País Vasco': ['bilbao', 'san sebastián', 'vitoria'],
                'Baleares': ['mallorca', 'ibiza', 'menorca'],
                'Canarias': ['tenerife', 'las palmas', 'gran canaria']
            };
            for (const [region, kwList] of Object.entries(CCAA_MAP)) {
                if (kwList.some(k => textToScan.includes(k))) {
                    inmoData.ccaa = region;
                    break;
                }
            }

            if (inmoData.title || inmoData.price) {
                return {
                    success: true,
                    source: 'inmovilla',
                    data: inmoData
                };
            }
        } catch (inmoErr) {
            console.warn('Error parsing Inmovilla CMS data, falling back to generic parser', inmoErr);
        }
    }

    // 3. Generic OpenGraph + Regex fallback Parser
    const extractedData = {
        title: '',
        price: 0,
        m2: null,
        rooms: 0,
        baths: 0,
        estate_type: 'secondhand',
        garage: 'no',
        elevator: 'desconocido',
        zone: '',
        ccaa: 'Andalucía',
        photos: '',
        latitude: null,
        longitude: null,
        comments: '',
        url: urlStr
    };

    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/<meta\s+name=["']title["']\s+content=["']([^"']+)["']/i);
    if (titleMatch && titleMatch[1]) {
        extractedData.title = titleMatch[1];
    } else {
        const pageTitle = html.match(/<title>([^<]+)<\/title>/i);
        if (pageTitle && pageTitle[1]) extractedData.title = pageTitle[1].trim();
    }

    const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (imageMatch && imageMatch[1]) {
        extractedData.photos = imageMatch[1];
    }

    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (descMatch && descMatch[1]) {
        extractedData.comments = descMatch[1];
    }

    const priceMeta = html.match(/<meta\s+property=["']og:price:amount["']\s+content=["']([^"']+)["']/i) ||
                      html.match(/<meta\s+name=["']price["']\s+content=["']([^"']+)["']/i);
    if (priceMeta && priceMeta[1]) {
        extractedData.price = parseFloat(priceMeta[1].replace(/[^\d.]/g, '')) || 0;
    } else {
        const priceRegex = /(\d{1,3}(?:\.\d{3})+)\s*(?:€|euros)/i;
        const priceMatch = (extractedData.title + " " + extractedData.comments).match(priceRegex);
        if (priceMatch && priceMatch[1]) {
            extractedData.price = parseFloat(priceMatch[1].replace(/\./g, '')) || 0;
        }
    }

    const roomsRegex = /(\d+)\s*(?:hab|dormitorio|habitac)/i;
    const roomsMatch = (extractedData.title + " " + extractedData.comments).match(roomsRegex);
    if (roomsMatch && roomsMatch[1]) {
        extractedData.rooms = parseInt(roomsMatch[1], 10) || 0;
    }

    const bathsRegex = /(\d+)\s*(?:baño|aseo|wc)/i;
    const bathsMatch = (extractedData.title + " " + extractedData.comments).match(bathsRegex);
    if (bathsMatch && bathsMatch[1]) {
        extractedData.baths = parseInt(bathsMatch[1], 10) || 0;
    }

    const m2Regex = /(\d+)\s*(?:m²|m2|metros\s+cuadrados)/i;
    const m2Match = (extractedData.title + " " + extractedData.comments).match(m2Regex);
    if (m2Match && m2Match[1]) {
        extractedData.m2 = parseFloat(m2Match[1]) || null;
    }

    return {
        success: true,
        source: 'generic',
        data: extractedData
    };
}

module.exports = {
    scrapePropertyUrl
};
