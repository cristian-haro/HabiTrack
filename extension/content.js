// HabiTrack Chrome Extension - Content Script Scraper & Floating UI

(function() {
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
            title: (document.title || 'Inmueble Detectado').split(' | ')[0].split(' - ')[0].trim(),
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

        // -------------------------------------------------------------
        // 1. FOTOCASA (Extracción nativa vía __initial_props__ y DOM)
        // -------------------------------------------------------------
        if (url.includes('fotocasa.es')) {
            try {
                // Buscar script con los datos de Fotocasa por ID o por contenido
                const allScripts = Array.from(document.querySelectorAll('script'));
                const propsScript = allScripts.find(s => s.id === '__initial_props__' || (s.textContent && (s.textContent.includes('realEstateAdDetailEntityV2') || s.textContent.includes('propertyTitle'))));
                
                if (propsScript && propsScript.textContent) {
                    let props;
                    const txt = propsScript.textContent.trim();
                    if (txt.includes('JSON.parse(')) {
                        const m = txt.match(/JSON\.parse\('([\s\S]*?)'\)/);
                        if (m) props = JSON.parse(m[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\"));
                    } else {
                        props = JSON.parse(txt);
                    }

                    if (props) {
                        const entity = props.realEstateAdDetailEntityV2 || props.realEstate || {};

                        if (props.propertyTitle) data.title = props.propertyTitle;
                        if (entity.price && entity.price.amount) data.price = entity.price.amount;
                        if (entity.description) data.comments = entity.description;

                        if (entity.address) {
                            if (entity.address.autonomousCommunity) data.ccaa = entity.address.autonomousCommunity;
                            if (entity.address.neighborhood || entity.address.municipality) {
                                data.zone = [entity.address.neighborhood, entity.address.municipality].filter(Boolean).join(', ');
                            }
                            if (entity.address.coordinates) {
                                data.latitude = entity.address.coordinates.lat || null;
                                data.longitude = entity.address.coordinates.lng || null;
                            }
                        }

                        if (entity.extraFeatures && Array.isArray(entity.extraFeatures)) {
                            const extraStr = entity.extraFeatures.join(' ').toLowerCase();
                            if (extraStr.includes('ascensor')) data.elevator = 'si';
                            if (extraStr.includes('parking') || extraStr.includes('garaje')) data.garage = 'si';
                        }

                        if (entity.features && Array.isArray(entity.features)) {
                            entity.features.forEach(f => {
                                if (f.type === 'ELEVATOR' && f.value === 'YES') data.elevator = 'si';
                                if (f.type === 'PARKING' && f.value === 'YES') data.garage = 'si';
                            });
                        }

                        if (entity.multimedias && Array.isArray(entity.multimedias)) {
                            const fotoUrls = entity.multimedias
                                .filter(m => m.type === 'image' && m.url)
                                .map(m => m.url);
                            if (fotoUrls.length > 0) data.photos = fotoUrls.slice(0, 15).join(', ');
                        }
                    }
                }
            } catch (e) {
                console.warn('[HabiTrack Fotocasa Scraper]', e);
            }

            // Fallback de datos desde DOM de Fotocasa si hiciera falta
            if (!data.price) {
                const bodyText = document.body ? document.body.innerText || '' : '';
                const priceMatch = bodyText.match(/(\d{1,3}(?:\.\d{3})+|\d+)\s*€/);
                if (priceMatch) data.price = cleanPrice(priceMatch[1]);
            }

            const h1 = document.querySelector('h1');
            if (h1 && h1.innerText && (!data.title || data.title === 'Inmueble Detectado')) {
                data.title = h1.innerText.trim();
            }

            // Características desde DOM de Fotocasa
            const allText = (document.body ? document.body.innerText : '').toLowerCase();
            if (!data.m2) {
                const m2m = allText.match(/(\d+)\s*(?:m²|m2)/);
                if (m2m && parseInt(m2m[1], 10) > 10 && parseInt(m2m[1], 10) < 5000) data.m2 = parseInt(m2m[1], 10);
            }
            if (!data.rooms) {
                const habm = allText.match(/(\d+)\s*(?:hab|habitaciones|dormitorios)/);
                if (habm && parseInt(habm[1], 10) < 20) data.rooms = parseInt(habm[1], 10);
            }
            if (!data.baths) {
                const banom = allText.match(/(\d+)\s*(?:baño|baños|bñ)/);
                if (banom && parseInt(banom[1], 10) < 10) data.baths = parseInt(banom[1], 10);
            }

            if (!data.photos) {
                const ogImg = document.querySelector('meta[property="og:image"]');
                if (ogImg && ogImg.content) data.photos = ogImg.content;
            }
        }

        // -------------------------------------------------------------
        // 2. IDEALISTA (Extracción limpia y estricta desduplicación de fotos)
        // -------------------------------------------------------------
        else if (url.includes('idealista.com')) {
            const h1 = document.querySelector('.main-info__title-main, h1');
            if (h1 && h1.innerText) data.title = h1.innerText.trim();

            const priceEl = document.querySelector('.info-data-price, .price-features__current-price, .info-data-price .txt-bold');
            if (priceEl && priceEl.innerText) data.price = cleanPrice(priceEl.innerText);

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
            if (zoneEl && zoneEl.innerText) data.zone = zoneEl.innerText.replace('en venta en', '').replace('en', '').trim();

            const descEl = document.querySelector('.comment p, .comment .adCommentsLanguage');
            if (descEl && descEl.innerText) data.comments = descEl.innerText.trim();

            // Extracción de galería con desduplicación por base ID (sin extensión .jpg/.webp)
            const idealistaPhotos = [];
            const seenBaseIds = new Set();

            function addPhotoCandidate(rawUrl) {
                if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.startsWith('http')) return;
                if (rawUrl.includes('blank') || rawUrl.includes('static') || rawUrl.includes('logo') || rawUrl.includes('icon') || rawUrl.includes('map')) return;

                // Extraer el nombre de archivo y eliminar la extensión para obtener el ID único puro
                const filename = rawUrl.split('/').pop().split('?')[0].toLowerCase();
                const baseId = filename.replace(/\.(jpg|jpeg|webp|png|gif)$/i, '');
                
                if (!baseId || baseId.length < 3 || seenBaseIds.has(baseId)) return;

                seenBaseIds.add(baseId);
                // Normalizar al tamaño de alta resolución y extensión JPG
                const highRes = rawUrl
                    .replace(/\/blur\/[^\/]+\//, '/blur/WEB_DETAIL_TOP-L-L/')
                    .replace(/\.webp$/i, '.jpg');

                idealistaPhotos.push(highRes);
            }

            // 1. Meta og:image
            const ogImg = document.querySelector('meta[property="og:image"]');
            if (ogImg && ogImg.content) addPhotoCandidate(ogImg.content);

            // 2. Extraer de scripts internos (desescapando URLs JSON)
            try {
                const scripts = document.querySelectorAll('script');
                for (const s of scripts) {
                    const rawContent = s.textContent || '';
                    if (rawContent.includes('idealista.com') || rawContent.includes('fullScreenGalleryPhotos') || rawContent.includes('galleryPhotos') || rawContent.includes('ad_images')) {
                        const cleanTxt = rawContent.replace(/\\\//g, '/');
                        const matches = cleanTxt.match(/https?:\/\/[a-z0-9.]*idealista\.com\/[^\s"'<>\\]+/gi);
                        if (matches) {
                            matches.forEach(u => addPhotoCandidate(u));
                        }
                    }
                }
            } catch (e) {}

            // 3. Elementos multimedia en el DOM
            const imgEls = Array.from(document.querySelectorAll('#main-multimedia img, #main-multimedia source, .detail-image img, .detail-image source, picture img, picture source, [data-service="gallery"] img, ul.grid-images img, .slideshow img, .thumbnail-image img'));
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

                addPhotoCandidate(candidate);
            });

            if (idealistaPhotos.length > 0) {
                data.photos = idealistaPhotos.slice(0, 15).join(', ');
            }
        }

        // -------------------------------------------------------------
        // 3. HABITACLIA
        // -------------------------------------------------------------
        else if (url.includes('habitaclia.com')) {
            const titleEl = document.querySelector('h1.summary-title, h1');
            if (titleEl) data.title = titleEl.innerText.trim();

            const priceEl = document.querySelector('.price span, .summary-price, span[class*="price"]');
            if (priceEl) data.price = cleanPrice(priceEl.innerText);

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
            if (descEl) data.comments = descEl.innerText.trim();

            const ogImg = document.querySelector('meta[property="og:image"]');
            if (ogImg && ogImg.content) data.photos = ogImg.content;
        }

        // -------------------------------------------------------------
        // 4. SCHEMA.ORG JSON-LD FALLBACK GENÉRICO (Con desduplicación)
        // -------------------------------------------------------------
        if (!data.price || !data.photos) {
            try {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const script of scripts) {
                    try {
                        const text = script.textContent || '';
                        if (!text) continue;
                        const parsed = JSON.parse(text);
                        const items = Array.isArray(parsed) ? parsed : [parsed];
                        for (const item of items) {
                            if (item['@type'] === 'Product' || item['@type'] === 'RealEstateAgent' || item['@type'] === 'SingleFamilyResidence' || item['@type'] === 'Apartment' || item['@type'] === 'Offer' || item['@type'] === 'Place' || item.offers || item.price) {
                                if (item.name && (!data.title || data.title === 'Inmueble Detectado')) data.title = item.name;
                                if (item.description && !data.comments) data.comments = item.description;
                                if (item.image && !data.photos) {
                                    const rawImgs = Array.isArray(item.image) ? item.image : [item.image];
                                    const uniqueList = [];
                                    const seen = new Set();
                                    for (const imgUrl of rawImgs) {
                                        const fn = String(imgUrl).split('/').pop().split('?')[0].toLowerCase().replace(/\.(jpg|jpeg|webp|png|gif)$/i, '');
                                        if (!seen.has(fn)) {
                                            seen.add(fn);
                                            uniqueList.push(imgUrl);
                                        }
                                    }
                                    data.photos = uniqueList.join(', ');
                                }
                                if (item.offers && !data.price) {
                                    const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                                    if (offers.price) data.price = cleanPrice(String(offers.price));
                                } else if (item.price && !data.price) {
                                    data.price = cleanPrice(String(item.price));
                                }
                                if (item.geo && !data.latitude) {
                                    data.latitude = parseFloat(item.geo.latitude) || null;
                                    data.longitude = parseFloat(item.geo.longitude) || null;
                                }
                                break;
                            }
                        }
                    } catch (e) {}
                }
            } catch (e) {}
        }

        // -------------------------------------------------------------
        // 5. INFERIR CCAA DE LA ZONA / TÍTULO
        // -------------------------------------------------------------
        const textToAnalyze = (data.title + ' ' + data.zone + ' ' + data.comments).toLowerCase();
        const CCAA_KEYWORDS = {
            'Madrid': ['madrid', 'alcalá', 'mostoles', 'leganes', 'fuenlabrada', 'getafe', 'alcobendas', 'pozuelo', 'las rozas', 'carabanchel', 'comillas'],
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

    // Calcular cuota rápida orientativa
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
        const propertyData = scrapePropertyData();
        
        // Verificar si es un anuncio de inmueble válido
        const url = window.location.href;
        const isPropertyPage = propertyData.price || 
                               propertyData.photos ||
                               url.includes('/inmueble/') || 
                               url.includes('/vivienda/') ||
                               url.includes('/comprar/') ||
                               url.includes('/alquiler/') ||
                               url.match(/\/\d{6,12}/);

        if (!isPropertyPage) return;

        const monthlyEst = computeQuickMortgage(propertyData.price);

        let widget = document.getElementById('habitrack-floating-btn');
        if (!widget) {
            widget = document.createElement('div');
            widget.id = 'habitrack-floating-btn';
            widget.className = 'habitrack-floating-container';
            document.body.appendChild(widget);
        }

        widget.innerHTML = `
            <div class="habitrack-floating-pill" id="habitrack-trigger-save" title="Guardar piso en HabiTrack">
                <div class="habitrack-floating-logo">🏡</div>
                <div class="habitrack-floating-text">
                    <div class="habitrack-floating-title">Guardar en HabiTrack</div>
                    <div class="habitrack-floating-sub">${monthlyEst ? '~' + monthlyEst.toLocaleString('es-ES') + ' €/mes est.' : (propertyData.price ? propertyData.price.toLocaleString('es-ES') + ' €' : '1-Clic')}</div>
                </div>
            </div>
        `;

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
                console.log('[HabiTrack Extension] Guardando propiedad detectada:', freshData);

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
                                <div class="habitrack-floating-sub">${freshData.price ? freshData.price.toLocaleString('es-ES') + ' €' : 'Completado'}</div>
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

    // Ejecutar inyección periódica e instantánea
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(injectFloatingWidget, 300));
    } else {
        setTimeout(injectFloatingWidget, 300);
    }

    // Observador de cambios en SPA y navegación
    let lastUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            const existingBtn = document.getElementById('habitrack-floating-btn');
            if (existingBtn) existingBtn.remove();
            setTimeout(injectFloatingWidget, 400);
        } else {
            const isDetail = window.location.href.includes('/inmueble/') || 
                             window.location.href.includes('/vivienda/') || 
                             window.location.href.includes('/comprar/') ||
                             window.location.href.includes('/alquiler/') ||
                             window.location.href.match(/\/\d{6,12}/);
            if (isDetail && !document.getElementById('habitrack-floating-btn')) {
                injectFloatingWidget();
            }
        }
    }, 600);
})();
