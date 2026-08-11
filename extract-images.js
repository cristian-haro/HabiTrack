const fs = require('fs');

async function extractImages() {
    const urlStr = process.argv[2];
    
    if (!urlStr) {
        console.log('\nUso: node extract-images.js <URL_DEL_ANUNCIO>');
        console.log('Ejemplo: node extract-images.js "https://www.fotocasa.es/es/comprar/..."\n');
        return;
    }

    console.log(`Analizando enlace: ${urlStr}...`);

    try {
        const url = new URL(urlStr);
        
        // 1. Si es Idealista, advertir sobre el bloqueo 403
        if (url.hostname.includes('idealista.com')) {
            console.log('\n⚠️  Idealista bloquea el acceso programático directo (CF 403).');
            console.log('Para Idealista, utiliza el Bookmarklet de 1-click en tu navegador (copia las fotos al instante).');
            console.log('Ver instrucciones en walkthrough.md o en el chat.\n');
            return;
        }

        // 2. Realizar petición al anuncio
        const response = await fetch(urlStr, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        if (!response.ok) {
            throw new Error(`El servidor respondió con código de estado: ${response.status}`);
        }

        const html = await response.text();
        const imageUrls = [];

        // 3. Extraer utilizando el JSON de estado "__initial_props__" de Fotocasa
        const match = html.match(/<script type="application\/json" id="__initial_props__">([\s\S]*?)<\/script>/i);
        
        if (match && match[1]) {
            try {
                const data = JSON.parse(match[1]);
                const entity = data.realEstateAdDetailEntityV2 || data.realEstate || {};
                
                if (entity.multimedias && Array.isArray(entity.multimedias)) {
                    // Extraer solo los elementos multimedia que sean imágenes
                    entity.multimedias.forEach(item => {
                        // Comprobar si tiene URL y filtrar si es tipo imagen (o similar)
                        if (item.url && (item.type === 'image' || !item.type)) {
                            // Por defecto vienen con ?rule=original, lo cual es excelente
                            imageUrls.push(item.url);
                        }
                    });
                }
            } catch (jsonErr) {
                console.log('Advertencia: No se pudo parsear el JSON "__initial_props__", usando método fallback de expresiones regulares.');
            }
        }

        // 4. Fallback de Expresiones Regulares si no se encontraron imágenes en el JSON
        if (imageUrls.length === 0) {
            // Regex para buscar el patrón del nuevo CDN de Fotocasa static.fotocasa.es
            const rawUrls = html.match(/https:\/\/static\.fotocasa\.es\/images\/ads\/[a-zA-Z0-9-]+/gi) || [];
            rawUrls.forEach(imgUrl => {
                const cleanUrl = imgUrl + '?rule=original';
                if (!imageUrls.includes(cleanUrl)) {
                    imageUrls.push(cleanUrl);
                }
            });
        }

        if (imageUrls.length > 0) {
            console.log(`\n✅ ¡Éxito! Se han encontrado ${imageUrls.length} imágenes del anuncio:`);
            console.log('----------------------------------------------------');
            console.log(imageUrls.join(', '));
            console.log('----------------------------------------------------');
            console.log('\nPuedes copiar y pegar esta cadena de URLs directamente en el campo de "Fotos" al añadir tu piso en HabiTrack.\n');
        } else {
            console.log('\n❌ No se pudieron extraer URLs de imágenes de este anuncio. Intenta usar el Bookmarklet.\n');
        }

    } catch (err) {
        console.error('\n❌ Error al ejecutar la extracción:', err.message, '\n');
    }
}

extractImages();
