// HabiTrack Chrome Extension - Content Script Scraper & Floating UI

(function() {
    // Evitar inyección múltiple
    if (window.__habitrack_injected__) return;
    window.__habitrack_injected__ = true;

    // Helper sanitizers
    function cleanPrice(str) {
        if (!str) return null;
        const cleaned = String(str).replace(/[^\d]/g, '');
        return cleaned ? parseInt(cleaned, 10) : null;
    }

    function cleanNum(str) {
        if (!str) return null;
        const match = String(str).match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
    }

    // Scrape data from active page
    function scrapePropertyData() {
        const url = window.location.href;
        const data = {
            url: url,
            title: document.title.split(' | ')[0].split(' - ')[0] || 'Inmueble Detectado',
            price: null,
            m2: null,
            rooms: 0,
            baths: 0,
            garage: 'no',
            elevator: 'desconocido',
            estate_type: 'secondhand',
            ccaa: 'España',
            zone: '',
            comments: '',
            photos: '',
            latitude: null,
            longitude: null
        };

        // 1. INTENTO VÍA JSON-LD (Schema.org)
        try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
                try {
                    const text = script.innerText || script.textContent || '';
                    if (!text) continue;
                    const parsed = JSON.parse(text);
                    const items = Array.isArray(parsed) ? parsed : [parsed];
                    for (const item of items) {
                        if (item['@type'] === 'Product' || item['@type'] === 'RealEstateAgent' || item['@type'] === 'SingleFamilyResidence' || item['@type'] === 'Apartment' || item['@type'] === 'Offer' || item['@type'] === 'Place' || item.offers || item.price) {
                            if (item.name) data.title = item.name;
                            if (item.description) data.comments = item.description;
                            if (item.image) {
                                data.photos = Array.isArray(item.image) ? item.image.join(', ') : item.image;
                            }
                            if (item.offers) {
                                const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                                if (offers.price) data.price = cleanPrice(String(offers.price));
                            } else if (item.price) {
                                data.price = cleanPrice(String(item.price));
                            }
                            if (item.geo) {
                                data.latitude = parseFloat(item.geo.latitude) || null;
                                data.longitude = parseFloat(item.geo.longitude) || null;
                            }
                            if (item.address && typeof item.address === 'object') {
                                if (item.address.addressLocality) data.zone = item.address.addressLocality;
                                if (item.address.addressRegion) data.ccaa = item.address.addressRegion;
                            }
                            break;
                        }
                    }
                } catch (e) {}
            }
        } catch (e) {}

        // 2. INTENTO VÍA NEXT.JS __NEXT_DATA__ (Fotocasa, Habitaclia, etc.)
        try {
            const nextDataEl = document.getElementById('__NEXT_DATA__');
            if (nextDataEl) {
                const nextJson = JSON.parse(nextDataEl.innerText || nextDataEl.textContent || '{}');
                const pageProps = nextJson.props && nextJson.props.pageProps;
                if (pageProps) {
                    // Fotocasa property structure
                    const propDetail = pageProps.property || pageProps.detail || (pageProps.initialState && pageProps.initialState.realEstate && pageProps.initialState.realEstate.detail);
                    if (propDetail) {
                        if (propDetail.heading || propDetail.title) data.title = propDetail.heading || propDetail.title;
                        if (propDetail.price && propDetail.price.amount) data.price = propDetail.price.amount;
                        else if (typeof propDetail.price === 'number') data.price = propDetail.price;
                        if (propDetail.surface || propDetail.m2) data.m2 = propDetail.surface || propDetail.m2;
                        if (propDetail.rooms) data.rooms = propDetail.rooms;
                        if (propDetail.bathrooms) data.baths = propDetail.bathrooms;
                        if (propDetail.description) data.comments = propDetail.description;
                        if (propDetail.location) {
                            if (propDetail.location.coordinates) {
                                data.latitude = propDetail.location.coordinates.latitude || null;
                                data.longitude = propDetail.location.coordinates.longitude || null;
                            }
                            if (propDetail.location.municipality) data.zone = propDetail.location.municipality;
                        }
                        if (propDetail.multimedia && Array.isArray(propDetail.multimedia)) {
                            const pUrls = propDetail.multimedia.map(m => m.src || m.url).filter(Boolean);
                            if (pUrls.length > 0) data.photos = pUrls.slice(0, 10).join(', ');
                        }
                    }
                }
            }
        } catch (e) {}

        // 3. INTENTO VÍA OPEN GRAPH META TAGS
        try {
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle && ogTitle.content && (!data.title || data.title === 'Inmueble Detectado')) {
                data.title = ogTitle.content.split(' | ')[0].split(' - ')[0];
            }

            const ogImage = document.querySelector('meta[property="og:image"]');
            if (ogImage && ogImage.content && !data.photos) {
                data.photos = ogImage.content;
            }

            const ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc && ogDesc.content && !data.comments) {
                data.comments = ogDesc.content;
            }

            const ogPrice = document.querySelector('meta[property="product:price:amount"], meta[property="og:price:amount"]');
            if (ogPrice && ogPrice.content && !data.price) {
                data.price = cleanPrice(ogPrice.content);
            }
        } catch (e) {}

        // 4. PARSERS ESPECÍFICOS POR PORTAL

        // --- IDEALISTA ---
        if (url.includes('idealista.com')) {
            const h1 = document.querySelector('.main-info__title-main');
            if (h1 && h1.innerText) data.title = h1.innerText.trim();

            const priceEl = document.querySelector('.info-data-price, .price-features__current-price, .info-data-price .txt-bold');
            if (priceEl && !data.price) data.price = cleanPrice(priceEl.innerText);

            const details = Array.from(document.querySelectorAll('.info-features span, .details-property-feature-one, .details-property_features li'));
            details.forEach(d => {
                const text = d.innerText.toLowerCase();
                if (text.includes('m²') && !data.m2) data.m2 = cleanNum(text);
                if ((text.includes('hab') || text.includes('dorm')) && !data.rooms) data.rooms = cleanNum(text);
                if (text.includes('baño') && !data.baths) data.baths = cleanNum(text);
                if (text.includes('garaje') || text.includes('parking')) data.garage = 'si';
                if (text.includes('con ascensor')) data.elevator = 'si';
                if (text.includes('sin ascensor')) data.elevator = 'no';
                if (text.includes('obra nueva') || text.includes('promoción')) data.estate_type = 'new';
            });

            const zoneEl = document.querySelector('.main-info__title-minor, #headerMap .map-header');
            if (zoneEl) data.zone = zoneEl.innerText.replace('en venta en', '').replace('en', '').trim();

            const descEl = document.querySelector('.comment p, .comment .adCommentsLanguage');
            if (descEl && !data.comments) data.comments = descEl.innerText.trim();

            // Extracción avanzada y desduplicación de fotos en alta resolución de Idealista
            const idealistaPhotos = [];
            const seenPhotoIds = new Set();

            function addIdealistaPhoto(rawUrl) {
                if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.startsWith('http')) return;
                if (rawUrl.includes('blank') || rawUrl.includes('static/common') || rawUrl.includes('logo') || rawUrl.includes('icon') || rawUrl.includes('map')) return;

                // Extraer el nombre de archivo / ID único de la foto (ej: 111111111.jpg)
                const filename = rawUrl.split('/').pop().split('?')[0].toLowerCase();
                if (!filename || seenPhotoIds.has(filename)) return;

                seenPhotoIds.add(filename);

                // Normalizar a la máxima resolución disponible
                let highRes = rawUrl.replace(/\/blur\/[^\/]+\//, '/blur/WEB_DETAIL_TOP-L-L/');
                idealistaPhotos.push(highRes);
            }

            // 1. Meta og:image (foto principal)
            const ogImg = document.querySelector('meta[property="og:image"]');
            if (ogImg && ogImg.content) {
                addIdealistaPhoto(ogImg.content);
            }

            // 2. Extraer TODA la galería completa desde los scripts internos de Idealista (fullScreenGalleryPhotos)
            try {
                const scripts = document.querySelectorAll('script');
                for (const s of scripts) {
                    const txt = s.innerText || s.textContent || '';
                    if (txt.includes('fullScreenGalleryPhotos') || txt.includes('galleryPhotos') || txt.includes('ad_images')) {
                        // Buscar todas las URLs de imágenes de Idealista en el script
                        const matches = txt.match(/https?:\/\/[a-z0-9.]*idealista\.com\/[^\s"'\\]+\.jpg/gi);
                        if (matches) {
                            matches.forEach(u => addIdealistaPhoto(u));
                        }
                    }
                }
            } catch (e) {}

            // 3. Elementos multimedia y de galería del DOM
            const imgEls = Array.from(document.querySelectorAll('#main-multimedia img, #main-multimedia source, .detail-image img, .detail-image source, .gallery-fallback img, picture img, picture source, [data-service="gallery"] img, [data-service="gallery"] source, ul.grid-images img, .slideshow img, .thumbnail-image img'));
            imgEls.forEach(el => {
                let candidate = el.getAttribute('data-ondemand-img') || 
                                el.getAttribute('data-src') || 
                                el.getAttribute('data-bg-src') ||
                                el.getAttribute('srcset') ||
                                el.getAttribute('src');

                if (!candidate) return;

                if (candidate.includes(',')) {
                    const parts = candidate.split(',');
                    const last = parts[parts.length - 1].trim();
                    candidate = last.split(' ')[0].trim();
                } else if (candidate.includes(' ')) {
                    candidate = candidate.split(' ')[0].trim();
                }

                addIdealistaPhoto(candidate);
            });

            if (idealistaPhotos.length > 0) {
                data.photos = idealistaPhotos.slice(0, 15).join(', ');
            }
        }

        // --- FOTOCASA ---
        else if (url.includes('fotocasa.es')) {
            const titleEl = document.querySelector('h1.re-DetailHeader-propertyTitle, h1.re-DetailHeader-title, h1[class*="DetailHeader"], h1[class*="title"], h1[class*="Title"], h1');
            if (titleEl && (!data.title || data.title === 'Inmueble Detectado')) {
                data.title = titleEl.innerText.trim();
            }

            const priceEl = document.querySelector('.re-DetailHeader-price, .re-DetailPrice, span[class*="DetailHeader-price"], span[class*="Price"], div[class*="Price"]');
            if (priceEl && !data.price) {
                data.price = cleanPrice(priceEl.innerText);
            }

            const features = Array.from(document.querySelectorAll('.re-DetailFeaturesList-feature, .re-DetailHeader-featuresItem, li[class*="Feature"], div[class*="Feature"], span[class*="Feature"], ul[class*="Features"] li'));
            features.forEach(f => {
                const text = f.innerText.toLowerCase();
                if ((text.includes('m²') || text.includes('m2')) && !data.m2) data.m2 = cleanNum(text);
                if ((text.includes('hab') || text.includes('dorm')) && !data.rooms) data.rooms = cleanNum(text);
                if (text.includes('baño') && !data.baths) data.baths = cleanNum(text);
                if (text.includes('garaje') || text.includes('parking')) data.garage = 'si';
                if (text.includes('ascensor')) data.elevator = 'si';
                if (text.includes('obra nueva')) data.estate_type = 'new';
            });

            const descEl = document.querySelector('.fc-DetailDescription, .re-DetailDescription, div[class*="Description"], p[class*="Description"]');
            if (descEl && !data.comments) data.comments = descEl.innerText.trim();

            const imgEls = document.querySelectorAll('.re-DetailMosaicPhoto img, .re-DetailGallery img, img.re-DetailMosaic-img, img[class*="Mosaic"], img[class*="Gallery"], picture img');
            const photosArr = [];
            imgEls.forEach(img => {
                const src = img.src || img.getAttribute('data-src');
                if (src && !src.includes('logo') && !src.includes('icon') && !photosArr.includes(src)) {
                    photosArr.push(src);
                }
            });
            if (photosArr.length > 0 && !data.photos) data.photos = photosArr.slice(0, 10).join(', ');
        }

        // --- HABITACLIA ---
        else if (url.includes('habitaclia.com')) {
            const titleEl = document.querySelector('h1.summary-title, h1[class*="title"], h1');
            if (titleEl && (!data.title || data.title === 'Inmueble Detectado')) data.title = titleEl.innerText.trim();

            const priceEl = document.querySelector('.price span, .summary-price, span[class*="price"]');
            if (priceEl && !data.price) data.price = cleanPrice(priceEl.innerText);

            const features = Array.from(document.querySelectorAll('.feature, .summary-features li, ul.features li, li[class*="feature"]'));
            features.forEach(f => {
                const text = f.innerText.toLowerCase();
                if ((text.includes('m2') || text.includes('m²')) && !data.m2) data.m2 = cleanNum(text);
                if (text.includes('hab') && !data.rooms) data.rooms = cleanNum(text);
                if (text.includes('baño') && !data.baths) data.baths = cleanNum(text);
                if (text.includes('garaje') || text.includes('parking')) data.garage = 'si';
                if (text.includes('ascensor')) data.elevator = 'si';
            });

            const descEl = document.querySelector('.description, #js-detail-description');
            if (descEl && !data.comments) data.comments = descEl.innerText.trim();
        }

        // 5. FALLBACK GENERAL DE PRECIO SI AÚN NO SE HA DETECTADO
        if (!data.price) {
            const priceCandidates = Array.from(document.querySelectorAll('span, div, p, strong, h2, h3'));
            for (const el of priceCandidates) {
                if (el.children.length === 0 && el.innerText && el.innerText.includes('€') && el.innerText.length < 25) {
                    const candidate = cleanPrice(el.innerText);
                    if (candidate && candidate >= 10000 && candidate <= 50000000) {
                        data.price = candidate;
                        break;
                    }
                }
            }
        }

        // 3. INFERIR CCAA DE LA ZONA / TÍTULO
        const textToAnalyze = (data.title + ' ' + data.zone + ' ' + data.comments).toLowerCase();
        const CCAA_KEYWORDS = {
            'Madrid': ['madrid', 'alcalá', 'mostoles', 'leganes', 'fuenlabrada', 'getafe', 'alcobendas', 'pozuelo', 'las rozas'],
            'Cataluña': ['barcelona', 'girona', 'gerona', 'lleida', 'lerida', 'tarragona', 'badalona', 'hospitalet', 'sabadell', 'terrassa'],
            'Andalucía': ['sevilla', 'málaga', 'malaga', 'marbella', 'granada', 'córdoba', 'cordoba', 'cádiz', 'cadiz', 'almería', 'almeria', 'huelva', 'jaén', 'jaen'],
            'Comunidad Valenciana': ['valencia', 'valència', 'alicante', 'alacant', 'castellón', 'castelló', 'elche', 'benidorm', 'torrevieja'],
            'País Vasco': ['bilbao', 'bilbo', 'san sebastián', 'donostia', 'vitoria', 'gasteiz', 'vizcaya', 'bizkaia', 'guipúzcoa', 'gipuzkoa', 'álava', 'araba'],
            'Baleares': ['mallorca', 'palma', 'ibiza', 'eivissa', 'menorca', 'formentera'],
            'Canarias': ['tenerife', 'gran canaria', 'las palmas', 'lanzarote', 'fuerteventura', 'la palma'],
            'Galicia': ['coruña', 'vigo', 'ourense', 'lugo', 'pontevedra', 'santiago'],
            'Castilla y León': ['valladolid', 'burgos', 'salamanca', 'león', 'leon', 'segovia', 'ávila', 'avila', 'zamora', 'palencia', 'soria'],
            'Castilla-La Mancha': ['toledo', 'albacete', 'ciudad real', 'guadalajara', 'cuenca'],
            'Aragón': ['zaragoza', 'huesca', 'teruel'],
            'Asturias': ['oviedo', 'gijón', 'gijon', 'aviles', 'avilés'],
            'Murcia': ['murcia', 'cartagena', 'lorca'],
            'Navarra': ['pamplona', 'iruña', 'tudela'],
            'Cantabria': ['santander', 'torrelavega'],
            'La Rioja': ['logroño', 'rioja']
        };

        for (const [ccaa, keywords] of Object.entries(CCAA_KEYWORDS)) {
            if (keywords.some(k => textToAnalyze.includes(k))) {
                data.ccaa = ccaa;
                break;
            }
        }

        return data;
    }

    // Calcular cuota rápida orientativa (20% entrada, 80% hipoteca al 3% a 30 años)
    function computeQuickMortgage(price) {
        if (!price || price <= 0) return null;
        const mortgageAmount = price * 0.8;
        const monthlyRate = 0.03 / 12;
        const numPayments = 30 * 12;
        const monthlyPayment = Math.round((mortgageAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) / (Math.pow(1 + monthlyRate, numPayments) - 1));
        return monthlyPayment;
    }

    // Inyectar widget flotante interactivo
    function injectFloatingWidget() {
        if (document.getElementById('habitrack-floating-btn')) return;

        const propertyData = scrapePropertyData();
        if (!propertyData.price) return; // No es una página de ficha de inmueble clara

        const monthlyEst = computeQuickMortgage(propertyData.price);

        const widget = document.createElement('div');
        widget.id = 'habitrack-floating-btn';
        widget.className = 'habitrack-floating-container';
        widget.innerHTML = `
            <div class="habitrack-floating-pill" id="habitrack-trigger-save" title="Guardar piso en HabiTrack">
                <div class="habitrack-floating-logo">🏡</div>
                <div class="habitrack-floating-text">
                    <div class="habitrack-floating-title">Guardar en HabiTrack</div>
                    <div class="habitrack-floating-sub">${monthlyEst ? '~' + monthlyEst.toLocaleString('es-ES') + ' €/mes est.' : '1-Clic'}</div>
                </div>
            </div>
        `;

        document.body.appendChild(widget);

        // Click event
        const trigger = document.getElementById('habitrack-trigger-save');
        if (trigger) {
            trigger.addEventListener('click', async () => {
                trigger.classList.add('habitrack-loading');
                trigger.innerHTML = `
                    <div class="habitrack-floating-logo">⏳</div>
                    <div class="habitrack-floating-text">
                        <div class="habitrack-floating-title">Guardando piso...</div>
                    </div>
                `;

                const freshData = scrapePropertyData();

                chrome.runtime.sendMessage({ action: 'SAVE_PROPERTY', propertyData: freshData }, (response) => {
                    trigger.classList.remove('habitrack-loading');

                    if (chrome.runtime.lastError) {
                        trigger.classList.add('habitrack-error');
                        trigger.innerHTML = `
                            <div class="habitrack-floating-logo">⚠️</div>
                            <div class="habitrack-floating-text">
                                <div class="habitrack-floating-title">Error de Extensión</div>
                                <div class="habitrack-floating-sub">Recarga la extensión</div>
                            </div>
                        `;
                        showFloatingToast('Error: ' + chrome.runtime.lastError.message, 'error');
                        return;
                    }

                    if (response && response.success) {
                        trigger.classList.add('habitrack-success');
                        trigger.innerHTML = `
                            <div class="habitrack-floating-logo">✅</div>
                            <div class="habitrack-floating-text">
                                <div class="habitrack-floating-title">¡Guardado en HabiTrack!</div>
                                <div class="habitrack-floating-sub">${freshData.price.toLocaleString('es-ES')} €</div>
                            </div>
                        `;
                        showFloatingToast(`🏡 Piso guardado en tu cartera de HabiTrack.`, 'success');
                    } else {
                        const errorMsg = response && response.error ? response.error : 'No se pudo conectar con HabiTrack.';
                        trigger.classList.add('habitrack-error');
                        trigger.innerHTML = `
                            <div class="habitrack-floating-logo">⚠️</div>
                            <div class="habitrack-floating-text">
                                <div class="habitrack-floating-title">Error al guardar</div>
                                <div class="habitrack-floating-sub">Comprueba el servidor</div>
                            </div>
                        `;
                        showFloatingToast(errorMsg, 'error');

                        setTimeout(() => {
                            trigger.classList.remove('habitrack-error');
                            trigger.innerHTML = `
                                <div class="habitrack-floating-logo">🏡</div>
                                <div class="habitrack-floating-text">
                                    <div class="habitrack-floating-title">Reintentar Guardar</div>
                                </div>
                            `;
                        }, 3500);
                    }
                });
            });
        }
    }

    function showFloatingToast(message, type = 'success') {
        const existing = document.getElementById('habitrack-toast-msg');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'habitrack-toast-msg';
        toast.className = `habitrack-toast habitrack-toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('habitrack-toast-show');
        }, 50);

        setTimeout(() => {
            toast.classList.remove('habitrack-toast-show');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // Responder a peticiones del Popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'GET_CURRENT_PROPERTY') {
            const data = scrapePropertyData();
            sendResponse({ success: true, data });
        }
    });

    // Inyectar con reintentos para soportar frameworks SPA (React/Next.js en Fotocasa)
    function attemptInject() {
        injectFloatingWidget();
        // Si no se pudo detectar el precio aún (por hidratación de React diferida), reintentar 2 veces
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            const btn = document.getElementById('habitrack-floating-btn');
            if (btn || attempts >= 4) {
                clearInterval(interval);
            } else {
                injectFloatingWidget();
            }
        }, 1200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attemptInject);
    } else {
        setTimeout(attemptInject, 500);
    }

    // Observador de cambios de URL (SPA / Next.js client-side navigation)
    let currentUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            const existingBtn = document.getElementById('habitrack-floating-btn');
            if (existingBtn) existingBtn.remove();
            setTimeout(attemptInject, 800);
        }
    }, 1000);
})();
