// ==========================================================================
// MOTOR DE EXTRACCIÓN Y PARSING (REGEX)
// ==========================================================================

function parseListingText(text) {
    if (!text) return null;
    
    // Check if the input is a JSON string (e.g. from our bookmarklet)
    try {
        const cleanText = text.trim();
        if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
            const parsed = JSON.parse(cleanText);
            if (parsed.title || parsed.price) {
                return {
                    title: parsed.title || '',
                    price: parsed.price || null,
                    m2: parsed.m2 || null,
                    rooms: parsed.rooms || 0,
                    baths: parsed.baths || 0,
                    garage: parsed.garage || 'no',
                    elevator: parsed.elevator || 'desconocido',
                    zone: parsed.zone || '',
                    url: parsed.url || '',
                    estate_type: parsed.estate_type || 'secondhand',
                    comments: parsed.comments || '',
                    photos: parsed.photos || '',
                    ccaa: parsed.ccaa || 'Andalucía',
                    rating: parsed.rating || 0,
                    latitude: parsed.latitude || null,
                    longitude: parsed.longitude || null
                };
            }
        }
    } catch (e) {
        // Fall back to standard regex parsing
    }

    let extracted = {
        title: "",
        price: null,
        m2: null,
        rooms: null,
        baths: null,
        garage: "no",
        elevator: "desconocido",
        zone: "",
        url: "",
        estate_type: "secondhand",
        comments: ""
    };

    // --- 1. DETECTAR PRECIO ---
    // Ejemplos: "350.000 €", "240.000€", "150000 euros", "340.000 €/mes" (evitar alquileres de idealista si es posible)
    const priceRegexes = [
        /(?:precio|valor|cuesta)?\s*([1-9]\d{1,2}(?:\.\d{3})+)\s*(?:€|euros)/i,
        /([1-9]\d{3,6})\s*(?:€|euros)/i
    ];
    for (const r of priceRegexes) {
        const match = text.match(r);
        if (match) {
            // Limpiar puntos y parsear
            const cleanPrice = parseInt(match[1].replace(/\./g, ''));
            // Descartar alquileres obvios si la cifra es muy baja (ej: < 3000)
            if (cleanPrice > 10000) {
                extracted.price = cleanPrice;
                break;
            }
        }
    }

    // --- 2. DETECTAR HABITACIONES ---
    // Ejemplos: "3 hab", "2 habitaciones", "4 dorms", "1 dormitorio"
    const roomRegex = /(\d+)\s*(?:hab|dorm|habitaci|dormitori|habs|dormis)/i;
    const roomMatch = text.match(roomRegex);
    if (roomMatch) {
        extracted.rooms = parseInt(roomMatch[1]);
    }

    // --- 3. DETECTAR BAÑOS ---
    // Ejemplos: "2 baños", "1 baño", "2 wc", "1 bany"
    const bathRegex = /(\d+)\s*(?:baño|baños|wc|aseo|aseos|bany|banys|baths|bathroom)/i;
    const bathMatch = text.match(bathRegex);
    if (bathMatch) {
        extracted.baths = parseInt(bathMatch[1]);
    }

    // --- 4. DETECTAR METROS CUADRADOS (m²) ---
    // Ejemplos: "85 m²", "90m2", "120 metros", "110 metros cuadrados"
    const m2Regex = /(\d+)\s*(?:m²|m2|metros|metros cuadrados|mts)/i;
    const m2Match = text.match(m2Regex);
    if (m2Match) {
        extracted.m2 = parseInt(m2Match[1]);
    }

    // --- 5. GARAJE ---
    const garageKeywords = /garaje|parking|aparcamiento|cochera|plaza de gar/i;
    if (garageKeywords.test(text)) {
        extracted.garage = "si";
    }

    // --- 6. ASCENSOR ---
    if (/sin ascensor/i.test(text)) {
        extracted.elevator = "no";
    } else if (/con ascensor|ascensor/i.test(text)) {
        extracted.elevator = "si";
    }

    // --- 7. DETECTAR SI ES OBRA NUEVA ---
    if (/obra nueva|promoción nueva|a estrenar/i.test(text)) {
        extracted.estate_type = "new";
    }

    // --- 8. DETECTAR ZONA / DIRECCIÓN ---
    // Intentar buscar líneas como "Piso en venta en Gràcia"
    const zoneRegexes = [
        /(?:piso|casa|atico|dúplex|vivienda)\s+en\s+(?:venta\s+en\s+)?([A-Za-zÀ-ÿ0-9\s,\-\(\)\.\/]{3,50})/i,
        /zona\s+([A-Za-zÀ-ÿ\s,\-\(\)]{3,30})/i
    ];
    for (const r of zoneRegexes) {
        const match = text.match(r);
        if (match && match[1]) {
            const possibleZone = match[1].trim();
            // Evitar emparejar palabras comunes de especificación
            if (!/segunda mano|buen estado|planta|calefaccion/i.test(possibleZone)) {
                extracted.zone = possibleZone;
                break;
            }
        }
    }

    // --- 9. EXTRAER URL SI SE HA PEGADO UN ENLACE ---
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/g);
    if (urlMatch) {
        extracted.url = urlMatch[0];
        // Intentar parsear información de la URL slug
        parseFromUrlSlug(extracted.url, extracted);
    }

    return extracted;
}

function parseFromUrlSlug(urlStr, extractedObj) {
    try {
        const url = new URL(urlStr);
        const slug = decodeURIComponent(url.pathname);
        
        // Ejemplo Idealista: https://www.idealista.com/inmueble/104928503/
        // O: https://www.idealista.com/inmueble/piso-en-barcelona-gracia-350000-euros/
        
        // Detectar portal
        if (url.hostname.includes('idealista')) {
            // Intentar buscar el ID en el slug
            const idMatch = slug.match(/\/inmueble\/(\d+)/);
            if (idMatch && !extractedObj.title) {
                extractedObj.title = `Idealista - Ref: ${idMatch[1]}`;
            }
        } else if (url.hostname.includes('fotocasa')) {
            if (!extractedObj.title) {
                extractedObj.title = "Piso en Fotocasa";
            }
        } else if (url.hostname.includes('facebook')) {
            if (!extractedObj.title) {
                extractedObj.title = "Anuncio en Facebook";
            }
        }

        // Si el slug tiene palabras descriptivas separadas por guiones
        const cleanSlug = slug.replace(/[_-]/g, ' ');
        
        // Si no detectamos precio pero viene en la URL
        if (!extractedObj.price) {
            const priceUrlMatch = cleanSlug.match(/(\d{3,6})\s*(?:euros|e)/i);
            if (priceUrlMatch) {
                extractedObj.price = parseInt(priceUrlMatch[1]);
            }
        }

        // Si no hay zona pero viene en la URL
        if (!extractedObj.zone) {
            const zoneKeywords = ['venta en', 'venta', 'alquiler en', 'en'];
            for (const key of zoneKeywords) {
                const zoneUrlMatch = cleanSlug.match(new RegExp(`${key}\\s+([a-zA-Z\\s]{3,20})`, 'i'));
                if (zoneUrlMatch && zoneUrlMatch[1]) {
                    extractedObj.zone = zoneUrlMatch[1].trim();
                    break;
                }
            }
        }
    } catch(e) {
        console.error("Error al parsear URL slug", e);
    }
}
