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
                    const parsed = JSON.parse(script.innerText);
                    const items = Array.isArray(parsed) ? parsed : [parsed];
                    for (const item of items) {
                        if (item['@type'] === 'Product' || item['@type'] === 'RealEstateAgent' || item['@type'] === 'SingleFamilyResidence' || item['@type'] === 'Apartment' || item['@type'] === 'Offer' || item.offers || item.price) {
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
                            break;
                        }
                    }
                } catch (e) {}
            }
        } catch (e) {}

        // 2. PARSERS ESPECÍFICOS POR PORTAL

        // --- IDEALISTA ---
        if (url.includes('idealista.com')) {
            const h1 = document.querySelector('.main-info__title-main');
            if (h1 && h1.innerText) data.title = h1.innerText.trim();

            const priceEl = document.querySelector('.info-data-price, .price-features__current-price, .info-data-price .txt-bold');
            if (priceEl) data.price = cleanPrice(priceEl.innerText);

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
            if (descEl) data.comments = descEl.innerText.trim();

            const imgEls = document.querySelectorAll('#main-multimedia img, .detail-image img, picture img');
            const photosArr = [];
            imgEls.forEach(img => {
                const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-ondemand-img');
                if (src && src.includes('idealista') && !src.includes('map') && !photosArr.includes(src)) {
                    photosArr.push(src);
                }
            });
            if (photosArr.length > 0) data.photos = photosArr.slice(0, 10).join(', ');
        }

        // --- FOTOCASA ---
        else if (url.includes('fotocasa.es')) {
            const titleEl = document.querySelector('h1.re-DetailHeader-propertyTitle, h1');
            if (titleEl) data.title = titleEl.innerText.trim();

            const priceEl = document.querySelector('.re-DetailHeader-price, .re-DetailPrice');
            if (priceEl) data.price = cleanPrice(priceEl.innerText);

            const features = Array.from(document.querySelectorAll('.re-DetailFeaturesList-feature, .re-DetailHeader-featuresItem'));
            features.forEach(f => {
                const text = f.innerText.toLowerCase();
                if (text.includes('m²') && !data.m2) data.m2 = cleanNum(text);
                if ((text.includes('hab') || text.includes('dorm')) && !data.rooms) data.rooms = cleanNum(text);
                if (text.includes('baño') && !data.baths) data.baths = cleanNum(text);
                if (text.includes('garaje') || text.includes('parking')) data.garage = 'si';
                if (text.includes('ascensor')) data.elevator = 'si';
                if (text.includes('obra nueva')) data.estate_type = 'new';
            });

            const descEl = document.querySelector('.fc-DetailDescription, .re-DetailDescription');
            if (descEl) data.comments = descEl.innerText.trim();

            const imgEls = document.querySelectorAll('.re-DetailMosaicPhoto img, .re-DetailGallery img, img.re-DetailMosaic-img');
            const photosArr = [];
            imgEls.forEach(img => {
                const src = img.src || img.getAttribute('data-src');
                if (src && !src.includes('logo') && !photosArr.includes(src)) {
                    photosArr.push(src);
                }
            });
            if (photosArr.length > 0) data.photos = photosArr.slice(0, 10).join(', ');
        }

        // --- HABITACLIA ---
        else if (url.includes('habitaclia.com')) {
            const titleEl = document.querySelector('h1.summary-title, h1');
            if (titleEl) data.title = titleEl.innerText.trim();

            const priceEl = document.querySelector('.price span, .summary-price');
            if (priceEl) data.price = cleanPrice(priceEl.innerText);

            const features = Array.from(document.querySelectorAll('.feature, .summary-features li, ul.features li'));
            features.forEach(f => {
                const text = f.innerText.toLowerCase();
                if (text.includes('m2') || text.includes('m²')) data.m2 = cleanNum(text);
                if (text.includes('hab')) data.rooms = cleanNum(text);
                if (text.includes('baño')) data.baths = cleanNum(text);
                if (text.includes('garaje') || text.includes('parking')) data.garage = 'si';
                if (text.includes('ascensor')) data.elevator = 'si';
            });

            const descEl = document.querySelector('.description, #js-detail-description');
            if (descEl) data.comments = descEl.innerText.trim();
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

    // Inyectar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectFloatingWidget);
    } else {
        setTimeout(injectFloatingWidget, 1000);
    }
})();
