// ==========================================================================
// CONFIGURACIÓN Y ESTADO DE LA APLICACIÓN
// ==========================================================================

let appSettings = {};
let properties = [];
let activeSection = 'dashboard-section';
let activeView = 'grid'; // 'grid' o 'table'
let token = localStorage.getItem('token') || '';
let username = localStorage.getItem('username') || '';
let eventHandlersSetup = false;
let mapInstance = null;
let mapMarkers = [];
let currentPage = 1;
const pageSize = 9;

// Comunidades Autónomas de España y sus CCAA ITP por defecto (Segunda Mano)
const CCAA_LIST = [
    'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 
    'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 
    'Comunidad Valenciana', 'Extremadura', 'Galicia', 'Madrid', 
    'Murcia', 'Navarra', 'País Vasco', 'La Rioja', 'Ceuta', 'Melilla'
];

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Manejo de Service Worker y purga de caché en desarrollo
    if ('serviceWorker' in navigator) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (const registration of registrations) {
                    registration.unregister();
                }
            });
            if ('caches' in window) {
                caches.keys().then(names => {
                    for (const name of names) caches.delete(name);
                });
            }
        } else if (window.location.protocol.startsWith('http')) {
            navigator.serviceWorker.register('/sw.js?v=23.0').catch(err => {
                console.debug('Service Worker no registrado:', err);
            });
        }
    }

    // Configurar manejadores de autenticación
    setupAuthHandlers();
    
    // Verificar sesión y cargar datos
    await checkSession();
});

// ==========================================================================
// CONTROL DE AUTENTICACIÓN Y SESIÓN
// ==========================================================================

async function checkSession() {
    if (!token) {
        showLoginScreen();
        return;
    }
    
    try {
        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401 || response.status === 403) {
            token = '';
            username = '';
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            showLoginScreen();
            return;
        }
        
        if (response.ok) {
            const data = await response.json();
            username = data.username;
            localStorage.setItem('username', username);
            
            const label = document.getElementById('username-label');
            if (label) label.textContent = username;
            
            hideLoginScreen();
            await loadAppData();
        } else {
            token = '';
            username = '';
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            showLoginScreen();
        }
    } catch (err) {
        console.error('Error verifying session:', err);
        hideLoginScreen();
        await loadAppData();
    }
}

async function loadAppData() {
    try {
        await fetchSettings();
        await fetchProperties();
        
        populateCcaaDropdowns();

        if (!eventHandlersSetup) {
            setupEventHandlers();
            eventHandlersSetup = true;
        }

        renderDashboard();
        renderListings();
        renderSettingsForm();
    } catch (err) {
        console.error('Error loading app data:', err);
    }
}

function showLoginScreen() {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    if (loginContainer) {
        loginContainer.style.setProperty('display', 'flex', 'important');
        loginContainer.classList.remove('hidden-app');
    }
    if (appContainer) {
        appContainer.style.setProperty('display', 'none', 'important');
        appContainer.classList.add('hidden-app');
    }
}

function hideLoginScreen() {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    if (loginContainer) {
        loginContainer.style.setProperty('display', 'none', 'important');
        loginContainer.classList.add('hidden-app');
    }
    if (appContainer) {
        appContainer.style.setProperty('display', 'flex', 'important');
        appContainer.classList.remove('hidden-app');
    }
}

function setupAuthHandlers() {
    const otpRequestForm = document.getElementById('otp-request-form');
    const otpVerifyForm = document.getElementById('otp-verify-form');
    const btnSendOtp = document.getElementById('btn-send-otp');
    const btnVerifyOtp = document.getElementById('btn-verify-otp');
    const btnChangeEmail = document.getElementById('btn-change-email');
    const emailInput = document.getElementById('otp-email');
    const codeInput = document.getElementById('otp-code');

    let currentPendingEmail = localStorage.getItem('pending_email') || '';

    // Función unificada para solicitar OTP
    const handleSendOtp = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const email = emailInput ? emailInput.value.trim() : '';
        if (!email || !email.includes('@')) {
            showToast('Introduce un correo electrónico válido.', 'error');
            return;
        }

        if (btnSendOtp) {
            btnSendOtp.disabled = true;
            btnSendOtp.innerHTML = 'Enviando código... <i class="fa-solid fa-spinner fa-spin"></i>';
        }

        try {
            const response = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            let data;
            try {
                const text = await response.text();
                data = JSON.parse(text);
            } catch (err) {
                data = { error: `Error del servidor (HTTP ${response.status})` };
            }

            if (response.ok) {
                currentPendingEmail = email;
                localStorage.setItem('pending_email', email);
                const emailDisplay = document.getElementById('sent-email-display');
                if (emailDisplay) emailDisplay.textContent = email;

                const loginTitle = document.getElementById('login-title');
                const loginSubtitle = document.getElementById('login-subtitle');
                if (loginTitle) loginTitle.textContent = 'Verificar Código';
                if (loginSubtitle) loginSubtitle.textContent = `Introduce el código de acceso enviado a tu correo.`;

                if (otpRequestForm) {
                    otpRequestForm.classList.remove('active-form');
                    otpRequestForm.classList.add('hidden');
                    otpRequestForm.style.display = 'none';
                }
                if (otpVerifyForm) {
                    otpVerifyForm.classList.remove('hidden');
                    otpVerifyForm.classList.add('active-form');
                    otpVerifyForm.style.display = 'block';
                }

                const devBanner = document.getElementById('otp-dev-banner');
                const devCodeEl = document.getElementById('otp-dev-code');

                if (data.devOtp) {
                    if (devCodeEl) devCodeEl.textContent = data.devOtp;
                    if (devBanner) devBanner.style.display = 'block';
                    if (codeInput) codeInput.value = data.devOtp;
                }

                if (codeInput) {
                    if (!data.devOtp) codeInput.value = '';
                    codeInput.focus();
                }

                showToast(data.message || `Código enviado a ${email}`, 'success');
            } else {
                showToast(data.error || 'Error al enviar código de acceso.', 'error');
            }
        } catch (err) {
            console.error('Error requesting OTP:', err);
            showToast('Error de conexión con el servidor.', 'error');
        } finally {
            if (btnSendOtp) {
                btnSendOtp.disabled = false;
                btnSendOtp.innerHTML = 'Enviar Código de Acceso <i class="fa-solid fa-paper-plane"></i>';
            }
        }
    };

    // Función unificada para verificar OTP
    const handleVerifyOtp = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const code = codeInput ? codeInput.value.trim() : '';
        const targetEmail = currentPendingEmail || 
                            (emailInput ? emailInput.value.trim() : '') || 
                            localStorage.getItem('pending_email') || '';

        if (!targetEmail) {
            showToast('Por favor, indica tu correo electrónico primero.', 'error');
            return;
        }

        if (!code || code.length < 6) {
            showToast('Introduce el código de 6 dígitos.', 'error');
            return;
        }

        if (btnVerifyOtp) {
            btnVerifyOtp.disabled = true;
            btnVerifyOtp.innerHTML = 'Verificando... <i class="fa-solid fa-spinner fa-spin"></i>';
        }

        try {
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail, code })
            });

            let data;
            try {
                const text = await response.text();
                data = JSON.parse(text);
            } catch (err) {
                data = { error: `Error del servidor (HTTP ${response.status})` };
            }

            if (response.ok) {
                token = data.token;
                username = data.email || data.username || targetEmail;
                localStorage.setItem('token', token);
                localStorage.setItem('username', username);

                const label = document.getElementById('username-label');
                if (label) label.textContent = username;

                showToast('Sesión iniciada correctamente.', 'success');
                hideLoginScreen();
                await loadAppData();
            } else {
                showToast(data.error || 'Código incorrecto o caducado.', 'error');
            }
        } catch (err) {
            console.error('Error verifying OTP:', err);
            showToast('Error de conexión con el servidor.', 'error');
        } finally {
            if (btnVerifyOtp) {
                btnVerifyOtp.disabled = false;
                btnVerifyOtp.innerHTML = 'Verificar e Entrar <i class="fa-solid fa-right-to-bracket"></i>';
            }
        }
    };

    if (btnSendOtp) btnSendOtp.addEventListener('click', handleSendOtp);
    if (otpRequestForm) otpRequestForm.addEventListener('submit', handleSendOtp);
    if (emailInput) {
        emailInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSendOtp(e);
            }
        });
    }

    if (btnVerifyOtp) btnVerifyOtp.addEventListener('click', handleVerifyOtp);
    if (otpVerifyForm) otpVerifyForm.addEventListener('submit', handleVerifyOtp);
    if (codeInput) {
        codeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleVerifyOtp(e);
            }
        });
    }

    if (btnChangeEmail) {
        btnChangeEmail.addEventListener('click', () => {
            const loginTitle = document.getElementById('login-title');
            const loginSubtitle = document.getElementById('login-subtitle');
            if (loginTitle) loginTitle.textContent = 'Bienvenido';
            if (loginSubtitle) loginSubtitle.textContent = 'Introduce tu correo para recibir un código de acceso instantáneo.';

            if (otpVerifyForm) {
                otpVerifyForm.classList.remove('active-form');
                otpVerifyForm.classList.add('hidden');
                otpVerifyForm.style.display = 'none';
            }
            if (otpRequestForm) {
                otpRequestForm.classList.remove('hidden');
                otpRequestForm.classList.add('active-form');
                otpRequestForm.style.display = 'block';
            }
            if (emailInput) emailInput.focus();
        });
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

function logout() {
    token = '';
    username = '';
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    showToast('Sesión cerrada.', 'success');
    showLoginScreen();
}

// ==========================================================================
// SERVICIOS API (CONEXIÓN BACKEND EXPRESS + SQLITE)
// ==========================================================================

async function fetchSettings() {
    try {
        const response = await fetch('/api/ajustes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }
        if (response.ok) {
            appSettings = await response.json();
        } else {
            showToast('Error al cargar configuración. Usando valores locales.', 'error');
        }
    } catch (err) {
        console.error('Error fetching settings:', err);
        showToast('Error de conexión con el servidor backend.', 'error');
    }
}

async function saveSettings(newSettings) {
    try {
        const response = await fetch('/api/ajustes', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newSettings)
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return false;
        }
        if (response.ok) {
            const data = await response.json();
            appSettings = data.config;
            showToast('Configuración guardada en base de datos.', 'success');
            return true;
        } else {
            showToast('No se pudo guardar la configuración.', 'error');
            return false;
        }
    } catch (err) {
        console.error('Error saving settings:', err);
        showToast('Error al conectar con el servidor para guardar.', 'error');
        return false;
    }
}

async function fetchProperties() {
    try {
        const response = await fetch('/api/propiedades', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }
        if (response.ok) {
            properties = await response.json();
        } else {
            showToast('Error al cargar propiedades.', 'error');
        }
    } catch (err) {
        console.error('Error fetching properties:', err);
        showToast('Error de conexión al cargar propiedades.', 'error');
    }
}

async function addProperty(propertyData) {
    try {
        const response = await fetch('/api/propiedades', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(propertyData)
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return false;
        }
        if (response.ok) {
            const newProp = await response.json();
            const existingIndex = properties.findIndex(p => p.id === newProp.id);
            if (existingIndex !== -1) {
                properties[existingIndex] = newProp;
                showToast('Propiedad existente actualizada correctamente.', 'success');
            } else {
                properties.unshift(newProp); // Añadir al principio
                showToast('Propiedad guardada en base de datos.', 'success');
            }
            return true;
        } else {
            const err = await response.json();
            showToast(err.error || 'Error al guardar propiedad.', 'error');
            return false;
        }
    } catch (err) {
        console.error('Error adding property:', err);
        showToast('Error al conectar con el servidor.', 'error');
        return false;
    }
}

async function updateProperty(id, propertyData) {
    try {
        const response = await fetch(`/api/propiedades/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(propertyData)
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return false;
        }
        if (response.ok) {
            const updatedProp = await response.json();
            const index = properties.findIndex(p => p.id === parseInt(id));
            if (index !== -1) {
                properties[index] = updatedProp;
            }
            showToast('Propiedad actualizada correctamente.', 'success');
            return true;
        } else {
            const err = await response.json();
            showToast(err.error || 'Error al actualizar propiedad.', 'error');
            return false;
        }
    } catch (err) {
        console.error('Error updating property:', err);
        showToast('Error al conectar con el servidor.', 'error');
        return false;
    }
}

async function deleteProperty(id) {
    try {
        const response = await fetch(`/api/propiedades/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return false;
        }
        if (response.ok) {
            properties = properties.filter(p => p.id !== parseInt(id));
            showToast('Propiedad eliminada de la base de datos.', 'success');
            return true;
        } else {
            showToast('Error al eliminar la propiedad.', 'error');
            return false;
        }
    } catch (err) {
        console.error('Error deleting property:', err);
        showToast('Error de red al eliminar.', 'error');
        return false;
    }
}

// ==========================================================================
// CÁLCULOS DE COMPRAVENTA (ESPAÑA)
// ==========================================================================

function calculateExpenses(price, ccaa, estateType) {
    const p = parseFloat(price) || 0;
    
    // 1. Entrada (Ahorro inicial)
    const downpaymentRate = parseFloat(appSettings.downpaymentPct) || 20;
    const downpayment = p * (downpaymentRate / 100);
    
    // 2. Impuestos (Taxes)
    let taxes = 0;
    let taxDetail = "";
    
    if (estateType === 'new') {
        // Obra Nueva: 10% IVA + AJD
        const iva = p * 0.10;
        const ajdRate = parseFloat(appSettings.newBuildAjd) || 1.0;
        const ajd = p * (ajdRate / 100);
        taxes = iva + ajd;
        taxDetail = `IVA (10%): ${formatCurrency(iva)} + AJD (${ajdRate}%): ${formatCurrency(ajd)}`;
    } else {
        // Segunda Mano: ITP de la CCAA
        const itpRate = parseFloat(appSettings.ccaaRates[ccaa]) || 8.0;
        taxes = p * (itpRate / 100);
        taxDetail = `ITP (${itpRate}% de la CCAA)`;
    }

    // 3. Notaría, Registro y Gestoría (aproximación porcentual)
    const notaryRegistryPct = parseFloat(appSettings.notaryRegistryPct) || 1.5;
    const notaryRegistry = p * (notaryRegistryPct / 100);

    // 4. Tasación (Coste fijo)
    const appraisal = parseFloat(appSettings.appraisalCost) || 400;

    // Totales
    const totalExpenses = taxes + notaryRegistry + appraisal;
    const totalRequiredBudget = downpayment + totalExpenses;
    const mortgageAmount = p - downpayment;

    // 5. Hipoteca Mensual Estimada
    const mortgageInterestRate = parseFloat(appSettings.mortgageInterestRate) || 3.0;
    const mortgageDurationYears = parseInt(appSettings.mortgageDurationYears) || 30;
    
    let mortgageMonthlyPayment = 0;
    if (mortgageAmount > 0) {
        const r = mortgageInterestRate / 12 / 100;
        const n = mortgageDurationYears * 12;
        if (r > 0) {
            mortgageMonthlyPayment = mortgageAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        } else {
            mortgageMonthlyPayment = mortgageAmount / n;
        }
    }

    return {
        price: p,
        downpayment,
        downpaymentPct: downpaymentRate,
        taxes,
        taxDetail,
        notaryRegistry,
        notaryRegistryPct,
        appraisal,
        totalExpenses,
        totalRequiredBudget,
        mortgageAmount,
        mortgageMonthlyPayment,
        mortgageInterestRate,
        mortgageDurationYears
    };
}

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

// ==========================================================================
// RENDERIZADO DE INTERFAZ DE USUARIO (DOM)
// ==========================================================================

function populateCcaaDropdowns() {
    const dropdown = document.getElementById('prop-ccaa');
    if (!dropdown) return;
    
    dropdown.innerHTML = '';
    
    // Comunidad autónoma sugerida según ITP medio
    CCAA_LIST.forEach(ccaa => {
        const option = document.createElement('option');
        option.value = ccaa;
        option.textContent = ccaa;
        // Seleccionar Madrid/Cataluña por defecto como ejemplo común
        if (ccaa === 'Madrid') option.selected = true;
        dropdown.appendChild(option);
    });
}

function renderDashboard() {
    const totalKpi = document.getElementById('kpi-total-properties');
    const priceKpi = document.getElementById('kpi-avg-price');
    const budgetKpi = document.getElementById('kpi-avg-budget');
    const expensesKpi = document.getElementById('kpi-avg-expenses');

    if (!totalKpi) return;

    const total = properties.length;
    totalKpi.textContent = total;

    if (total === 0) {
        priceKpi.textContent = "0 €";
        budgetKpi.textContent = "0 €";
        expensesKpi.textContent = "0 €";
        updateDonutChart(0, 0, 0);
        renderRecentListings([]);
        return;
    }

    let sumPrice = 0;
    let sumBudget = 0;
    let sumExpenses = 0;

    properties.forEach(p => {
        const calc = calculateExpenses(p.price, p.ccaa, p.estate_type);
        sumPrice += calc.price;
        sumBudget += calc.totalRequiredBudget;
        sumExpenses += calc.totalExpenses;
    });

    const avgPrice = sumPrice / total;
    const avgBudget = sumBudget / total;
    const avgExpenses = sumExpenses / total;

    priceKpi.textContent = formatCurrency(avgPrice);
    budgetKpi.textContent = formatCurrency(avgBudget);
    expensesKpi.textContent = formatCurrency(avgExpenses);

    // Actualizar Donut con los valores medios
    const percentDownpayment = (avgPrice * (parseFloat(appSettings.downpaymentPct) || 20) / 100) / avgBudget * 100;
    const percentTaxes = (avgExpenses - (parseFloat(appSettings.appraisalCost) || 400) - (avgPrice * (parseFloat(appSettings.notaryRegistryPct) || 1.5) / 100)) / avgBudget * 100;
    const percentOther = 100 - percentDownpayment - percentTaxes;

    updateDonutChart(percentDownpayment, percentTaxes, percentOther, (avgBudget / avgPrice * 100).toFixed(0) + '%');

    // Cargar tarjetas recientes (máximo 3)
    renderRecentListings(properties.slice(0, 3));

    // Renderizar Mapa Leaflet
    renderMap();
}

function updateDonutChart(downpaymentPct, taxesPct, otherPct, centerText = '32%') {
    const sliceDown = document.getElementById('chart-slice-downpayment');
    const sliceTaxes = document.getElementById('chart-slice-taxes');
    const sliceExpenses = document.getElementById('chart-slice-expenses');
    const label = document.getElementById('chart-total-percent');

    if (!sliceDown) return;

    label.textContent = centerText;

    // Calcular dasharray del SVG donut
    // El perímetro del círculo con r=15.915 es 100 exactos (2 * PI * r)
    // El orden en dasharray es: [longitud_segmento, longitud_hueco]
    
    // Tramo 1: Entrada
    const d1 = downpaymentPct;
    sliceDown.setAttribute('stroke-dasharray', `${d1} ${100 - d1}`);
    sliceDown.setAttribute('stroke-dashoffset', '25'); // Empezar arriba (90 deg)

    // Tramo 2: Impuestos
    const d2 = taxesPct;
    const offset2 = 25 - d1;
    sliceTaxes.setAttribute('stroke-dasharray', `${d2} ${100 - d2}`);
    sliceTaxes.setAttribute('stroke-dashoffset', offset2.toString());

    // Tramo 3: Gastos
    const d3 = otherPct;
    const offset3 = offset2 - d2;
    sliceExpenses.setAttribute('stroke-dasharray', `${d3} ${100 - d3}`);
    sliceExpenses.setAttribute('stroke-dashoffset', offset3.toString());
}

function renderRecentListings(recentProps) {
    const container = document.getElementById('recent-listings-container');
    if (!container) return;

    if (recentProps.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-house-chimney-user"></i>
                <p>No tienes pisos guardados aún. Pega un enlace o introduce uno manualmente.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    recentProps.forEach(prop => {
        container.appendChild(createPropertyCardDOM(prop));
    });
}

function createPropertyCardDOM(prop) {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.dataset.id = prop.id;

    const calc = calculateExpenses(prop.price, prop.ccaa, prop.estate_type);
    
    // Obtener primera foto o placeholder
    let imageHTML = `
        <div class="no-img-placeholder">
            <i class="fa-solid fa-house-chimney"></i>
            <span>Sin fotos</span>
        </div>
    `;
    if (prop.photos) {
        const photoList = prop.photos.split(',').map(u => u.trim());
        if (photoList.length > 0 && photoList[0]) {
            imageHTML = `<img src="${photoList[0]}" class="property-img" alt="${prop.title}">`;
        }
    }

    const badgeTypeStr = prop.estate_type === 'new' ? 'Obra Nueva' : 'Segunda Mano';
    const garageStr = prop.garage === 'si' ? '<i class="fa-solid fa-square-check text-emerald"></i> Garaje' : 
                      prop.garage === 'opcional' ? '<i class="fa-solid fa-circle-info text-amber"></i> Garaje opc.' : 
                      '<i class="fa-solid fa-square-xmark text-rose"></i> Sin garaje';

    const mapButton = (prop.latitude && prop.longitude) ? 
        `<a href="https://www.google.com/maps/search/?api=1&query=${prop.latitude},${prop.longitude}" target="_blank" class="btn btn-secondary btn-sm btn-icon" title="Ver en Mapa"><i class="fa-solid fa-map-location-dot"></i></a>` : '';

    card.innerHTML = `
        <div class="card-img-container">
            ${imageHTML}
            <div class="card-badges">
                <span class="badge badge-price">${formatCurrency(prop.price)}</span>
                <span class="badge badge-type">${badgeTypeStr}</span>
            </div>
        </div>
        <div class="card-content">
            <div class="card-title-row">
                <div class="card-title-main">
                    <h4 title="${prop.title}">${prop.title}</h4>
                    ${prop.rating ? generateStarsHTML(prop.rating) : ''}
                </div>
                <span class="card-zone"><i class="fa-solid fa-location-dot"></i> ${prop.zone || 'Zona no especificada'}</span>
            </div>
            
            <div class="card-specs">
                <div class="spec-item">
                    <i class="fa-solid fa-bed"></i>
                    <span class="spec-val">${prop.rooms}</span>
                    <span>Habs.</span>
                </div>
                <div class="spec-item">
                    <i class="fa-solid fa-bath"></i>
                    <span class="spec-val">${prop.baths}</span>
                    <span>Baños</span>
                </div>
                <div class="spec-item">
                    <i class="fa-solid fa-ruler-combined"></i>
                    <span class="spec-val">${prop.m2 ? prop.m2 + ' m²' : '--'}</span>
                    <span>Superficie</span>
                </div>
            </div>

            <div class="spec-item" style="align-items: flex-start; flex-direction: row; gap: 0.5rem; font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                ${garageStr}
            </div>

            <div class="card-budget-box">
                <div class="budget-lbl">
                    <span>Ahorro para Firma (aprox)</span>
                    <small>Entrada (${calc.downpaymentPct}%) + Gastos CCAA</small>
                </div>
                <span class="budget-val">${formatCurrency(calc.totalRequiredBudget)}</span>
            </div>

            <div class="card-budget-box" style="margin-top: 0.5rem; background: rgba(99, 102, 241, 0.04); border-color: rgba(99, 102, 241, 0.15);">
                <div class="budget-lbl">
                    <span>Hipoteca Estimada</span>
                    <small>Cuota al ${calc.mortgageInterestRate}% a ${calc.mortgageDurationYears} años</small>
                </div>
                <span class="budget-val" style="color: var(--primary);">${formatCurrency(calc.mortgageMonthlyPayment)}/mes</span>
            </div>

            <div class="card-actions">
                <button class="btn btn-secondary btn-sm btn-view-expenses" data-id="${prop.id}">
                    <i class="fa-solid fa-calculator"></i> Ver Gastos
                </button>
                <button class="btn btn-primary btn-sm btn-edit-prop" data-id="${prop.id}" title="Editar">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-danger btn-sm btn-delete-prop btn-icon" data-id="${prop.id}" title="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                </button>
                ${mapButton}
                ${prop.url ? `<a href="${prop.url}" target="_blank" class="btn btn-secondary btn-sm btn-icon" title="Abrir Enlace"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
            </div>
        </div>
    `;

    return card;
}

function renderListings() {
    const gridViewContainer = document.getElementById('listings-grid-view');
    const tableBody = document.getElementById('comparison-table-body');

    if (!gridViewContainer || !tableBody) return;

    // Aplicar filtros
    const filteredProperties = applyFilters(properties);

    // Calcular páginas totales y reajustar currentPage si es necesario
    const totalPages = Math.ceil(filteredProperties.length / pageSize) || 1;
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }

    // Actualizar botones e indicador de página en el DOM
    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');
    const indicator = document.getElementById('page-indicator');

    if (prevBtn && nextBtn && indicator) {
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        indicator.innerHTML = `<span>Página <strong class="page-num">${currentPage}</strong> de <strong class="page-num">${totalPages}</strong></span>`;
    }

    if (filteredProperties.length === 0) {
        const emptyHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-filter-circle-xmark"></i>
                <p>Ninguna propiedad coincide con los filtros aplicados.</p>
            </div>
        `;
        gridViewContainer.innerHTML = emptyHTML;
        tableBody.innerHTML = `<tr><td colspan="13" class="text-center">No hay viviendas que cumplan con los filtros.</td></tr>`;
        return;
    }

    // Slicing para paginación
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const paginatedProperties = filteredProperties.slice(start, end);

    // Renderizar vista cuadrícula
    gridViewContainer.innerHTML = '';
    paginatedProperties.forEach(prop => {
        gridViewContainer.appendChild(createPropertyCardDOM(prop));
    });

    // Renderizar vista tabla
    tableBody.innerHTML = '';
    paginatedProperties.forEach(prop => {
        const tr = document.createElement('tr');
        const calc = calculateExpenses(prop.price, prop.ccaa, prop.estate_type);
        
        let photoHTML = `<div class="table-prop-img bg-indigo flex-center"><i class="fa-solid fa-house text-muted" style="font-size: 1.2rem;"></i></div>`;
        if (prop.photos) {
            const firstPhoto = prop.photos.split(',')[0].trim();
            if (firstPhoto) {
                photoHTML = `<img src="${firstPhoto}" class="table-prop-img" alt="${prop.title}">`;
            }
        }

        const garageIcon = prop.garage === 'si' ? '<i class="fa-solid fa-circle-check text-emerald" title="Sí"></i>' : 
                         prop.garage === 'opcional' ? '<i class="fa-solid fa-circle-question text-amber" title="Opcional"></i>' : 
                         '<i class="fa-solid fa-circle-xmark text-rose" title="No"></i>';
        const elevatorIcon = prop.elevator === 'si' ? '<i class="fa-solid fa-circle-check text-emerald" title="Sí"></i>' :
                           prop.elevator === 'no' ? '<i class="fa-solid fa-circle-xmark text-rose" title="No"></i>' : 
                           '<span class="text-muted">--</span>';

        const mapLink = (prop.latitude && prop.longitude) ? 
            `<a href="https://www.google.com/maps/search/?api=1&query=${prop.latitude},${prop.longitude}" target="_blank" class="btn-map" title="Ver en Google Maps"><i class="fa-solid fa-map-location-dot"></i> Mapa</a>` : 
            '<span class="text-muted">--</span>';

        tr.innerHTML = `
            <td>
                <div class="table-prop-cell">
                    ${photoHTML}
                    <div class="table-prop-info">
                        <span class="table-prop-name">${prop.title}</span>
                        ${prop.url ? `<a href="${prop.url}" target="_blank" class="table-prop-url">Ver anuncio <i class="fa-solid fa-external-link"></i></a>` : '<span class="table-prop-url">Sin enlace</span>'}
                    </div>
                </div>
            </td>
            <td>${prop.zone || 'Desconocida'}</td>
            <td class="text-right font-heading" style="font-weight: 600;">${formatCurrency(prop.price)}</td>
            <td class="text-center">${prop.rooms}</td>
            <td class="text-center">${prop.baths}</td>
            <td class="text-right">${prop.m2 ? prop.m2 + ' m²' : '--'}</td>
            <td class="text-center">${garageIcon}</td>
            <td class="text-center">${elevatorIcon}</td>
            <td class="text-center">${prop.rating ? generateStarsHTML(prop.rating) : '<span class="text-muted">--</span>'}</td>
            <td class="text-center">${mapLink}</td>
            <td class="text-right font-heading" style="color: var(--amber); font-weight: 700;">${formatCurrency(calc.totalRequiredBudget)}</td>
            <td class="text-right font-heading" style="color: var(--primary); font-weight: 700;">${formatCurrency(calc.mortgageMonthlyPayment)}/mes</td>
            <td>
                <div class="flex-center" style="gap: 0.5rem;">
                    <button class="btn btn-secondary btn-xs btn-view-expenses" data-id="${prop.id}"><i class="fa-solid fa-calculator"></i></button>
                    <button class="btn btn-primary btn-xs btn-edit-prop" data-id="${prop.id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger btn-xs btn-delete-prop" data-id="${prop.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Añadir manejadores a botones de eventos en cards y tabla dinámicos
    setupDynamicButtons();
}

function applyFilters(propsList) {
    const searchVal = document.getElementById('filter-search').value.toLowerCase();
    const priceMaxVal = parseFloat(document.getElementById('filter-price-max').value);
    const savingsMaxVal = parseFloat(document.getElementById('filter-savings-max').value);
    const roomsVal = document.getElementById('filter-rooms').value;
    const garageVal = document.getElementById('filter-garage').value;
    const sortBy = document.getElementById('sort-by').value;

    let result = [...propsList];

    // Búsqueda por texto (zona, título, comentarios)
    if (searchVal) {
        result = result.filter(p => 
            p.title.toLowerCase().includes(searchVal) || 
            (p.zone && p.zone.toLowerCase().includes(searchVal)) ||
            (p.comments && p.comments.toLowerCase().includes(searchVal))
        );
    }

    // Precio máximo
    if (!isNaN(priceMaxVal)) {
        result = result.filter(p => p.price <= priceMaxVal);
    }

    // Habitaciones
    if (roomsVal) {
        const roomsMin = parseInt(roomsVal);
        result = result.filter(p => p.rooms >= roomsMin);
    }

    // Garaje
    if (garageVal === 'si') {
        result = result.filter(p => p.garage === 'si');
    }

    // Ahorro máximo
    if (!isNaN(savingsMaxVal)) {
        result = result.filter(p => {
            const calc = calculateExpenses(p.price, p.ccaa, p.estate_type);
            return calc.totalRequiredBudget <= savingsMaxVal;
        });
    }

    // Ordenaciones
    result.sort((a, b) => {
        if (sortBy === 'date-desc') {
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        } else if (sortBy === 'price-asc') {
            return a.price - b.price;
        } else if (sortBy === 'price-desc') {
            return b.price - a.price;
        } else if (sortBy === 'budget-asc') {
            const budgetA = calculateExpenses(a.price, a.ccaa, a.estate_type).totalRequiredBudget;
            const budgetB = calculateExpenses(b.price, b.ccaa, b.estate_type).totalRequiredBudget;
            return budgetA - budgetB;
        } else if (sortBy === 'm2-desc') {
            return (b.m2 || 0) - (a.m2 || 0);
        } else if (sortBy === 'rating-desc') {
            return (b.rating || 0) - (a.rating || 0);
        }
        return 0;
    });

    return result;
}

function renderSettingsForm() {
    const downpaymentInput = document.getElementById('setting-downpayment');
    const notaryRegInput = document.getElementById('setting-notary-reg-pct');
    const appraisalInput = document.getElementById('setting-appraisal');
    const newBuildAjdInput = document.getElementById('setting-new-build-ajd');
    const mortgageRateInput = document.getElementById('setting-mortgage-rate');
    const mortgageDurationInput = document.getElementById('setting-mortgage-duration');
    const ccaaContainer = document.getElementById('ccaa-rates-container');

    if (!downpaymentInput || !ccaaContainer) return;

    downpaymentInput.value = appSettings.downpaymentPct;
    notaryRegInput.value = appSettings.notaryRegistryPct;
    appraisalInput.value = appSettings.appraisalCost;
    newBuildAjdInput.value = appSettings.newBuildAjd;
    if (mortgageRateInput) mortgageRateInput.value = appSettings.mortgageInterestRate || 3.0;
    if (mortgageDurationInput) mortgageDurationInput.value = appSettings.mortgageDurationYears || 30;

    // Crear entradas para ITP de cada CCAA
    ccaaContainer.innerHTML = '';
    CCAA_LIST.forEach(ccaa => {
        const rate = appSettings.ccaaRates[ccaa] || 8.0;
        
        const rateItem = document.createElement('div');
        rateItem.className = 'ccaa-rate-item';
        rateItem.innerHTML = `
            <label>${ccaa}</label>
            <div class="input-with-suffix" style="display:inline-flex; width: 85px;">
                <input type="number" step="0.1" min="0" max="20" class="ccaa-tax-rate" data-ccaa="${ccaa}" value="${rate}">
                <span style="right: 0.5rem; font-size: 0.75rem;">%</span>
            </div>
        `;
        ccaaContainer.appendChild(rateItem);
    });
}

// Mostrar desglose detallado de gastos en el modal
function showExpensesBreakdownModal(property) {
    const modal = document.getElementById('expenses-modal');
    const content = document.getElementById('expenses-modal-content');

    if (!modal || !content) return;

    const calc = calculateExpenses(property.price, property.ccaa, property.estate_type);
    
    // Porcentajes relativos para la barra apilada
    const downPct = (calc.downpayment / calc.totalRequiredBudget * 100).toFixed(1);
    const taxPct = (calc.taxes / calc.totalRequiredBudget * 100).toFixed(1);
    const otherPct = (100 - parseFloat(downPct) - parseFloat(taxPct)).toFixed(1);

    const isSecondHand = property.estate_type === 'secondhand';

    content.innerHTML = `
        <div class="expenses-summary">
            <h4>Total Ahorro Requerido (Firma)</h4>
            <div class="expenses-summary-value">${formatCurrency(calc.totalRequiredBudget)}</div>
            <p class="subtitle" style="margin-top: 0.25rem;">Para adquirir un inmueble de <strong>${formatCurrency(property.price)}</strong></p>
        </div>

        <div class="progress-stacked" title="Entrada: ${downPct}%, Impuestos: ${taxPct}%, Gastos: ${otherPct}%">
            <div class="progress-segment" style="width: ${downPct}%; background-color: var(--primary);" title="Entrada"></div>
            <div class="progress-segment" style="width: ${taxPct}%; background-color: var(--emerald);" title="Impuestos"></div>
            <div class="progress-segment" style="width: ${otherPct}%; background-color: var(--amber);" title="Otros gastos"></div>
        </div>

        <table class="expenses-details-table">
            <tbody>
                <tr>
                    <td><strong>Entrada (${calc.downpaymentPct}%)</strong><br><small>Aportación fondos propios</small></td>
                    <td class="val text-right" style="color: var(--text-main);">${formatCurrency(calc.downpayment)}</td>
                </tr>
                <tr>
                    <td><strong>Impuestos (${isSecondHand ? 'ITP' : 'IVA + AJD'})</strong><br><small>${calc.taxDetail}</small></td>
                    <td class="val text-right" style="color: var(--emerald);">${formatCurrency(calc.taxes)}</td>
                </tr>
                <tr>
                    <td><strong>Notaría, Registro y Gestoría</strong><br><small>Estimación global (${calc.notaryRegistryPct}%)</small></td>
                    <td class="val text-right" style="color: var(--amber);">${formatCurrency(calc.notaryRegistry)}</td>
                </tr>
                <tr>
                    <td><strong>Tasación de la Vivienda</strong><br><small>Gastos de valoración requerida</small></td>
                    <td class="val text-right" style="color: var(--amber);">${formatCurrency(calc.appraisal)}</td>
                </tr>
                <tr style="border-top: 2px solid var(--border-color); font-weight: 800;">
                    <td>PRESUPUESTO PARA FIRMA</td>
                    <td class="val text-right" style="font-size: 1.1rem; color: var(--primary);">${formatCurrency(calc.totalRequiredBudget)}</td>
                </tr>
                <tr style="border-top: 1px dashed var(--border-color); color: var(--text-muted); font-size: 0.8rem;">
                    <td>Financiación Bancaria Proyectada (${100 - calc.downpaymentPct}%)</td>
                    <td class="val text-right">${formatCurrency(calc.mortgageAmount)}</td>
                </tr>
                <tr style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">
                    <td>Cuota Hipoteca Mensual Est.<br><small>Al ${calc.mortgageInterestRate}% a ${calc.mortgageDurationYears} años</small></td>
                    <td class="val text-right" style="color: var(--primary);">${formatCurrency(calc.mortgageMonthlyPayment)}/mes</td>
                </tr>
            </tbody>
        </table>

        <div class="advice-card">
            <i class="fa-solid fa-circle-info"></i>
            <div>
                <strong>Consejo Habitacional:</strong> Para este piso de ${formatCurrency(property.price)} en la comunidad de ${property.ccaa}, debes tener disponibles unos <strong>${formatCurrency(calc.totalRequiredBudget)}</strong> líquidos en cuenta bancaria. Los impuestos y gastos administrativos son aproximadamente el <strong>${(calc.totalExpenses / calc.price * 100).toFixed(1)}%</strong> sobre el precio de compra.
            </div>
        </div>
    `;

    modal.classList.add('active');
}

// ==========================================================================
// CONTROLADORES DE EVENTOS PRINCIPALES
// ==========================================================================

function setupEventHandlers() {
    // --- 1. NAVEGACIÓN ENTRE SECCIONES ---
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            if (!target) return;

            // Actualizar clase activa en menú
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Si el click fue en un enlace "ver todos", activar su equivalente en sidebar
            const sidebarItem = document.querySelector(`.sidebar .nav-item[data-target="${target}"]`);
            if (sidebarItem) {
                sidebarItem.classList.add('active');
            } else {
                item.classList.add('active');
            }

            // Cambiar sección visible
            const sections = document.querySelectorAll('.content-section');
            sections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            
            activeSection = target;

            // Ajustar el tamaño del mapa si volvemos al dashboard
            if (target === 'dashboard-section' && mapInstance) {
                setTimeout(() => {
                    mapInstance.invalidateSize();
                }, 100);
            }
        });
    });

    // --- 2. MODAL AÑADIR PROPIEDAD ---
    const btnAddProp = document.getElementById('btn-add-property');
    const propertyModal = document.getElementById('property-modal');
    const btnClosePropModal = document.getElementById('btn-close-property-modal');
    const btnCancelProp = document.getElementById('btn-cancel-property');
    const propertyForm = document.getElementById('property-form');

    if (btnAddProp) {
        btnAddProp.addEventListener('click', () => {
            // Resetear el formulario
            propertyForm.reset();
            document.getElementById('property-id').value = '';
            document.getElementById('modal-title').textContent = 'Añadir Nueva Propiedad';
            document.getElementById('modal-paste-area').value = '';
            document.getElementById('modal-url-input').value = '';
            
            // Mostrar tabs
            document.getElementById('extraction-tabs').style.display = 'flex';
            switchTab('manual-form-tab');

            // Abrir modal
            propertyModal.classList.add('active');
        });
    }

    const closeModal = () => {
        propertyModal.classList.remove('active');
    };

    if (btnClosePropModal) btnClosePropModal.addEventListener('click', closeModal);
    if (btnCancelProp) btnCancelProp.addEventListener('click', closeModal);
    
    // Cerrar modal al hacer click fuera del contenido
    window.addEventListener('click', (e) => {
        if (e.target === propertyModal) {
            closeModal();
        }
        const expModal = document.getElementById('expenses-modal');
        if (e.target === expModal) {
            expModal.classList.remove('active');
        }
    });

    if (propertyForm) {
        propertyForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('property-id').value;
            const propertyData = {
                title: document.getElementById('prop-title').value,
                price: parseFloat(document.getElementById('prop-price').value),
                m2: document.getElementById('prop-m2').value ? parseFloat(document.getElementById('prop-m2').value) : null,
                ccaa: document.getElementById('prop-ccaa').value,
                rooms: parseInt(document.getElementById('prop-rooms').value) || 0,
                baths: parseInt(document.getElementById('prop-baths').value) || 0,
                estate_type: document.getElementById('prop-estate-type').value,
                garage: document.getElementById('prop-garage').value,
                zone: document.getElementById('prop-zone').value,
                url: document.getElementById('prop-url').value,
                photos: document.getElementById('prop-photos').value,
                elevator: document.getElementById('prop-elevator').value,
                comments: document.getElementById('prop-comments').value,
                rating: parseInt(document.getElementById('prop-rating').value) || 0,
                latitude: document.getElementById('prop-latitude').value ? parseFloat(document.getElementById('prop-latitude').value) : null,
                longitude: document.getElementById('prop-longitude').value ? parseFloat(document.getElementById('prop-longitude').value) : null
            };

            let success = false;
            if (id) {
                // Modo Edición
                success = await updateProperty(id, propertyData);
            } else {
                // Modo Creación
                success = await addProperty(propertyData);
            }

            if (success) {
                closeModal();
                renderDashboard();
                renderListings();
            }
        });
    }

    // --- 3. MODALES DE PESTAÑAS (TABS) ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    // --- 4. EXTRACCIÓN/PARSING DENTRO DEL MODAL Y EN EL DASHBOARD ---
    const btnModalParse = document.getElementById('btn-modal-parse');
    const btnModalParseUrl = document.getElementById('btn-modal-parse-url');
    const modalUrlInput = document.getElementById('modal-url-input');
    const modalPasteArea = document.getElementById('modal-paste-area');
    
    if (btnModalParseUrl && modalUrlInput) {
        btnModalParseUrl.addEventListener('click', async () => {
            const urlInputVal = modalUrlInput.value.trim();
            const validUrl = getValidUrl(urlInputVal);
            if (!validUrl) {
                showToast('Por favor, introduce un enlace válido antes de analizar.', 'warning');
                return;
            }
            
            btnModalParseUrl.disabled = true;
            btnModalParseUrl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analizando...';
            
            try {
                const res = await fetch(`/api/analizar?url=${encodeURIComponent(validUrl)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logout();
                    return;
                }
                if (!res.ok) throw new Error(`El servidor respondió con código ${res.status}`);
                const result = await res.json();
                
                if (result.success === false) {
                    showToast(result.error || 'No se pudieron extraer los datos.', 'error');
                    if (result.source === 'idealista' || result.source === 'facebook' || result.source === 'fotocasa') {
                        switchTab('parser-tab');
                    }
                } else if (result.success) {
                    fillPropertyForm(result.data);
                    showToast('Datos y fotos extraídos del enlace correctamente.', 'success');
                    switchTab('manual-form-tab');
                    modalUrlInput.value = '';
                }
            } catch (err) {
                console.error(err);
                showToast('Error al conectar con el analizador de enlaces.', 'error');
            } finally {
                btnModalParseUrl.disabled = false;
                btnModalParseUrl.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Analizar Enlace';
            }
        });
    }

    if (btnModalParse) {
        btnModalParse.addEventListener('click', async () => {
            const text = modalPasteArea.value.trim();
            if (!text) {
                showToast('Por favor, pega algún texto antes de analizar.', 'warning');
                return;
            }

            // Redirect pure URLs to backend scraper
            const validUrl = getValidUrl(text);
            if (validUrl) {
                btnModalParse.disabled = true;
                btnModalParse.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analizando...';
                try {
                    const res = await fetch(`/api/analizar?url=${encodeURIComponent(validUrl)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.status === 401 || res.status === 403) {
                        logout();
                        return;
                    }
                    if (!res.ok) throw new Error(`El servidor respondió con código ${res.status}`);
                    const result = await res.json();
                    if (result.success === false) {
                        showToast(result.error || 'No se pudieron extraer los datos.', 'error');
                        if (result.source === 'idealista' || result.source === 'facebook' || result.source === 'fotocasa') {
                            switchTab('parser-tab');
                        }
                    } else if (result.success) {
                        fillPropertyForm(result.data);
                        showToast('Datos y fotos extraídos del enlace correctamente.', 'success');
                        switchTab('manual-form-tab');
                        modalPasteArea.value = '';
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Error al conectar con el analizador de enlaces.', 'error');
                } finally {
                    btnModalParse.disabled = false;
                    btnModalParse.innerHTML = '<i class="fa-solid fa-brain"></i> Extraer Datos del Texto';
                }
                return;
            }

            const data = parseListingText(text);
            if (data) {
                fillPropertyForm(data);
                showToast('Datos extraídos del texto pegado.', 'success');
                switchTab('manual-form-tab');
            } else {
                showToast('No se pudieron extraer datos consistentes.', 'warning');
            }
        });
    }

    const btnDashboardParse = document.getElementById('btn-parse-quick');
    const dashboardPasteArea = document.getElementById('quick-input');

    if (btnDashboardParse) {
        btnDashboardParse.addEventListener('click', async () => {
            const text = dashboardPasteArea.value.trim();
            if (!text) {
                showToast('Por favor, pega un enlace o texto antes de analizar.', 'warning');
                return;
            }

            const validUrl = getValidUrl(text);

            if (validUrl) {
                btnDashboardParse.disabled = true;
                btnDashboardParse.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                
                try {
                    const res = await fetch(`/api/analizar?url=${encodeURIComponent(validUrl)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.status === 401 || res.status === 403) {
                        logout();
                        return;
                    }
                    if (!res.ok) throw new Error(`Error en el servidor: ${res.status}`);
                    const result = await res.json();
                    
                    if (result.success === false) {
                        showToast(result.error || 'No se pudieron extraer los datos del enlace.', 'error');
                        
                        // Si es Idealista, Facebook o Fotocasa, abrimos el modal pre-rellenando la URL para el bookmarklet
                        if (result.source === 'idealista' || result.source === 'facebook' || result.source === 'fotocasa') {
                            propertyForm.reset();
                            document.getElementById('property-id').value = '';
                            document.getElementById('modal-title').textContent = 'Añadir Nueva Propiedad';
                            document.getElementById('modal-paste-area').value = '';
                            document.getElementById('modal-url-input').value = validUrl;
                            document.getElementById('prop-url').value = validUrl;
                            
                            document.getElementById('extraction-tabs').style.display = 'flex';
                            switchTab('parser-tab');
                            propertyModal.classList.add('active');
                        }
                    } else if (result.success) {
                        propertyForm.reset();
                        document.getElementById('property-id').value = '';
                        document.getElementById('modal-title').textContent = 'Guardar Propiedad Detectada';
                        document.getElementById('modal-paste-area').value = '';
                        document.getElementById('modal-url-input').value = '';
                        
                        document.getElementById('extraction-tabs').style.display = 'none';
                        switchTab('manual-form-tab');

                        fillPropertyForm(result.data);
                        propertyModal.classList.add('active');
                        
                        showToast('Piso extraído y analizado de forma inteligente.', 'success');
                        dashboardPasteArea.value = '';
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Error al conectar con el analizador de enlaces.', 'error');
                } finally {
                    btnDashboardParse.disabled = false;
                    btnDashboardParse.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i>';
                }
            } else {
                const data = parseListingText(text);
                if (data) {
                    propertyForm.reset();
                    document.getElementById('property-id').value = '';
                    document.getElementById('modal-title').textContent = 'Guardar Propiedad Detectada';
                    document.getElementById('modal-paste-area').value = '';
                    document.getElementById('modal-url-input').value = '';
                    
                    document.getElementById('extraction-tabs').style.display = 'none';
                    switchTab('manual-form-tab');

                    fillPropertyForm(data);
                    propertyModal.classList.add('active');
                    
                    dashboardPasteArea.value = '';
                } else {
                    showToast('No se detectaron campos válidos. Prueba a introducir los datos manualmente.', 'warning');
                }
            }
        });
    }

    // --- 5. FILTRADO Y BÚSQUEDA ---
    const filterSearch = document.getElementById('filter-search');
    const filterPriceMax = document.getElementById('filter-price-max');
    const filterSavingsMax = document.getElementById('filter-savings-max');
    const filterRooms = document.getElementById('filter-rooms');
    const filterGarage = document.getElementById('filter-garage');
    const sortBy = document.getElementById('sort-by');

    const filterTrigger = () => {
        currentPage = 1;
        renderListings();
    };

    if (filterSearch) filterSearch.addEventListener('input', filterTrigger);
    if (filterPriceMax) filterPriceMax.addEventListener('input', filterTrigger);
    if (filterSavingsMax) filterSavingsMax.addEventListener('input', filterTrigger);
    if (filterRooms) filterRooms.addEventListener('change', filterTrigger);
    const btnClearFilters = document.getElementById('btn-clear-filters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', () => {
            if (filterSearch) filterSearch.value = '';
            if (filterPriceMax) filterPriceMax.value = '';
            if (filterSavingsMax) filterSavingsMax.value = '';
            if (filterRooms) filterRooms.value = '';
            if (filterGarage) filterGarage.value = '';
            if (sortBy) sortBy.value = 'date-desc';
            filterTrigger();
            showToast('Filtros restablecidos.', 'success');
        });
    }

    // --- 6. CAMBIO DE VISTA (CUADRÍCULA / TABLA) ---
    const btnViewGrid = document.getElementById('btn-view-grid');
    const btnViewTable = document.getElementById('btn-view-table');
    const gridView = document.getElementById('listings-grid-view');
    const tableView = document.getElementById('listings-table-view');

    if (btnViewGrid && btnViewTable) {
        btnViewGrid.addEventListener('click', () => {
            btnViewGrid.classList.add('active');
            btnViewTable.classList.remove('active');
            gridView.classList.remove('hidden');
            tableView.classList.add('hidden');
            activeView = 'grid';
        });

        btnViewTable.addEventListener('click', () => {
            btnViewTable.classList.add('active');
            btnViewGrid.classList.remove('active');
            tableView.classList.remove('hidden');
            gridView.classList.add('hidden');
            activeView = 'table';
        });
    }

    // --- 6a. BOTONES DE PAGINACIÓN ---
    const btnPrevPage = document.getElementById('btn-prev-page');
    const btnNextPage = document.getElementById('btn-next-page');

    if (btnPrevPage && btnNextPage) {
        btnPrevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderListings();
                const toolbar = document.querySelector('.toolbar');
                if (toolbar) {
                    toolbar.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });

        btnNextPage.addEventListener('click', () => {
            currentPage++;
            renderListings();
            const toolbar = document.querySelector('.toolbar');
            if (toolbar) {
                toolbar.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // --- 7. CONFIGURACIÓN DE GASTOS ---
    const settingsForm = document.getElementById('settings-form');
    const btnResetSettings = document.getElementById('btn-reset-settings');

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const ccaaRates = {};
            const rateInputs = document.querySelectorAll('.ccaa-tax-rate');
            rateInputs.forEach(input => {
                const ccaaName = input.getAttribute('data-ccaa');
                ccaaRates[ccaaName] = parseFloat(input.value) || 0;
            });

            const newSettings = {
                downpaymentPct: parseFloat(document.getElementById('setting-downpayment').value),
                notaryRegistryPct: parseFloat(document.getElementById('setting-notary-reg-pct').value),
                appraisalCost: parseFloat(document.getElementById('setting-appraisal').value),
                newBuildAjd: parseFloat(document.getElementById('setting-new-build-ajd').value),
                mortgageInterestRate: parseFloat(document.getElementById('setting-mortgage-rate').value),
                mortgageDurationYears: parseInt(document.getElementById('setting-mortgage-duration').value),
                ccaaRates
            };

            const success = await saveSettings(newSettings);
            if (success) {
                renderDashboard();
                renderListings();
            }
        });
    }

    if (btnResetSettings) {
        btnResetSettings.addEventListener('click', async () => {
            if (confirm('¿Seguro que deseas restablecer los ajustes a los valores iniciales por defecto en España?')) {
                // Mandar ajustes por defecto definidos en el servidor (el endpoint POST los creará o podemos cargarlos)
                const DEFAULT_CCAA_ITP = {
                    'Andalucía': 7.0, 'Aragón': 8.0, 'Asturias': 8.0, 'Baleares': 8.0, 'Canarias': 6.5,
                    'Cantabria': 9.0, 'Castilla-La Mancha': 9.0, 'Castilla y León': 8.0, 'Cataluña': 10.0,
                    'Comunidad Valenciana': 10.0, 'Extremadura': 8.0, 'Galicia': 9.0, 'Madrid': 6.0,
                    'Murcia': 8.0, 'Navarra': 6.0, 'País Vasco': 4.0, 'La Rioja': 7.0, 'Ceuta': 6.0, 'Melilla': 6.0
                };
                const defaults = {
                    downpaymentPct: 20,
                    notaryRegistryPct: 1.5,
                    appraisalCost: 400,
                    newBuildAjd: 1.0,
                    mortgageInterestRate: 3.0,
                    mortgageDurationYears: 30,
                    ccaaRates: DEFAULT_CCAA_ITP
                };

                const success = await saveSettings(defaults);
                if (success) {
                    renderSettingsForm();
                    renderDashboard();
                    renderListings();
                }
            }
        });
    }

    // --- 8. EXPENSES BREAKDOWN MODAL CLOSE ---
    const btnCloseExpensesModal = document.getElementById('btn-close-expenses-modal');
    if (btnCloseExpensesModal) {
        btnCloseExpensesModal.addEventListener('click', () => {
            document.getElementById('expenses-modal').classList.remove('active');
        });
    }

    // --- 9. IMPORTACIÓN / EXPORTACIÓN JSON ---
    const btnExport = document.getElementById('btn-export');
    const btnImportTrigger = document.getElementById('btn-import-trigger');
    const importFileInput = document.getElementById('import-file');

    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const dataToExport = {
                properties,
                settings: appSettings,
                exportDate: new Date().toISOString()
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `HabiTrack_Backup_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showToast('JSON exportado correctamente.', 'success');
        });
    }

    if (btnImportTrigger && importFileInput) {
        btnImportTrigger.addEventListener('click', () => {
            importFileInput.click();
        });

        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const parsedData = JSON.parse(event.target.result);
                    
                    if (!parsedData.properties || !Array.isArray(parsedData.properties)) {
                        throw new Error('Formato JSON de propiedades inválido.');
                    }

                    if (confirm(`Se van a importar ${parsedData.properties.length} propiedades. Esto creará los registros en la base de datos SQLite. ¿Deseas continuar?`)) {
                        // Guardar configuración si existe en el JSON
                        if (parsedData.settings) {
                            await saveSettings(parsedData.settings);
                        }

                        // Subir cada propiedad al servidor
                        let successCount = 0;
                        for (const prop of parsedData.properties) {
                            // Limpiar ID anterior para insertar nuevo
                            const cleanProp = { ...prop };
                            delete cleanProp.id;
                            delete cleanProp.created_at;

                            const success = await addProperty(cleanProp);
                            if (success) successCount++;
                        }

                        showToast(`Importados ${successCount} de ${parsedData.properties.length} pisos.`, 'success');
                        
                        // Recargar todo
                        await fetchSettings();
                        await fetchProperties();
                        renderDashboard();
                        renderListings();
                        renderSettingsForm();
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Error al parsear el archivo JSON. Verifica que sea un backup de HabiTrack.', 'error');
                }
                importFileInput.value = ''; // Resetear file input
            };
            reader.readAsText(file);
        });
    }

    // --- 10. SETUP BOOKMARKLET AND COPIER ---
    const bookmarkletCode = "javascript:(function(){" +
    "const url=window.location.href;" +
    "const data={url:url,title:document.title.split(' | ')[0]||'',price:null,m2:null,rooms:0,baths:0,garage:'no',elevator:'desconocido',zone:'',comments:'',photos:'',latitude:null,longitude:null};" +
    "function cleanPrice(str){if(!str)return null;const cleaned=str.replace(/[^\\d]/g,'');return cleaned?parseInt(cleaned,10):null;}" +
    "function cleanNum(str){if(!str)return null;const match=str.match(/\\d+/);return match?parseInt(match[0],10):null;}" +
    "let jsonLdData=null;" +
    "try{" +
    "const scripts=document.querySelectorAll('script[type=\"application/ld+json\"]');" +
    "for(const script of scripts){" +
    "try{" +
    "const parsed=JSON.parse(script.innerText);" +
    "const items=Array.isArray(parsed)?parsed:[parsed];" +
    "for(const item of items){" +
    "if(item['@type']==='Product'||item['@type']==='RealEstateAgent'||item['@type']==='SingleFamilyResidence'||item['@type']==='Offer'||item.price){" +
    "jsonLdData=item;break;" +
    "}" +
    "}" +
    "if(jsonLdData)break;" +
    "}catch(e){}" +
    "}" +
    "}catch(e){}" +
    "if(jsonLdData){" +
    "if(jsonLdData.name)data.title=jsonLdData.name;" +
    "if(jsonLdData.description)data.comments=jsonLdData.description;" +
    "if(jsonLdData.image)data.photos=Array.isArray(jsonLdData.image)?jsonLdData.image.join(', '):jsonLdData.image;" +
    "if(jsonLdData.offers){" +
    "const offers=Array.isArray(jsonLdData.offers)?jsonLdData.offers[0]:jsonLdData.offers;" +
    "if(offers.price)data.price=cleanPrice(String(offers.price));" +
    "}" +
    "}" +
    "if(url.includes('facebook.com/marketplace')){" +
    "let titleClean=document.title;" +
    "titleClean=titleClean.replace(/\\s*[|–-]\\s*Facebook.*$/i,'');" +
    "titleClean=titleClean.replace(/\\s*[|–-]\\s*Marketplace.*$/i,'');" +
    "data.title=titleClean.trim()||'Anuncio en Facebook';" +
    "const priceRegexes=[/€\\s*(\\d{1,3}(?:[.,]\\d{3})+)/,/(\\d{1,3}(?:[.,]\\d{3})+)\\s*€/,/€\\s*(\\d+)/,/(\\d+)\\s*€/];" +
    "let foundPrice=null;" +
    "const spans=document.querySelectorAll('span, div');" +
    "for(const el of spans){" +
    "if(el.children.length===0&&el.innerText){" +
    "const text=el.innerText.trim();" +
    "if((text.startsWith('€')||text.endsWith('€')||text.includes('€'))&&text.length<20){" +
    "for(const regex of priceRegexes){" +
    "const m=text.match(regex);" +
    "if(m){foundPrice=cleanPrice(m[0]);break;}" +
    "}" +
    "}" +
    "if(foundPrice)break;" +
    "}" +
    "}" +
    "if(foundPrice)data.price=foundPrice;" +
    "const allSpans=Array.from(document.querySelectorAll('span'));" +
    "const descHeader=allSpans.find(s=>s.innerText&&(s.innerText.toLowerCase()==='descripción'||s.innerText.toLowerCase()==='description'));" +
    "if(descHeader){" +
    "let parent=descHeader.parentElement;" +
    "for(let i=0;i<4;i++){" +
    "if(parent){" +
    "const descEl=parent.querySelector('div:nth-child(2), span:nth-child(2)');" +
    "if(descEl&&descEl.innerText.length>20){data.comments=descEl.innerText;break;}" +
    "}" +
    "parent=parent?parent.parentElement:null;" +
    "}" +
    "}" +
    "const imgs=Array.from(document.querySelectorAll('img'));" +
    "const photoUrls=[];" +
    "imgs.forEach(img=>{" +
    "const src=img.src;" +
    "if(src&&(src.includes('fbcdn')||src.includes('scontent'))&&!src.includes('/theme/')&&!src.includes('/rsrc.php')){" +
    "const width=img.naturalWidth||img.width||0;" +
    "const height=img.naturalHeight||img.height||0;" +
    "if(width>200||height>200||src.includes('p200x200')||src.includes('p480x480')||src.includes('scontent')){" +
    "if(!photoUrls.includes(src))photoUrls.push(src);" +
    "}" +
    "}" +
    "});" +
    "if(photoUrls.length>0)data.photos=photoUrls.slice(0,10).join(', ');" +
    "const locHeader=allSpans.find(s=>s.innerText&&(s.innerText.toLowerCase().includes('ubicación')||s.innerText.toLowerCase()==='mapa'));" +
    "if(locHeader){" +
    "let parent=locHeader.parentElement;" +
    "for(let i=0;i<3;i++){" +
    "if(parent){" +
    "const lines=parent.innerText.split('\\n');" +
    "if(lines.length>1){data.zone=lines[1];break;}" +
    "}" +
    "parent=parent?parent.parentElement:null;" +
    "}" +
    "}" +
    "}else if(url.includes('idealista.com')){" +
    "const h1=document.querySelector('.main-info__title-main');" +
    "if(h1)data.title=h1.innerText.trim();" +
    "const priceEl=document.querySelector('.info-data-price');" +
    "if(priceEl)data.price=cleanPrice(priceEl.innerText);" +
    "const infoFeatures=document.querySelectorAll('.info-features span');" +
    "infoFeatures.forEach(el=>{" +
    "const text=el.innerText.toLowerCase();" +
    "if(text.includes('m²'))data.m2=cleanNum(text);" +
    "if(text.includes('hab'))data.rooms=cleanNum(text);" +
    "if(text.includes('baño')||text.includes('wc'))data.baths=cleanNum(text);" +
    "if(text.includes('garaje')||text.includes('parking'))data.garage='si';" +
    "if(text.includes('ascensor'))data.elevator=text.includes('con ascensor')?'si':'no';" +
    "});" +
    "const images=document.querySelectorAll('.gallery-image img, #main-multimedia img');" +
    "const photoUrls=[];" +
    "images.forEach(img=>{" +
    "let src=img.src||img.getAttribute('data-lazy')||img.getAttribute('data-src');" +
    "if(src&&src.startsWith('http')&&!src.includes('logo'))photoUrls.push(src);" +
    "});" +
    "data.photos=photoUrls.join(', ');" +
    "const commentsEl=document.querySelector('.comment');" +
    "if(commentsEl)data.comments=commentsEl.innerText.trim();" +
    "const zoneEl=document.querySelector('#headerMap .map-label');" +
    "if(zoneEl)data.zone=zoneEl.innerText.trim();" +
    "}else if(url.includes('fotocasa.es')){" +
    "const h1=document.querySelector('.re-DetailHeader-title');" +
    "if(h1)data.title=h1.innerText.trim();" +
    "const priceEl=document.querySelector('.re-DetailHeader-price');" +
    "if(priceEl)data.price=cleanPrice(priceEl.innerText);" +
    "const features=document.querySelectorAll('.re-DetailFeaturesList-feature');" +
    "features.forEach(feat=>{" +
    "const text=feat.innerText.toLowerCase();" +
    "if(text.includes('m²'))data.m2=cleanNum(text);" +
    "if(text.includes('hab'))data.rooms=cleanNum(text);" +
    "if(text.includes('bañ')||text.includes('aseo'))data.baths=cleanNum(text);" +
    "});" +
    "const commentsEl=document.querySelector('.re-DetailDescription-text');" +
    "if(commentsEl)data.comments=commentsEl.innerText.trim();" +
    "}" +
    "const textToScan=(data.title+' '+data.comments).toLowerCase();" +
    "if(!data.price){" +
    "const m=textToScan.match(/(\\d{1,3}(?:\\.\\d{3})+)\\s*(?:€|euros)/i);" +
    "if(m)data.price=parseFloat(m[1].replace(/\\./g,''));" +
    "}" +
    "if(!data.rooms){" +
    "const m=textToScan.match(/(\\d+)\\s*(?:hab|dormitorio|habitac)/i);" +
    "if(m)data.rooms=parseInt(m[1],10);" +
    "}" +
    "if(!data.baths){" +
    "const m=textToScan.match(/(\\d+)\\s*(?:baño|aseo|wc)/i);" +
    "if(m)data.baths=parseInt(m[1],10);" +
    "}" +
    "if(!data.m2){" +
    "const m=textToScan.match(/(\\d+)\\s*(?:m²|m2|metros\\s+cuadrados)/i);" +
    "if(m)data.m2=parseFloat(m[1]);" +
    "}" +
    "if(data.garage==='no'&&(textToScan.includes('garaje')||textToScan.includes('parking')||textToScan.includes('cochera')))data.garage='si';" +
    "if(data.elevator==='desconocido'){" +
    "if(textToScan.includes('con ascensor'))data.elevator='si';" +
    "else if(textToScan.includes('sin ascensor'))data.elevator='no';" +
    "}" +
    "const jsonStr=JSON.stringify(data,null,2);" +
    "const dummy=document.createElement('textarea');" +
    "document.body.appendChild(dummy);" +
    "dummy.value=jsonStr;" +
    "dummy.select();" +
    "let success=false;" +
    "try{success=document.execCommand('copy');}catch(err){}" +
    "document.body.removeChild(dummy);" +
    "if(success){" +
    "alert('¡Datos del piso copiados al portapapeles!\\n\\nVuelve a HabiTrack y pega (Ctrl+V) en el área de texto del Analizador Inteligente para autocompletar la propiedad.');" +
    "}else{" +
    "prompt('No se pudo copiar automáticamente. Copia este texto manualmente:',jsonStr);" +
    "}" +
    "})();";

    const bookmarkletBtn = document.getElementById('bookmarklet-btn');
    const btnCopyBookmarklet = document.getElementById('btn-copy-bookmarklet');
    const guideBookmarkletBtn = document.getElementById('guide-bookmarklet-btn');
    const btnGuideCopyBookmarklet = document.getElementById('btn-guide-copy-bookmarklet');
    const btnGuideViewCode = document.getElementById('btn-guide-view-code');
    const guideCodeBox = document.getElementById('guide-code-box');
    const guideCodeTextarea = document.getElementById('guide-code-textarea');
    
    if (bookmarkletBtn) bookmarkletBtn.href = bookmarkletCode;
    if (guideBookmarkletBtn) guideBookmarkletBtn.href = bookmarkletCode;
    if (guideCodeTextarea) guideCodeTextarea.value = bookmarkletCode;

    const copyHandler = () => {
        navigator.clipboard.writeText(bookmarkletCode).then(() => {
            showToast('Código Bookmarklet copiado al portapapeles con éxito.', 'success');
        }).catch(err => {
            console.error('Error al copiar:', err);
            showToast('No se pudo copiar el código automáticamente.', 'error');
        });
    };

    if (btnCopyBookmarklet) btnCopyBookmarklet.addEventListener('click', copyHandler);
    if (btnGuideCopyBookmarklet) btnGuideCopyBookmarklet.addEventListener('click', copyHandler);

    if (btnGuideViewCode && guideCodeBox) {
        btnGuideViewCode.addEventListener('click', () => {
            const isHidden = guideCodeBox.style.display === 'none';
            guideCodeBox.style.display = isHidden ? 'block' : 'none';
            btnGuideViewCode.innerHTML = isHidden ? 
                '<i class="fa-solid fa-code text-indigo"></i> Ocultar Código' : 
                '<i class="fa-solid fa-code text-secondary"></i> Ver Código Fuente';
        });
    }
}

// Configurar manejadores para botones generados dinámicamente en las tarjetas/filas
function setupDynamicButtons() {
    // Botones de Ver Gastos
    const btnExpenses = document.querySelectorAll('.btn-view-expenses');
    btnExpenses.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            const prop = properties.find(p => p.id === parseInt(id));
            if (prop) {
                showExpensesBreakdownModal(prop);
            }
        });
    });

    // Botones de Editar
    const btnEdit = document.querySelectorAll('.btn-edit-prop');
    btnEdit.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            const prop = properties.find(p => p.id === parseInt(id));
            if (prop) {
                openEditModal(prop);
            }
        });
    });

    // Botones de Eliminar
    const btnDelete = document.querySelectorAll('.btn-delete-prop');
    btnDelete.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = btn.getAttribute('data-id');
            const prop = properties.find(p => p.id === parseInt(id));
            if (prop) {
                if (confirm(`¿Estás seguro de que deseas eliminar la propiedad "${prop.title}"? Esta acción se guardará en SQLite.`)) {
                    const success = await deleteProperty(id);
                    if (success) {
                        renderDashboard();
                        renderListings();
                    }
                }
            }
        });
    });
}

// Configuración adicional para enlazar botones dinámicos en el dashboard
function setupRecentListingsButtons() {
    // Llamado desde renderRecentListings
    setupDynamicButtons();
}

// Helper para alternar entre pestañas en el modal de añadir
function switchTab(tabId) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId || btn.id === 'tab-parser-btn' && tabId === 'parser-tab') {
            btn.classList.add('active');
        } else if (btn.getAttribute('data-tab') === 'manual-form-tab' && tabId === 'manual-form-tab') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    tabContents.forEach(content => {
        if (content.id === tabId) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Llenar el formulario de propiedades con datos de extracción
function fillPropertyForm(data) {
    if (data.title) document.getElementById('prop-title').value = data.title;
    if (data.price) document.getElementById('prop-price').value = data.price;
    if (data.m2) document.getElementById('prop-m2').value = data.m2;
    if (data.rooms) document.getElementById('prop-rooms').value = data.rooms;
    if (data.baths) document.getElementById('prop-baths').value = data.baths;
    if (data.garage) document.getElementById('prop-garage').value = data.garage;
    if (data.elevator) document.getElementById('prop-elevator').value = data.elevator;
    if (data.estate_type) document.getElementById('prop-estate-type').value = data.estate_type;
    if (data.zone) document.getElementById('prop-zone').value = data.zone;
    if (data.url) document.getElementById('prop-url').value = data.url;
    if (data.comments) document.getElementById('prop-comments').value = data.comments;
    if (data.photos) document.getElementById('prop-photos').value = data.photos;
    if (data.ccaa) document.getElementById('prop-ccaa').value = data.ccaa;
    document.getElementById('prop-rating').value = data.rating || 0;
    document.getElementById('prop-latitude').value = data.latitude !== undefined && data.latitude !== null ? data.latitude : '';
    document.getElementById('prop-longitude').value = data.longitude !== undefined && data.longitude !== null ? data.longitude : '';
}

// Abrir modal en modo edición
function openEditModal(property) {
    const propertyModal = document.getElementById('property-modal');
    const propertyForm = document.getElementById('property-form');
    
    // Resetear form y rellenar con datos existentes
    propertyForm.reset();
    document.getElementById('property-id').value = property.id;
    document.getElementById('modal-title').textContent = 'Editar Propiedad';
    
    // Ocultar panel analizador inteligente en edición
    document.getElementById('extraction-tabs').style.display = 'none';
    switchTab('manual-form-tab');

    // Cargar campos
    document.getElementById('prop-title').value = property.title;
    document.getElementById('prop-price').value = property.price;
    document.getElementById('prop-m2').value = property.m2 || '';
    document.getElementById('prop-ccaa').value = property.ccaa;
    document.getElementById('prop-rooms').value = property.rooms;
    document.getElementById('prop-baths').value = property.baths;
    document.getElementById('prop-estate-type').value = property.estate_type;
    document.getElementById('prop-garage').value = property.garage;
    document.getElementById('prop-zone').value = property.zone || '';
    document.getElementById('prop-url').value = property.url || '';
    document.getElementById('prop-photos').value = property.photos || '';
    document.getElementById('prop-elevator').value = property.elevator;
    document.getElementById('prop-comments').value = property.comments || '';
    document.getElementById('prop-rating').value = property.rating || 0;
    document.getElementById('prop-latitude').value = property.latitude !== undefined && property.latitude !== null ? property.latitude : '';
    document.getElementById('prop-longitude').value = property.longitude !== undefined && property.longitude !== null ? property.longitude : '';

    propertyModal.classList.add('active');
}

function generateStarsHTML(rating) {
    const r = parseInt(rating) || 0;
    if (r <= 0) return '';
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= r) {
            stars += '<i class="fa-solid fa-star text-amber"></i>';
        } else {
            stars += '<i class="fa-regular fa-star text-muted-star"></i>';
        }
    }
    return `<div class="rating-badge" title="Valoración: ${r}/5"><span class="rating-stars">${stars}</span><span class="rating-score">${r}.0</span></div>`;
}

function getValidUrl(text) {
    const trimmed = text.trim();
    if (!trimmed) return null;
    
    // Check if it's already a full URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    
    // Check if it starts with www. or is a domain-like string for our target portals
    if (trimmed.startsWith('www.') || /^(idealista\.com|fotocasa\.es)/i.test(trimmed)) {
        return 'https://' + trimmed;
    }
    
    // Check if it looks like a URL without a protocol (e.g. domain.tld/path)
    if (/^[^\s]+\.[a-zA-Z]{2,}\b[^\s]*$/.test(trimmed)) {
        return 'https://' + trimmed;
    }
    
    return null;
}

// ==========================================================================
// UTILIDADES COMUNES
// ==========================================================================

function formatCurrency(value) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(value);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    // Colores según tipo
    let iconClass = 'fa-circle-check text-emerald';
    if (type === 'error') iconClass = 'fa-triangle-exclamation text-rose';
    if (type === 'warning') iconClass = 'fa-circle-info text-amber';

    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
    toast.className = 'toast show';
    
    // Ocultar a los 3.5 segundos
    setTimeout(() => {
        toast.className = 'toast hidden';
    }, 3500);
}

// ==========================================================================
// INTEGRACIÓN DE MAPA INTERACTIVO (LEAFLET)
// ==========================================================================

function renderMap() {
    const mapContainer = document.getElementById('interactive-map');
    if (!mapContainer) return;

    const propertiesWithCoords = properties.filter(p => p.latitude !== null && p.longitude !== null);
    
    // Actualizar contador en cabecera
    const counterEl = document.getElementById('map-counter');
    if (counterEl) {
        counterEl.textContent = `${propertiesWithCoords.length} ubicadas`;
    }

    const satelliteLayerUrl = 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    const satelliteOptions = {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: 20,
        attribution: '&copy; Google Maps Satélite'
    };

    if (propertiesWithCoords.length === 0) {
        if (!mapInstance) {
            mapInstance = L.map('interactive-map', { zoomControl: false }).setView([40.4167, -3.7037], 6);
            L.tileLayer(satelliteLayerUrl, satelliteOptions).addTo(mapInstance);
        }
        return;
    }

    if (!mapInstance) {
        mapInstance = L.map('interactive-map').setView([40.4167, -3.7037], 6);
        L.tileLayer(satelliteLayerUrl, satelliteOptions).addTo(mapInstance);
    }

    // Limpiar marcadores existentes
    mapMarkers.forEach(marker => mapInstance.removeLayer(marker));
    mapMarkers = [];

    // Añadir marcadores de pisos con pines satelitales estilizados
    propertiesWithCoords.forEach(p => {
        const calc = calculateExpenses(p.price, p.ccaa, p.estate_type);
        
        let photoHTML = '';
        if (p.photos) {
            const firstPhoto = p.photos.split(',')[0].trim();
            if (firstPhoto) {
                photoHTML = `<img src="${firstPhoto}" style="width: 100%; height: 85px; object-fit: cover; border-radius: 6px; margin-bottom: 0.45rem;">`;
            }
        }

        const popupContent = `
            <div class="map-popup-card">
                ${photoHTML}
                <div class="map-popup-title">${p.title}</div>
                <div class="map-popup-price">${formatCurrency(p.price)}</div>
                <div class="map-popup-detail"><i class="fa-solid fa-calculator text-indigo"></i> Hipoteca: <strong>${formatCurrency(calc.mortgageMonthlyPayment)}/mes</strong></div>
                <div class="map-popup-detail"><i class="fa-solid fa-wallet text-amber"></i> Ahorro Firma: <strong>${formatCurrency(calc.totalRequiredBudget)}</strong></div>
                <div class="map-popup-button" onclick="showExpensesModalFromMap(${p.id})"><i class="fa-solid fa-calculator"></i> Ver Desglose Completo</div>
            </div>
        `;

        const pinIcon = L.divIcon({
            className: 'custom-map-marker',
            html: `<div class="map-marker-pin"><i class="fa-solid fa-house"></i> <span>${formatCurrency(p.price)}</span></div>`,
            iconSize: [85, 30],
            iconAnchor: [42, 30],
            popupAnchor: [0, -32]
        });

        const marker = L.marker([p.latitude, p.longitude], { icon: pinIcon }).addTo(mapInstance);
        marker.bindPopup(popupContent);
        mapMarkers.push(marker);
    });

    // Auto-ajustar mapa para englobar todos los marcadores
    if (mapMarkers.length > 0) {
        const group = new L.featureGroup(mapMarkers);
        mapInstance.fitBounds(group.getBounds().pad(0.15));
    }
}

// Ventana global de desglose llamada desde popup del mapa
window.showExpensesModalFromMap = function(id) {
    const prop = properties.find(p => p.id === id);
    if (prop) {
        showExpensesBreakdownModal(prop);
    }
};

// --- DETECTOR GLOBAL DE PEGADO DE BOOKMARKLET (Ctrl+V / Cmd+V) ---
window.addEventListener('paste', (e) => {
    const activeElement = document.activeElement;
    // Si el usuario ya está escribiendo en el área de pegado manual, dejamos que actúe por defecto
    if (activeElement && activeElement.id === 'modal-paste-area') {
        return;
    }

    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    try {
        const cleanText = pastedText.trim();
        if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
            const parsed = JSON.parse(cleanText);
            if (parsed.url && (parsed.price !== undefined || parsed.m2 !== undefined)) {
                e.preventDefault();
                
                const data = parseListingText(cleanText);
                if (data) {
                    // Resetear y preparar modal
                    const propertyForm = document.getElementById('property-form');
                    const propertyModal = document.getElementById('property-modal');
                    if (propertyForm && propertyModal) {
                        propertyForm.reset();
                        document.getElementById('property-id').value = '';
                        document.getElementById('modal-title').textContent = 'Guardar Propiedad Detectada';
                        document.getElementById('modal-paste-area').value = '';
                        document.getElementById('modal-url-input').value = '';
                        
                        fillPropertyForm(data);
                        
                        // Ocultar pestañas de extracción e ir al formulario
                        document.getElementById('extraction-tabs').style.display = 'none';
                        switchTab('manual-form-tab');
                        
                        // Abrir modal
                        propertyModal.classList.add('active');
                        showToast('¡Datos del anuncio importados automáticamente!', 'success');
                    }
                }
            }
        }
    } catch (err) {
        // Ignorar errores de análisis y dejar comportamiento nativo para textos ordinarios
    }
});

// --- INTERACTIVIDAD DEL SELECTOR DE DISPOSITIVOS EN EL BOOKMARKLET ---
document.addEventListener('DOMContentLoaded', () => {
    const toggleDesktopBtn = document.getElementById('toggle-desktop');
    const toggleMobileBtn = document.getElementById('toggle-mobile');
    const desktopInstructions = document.getElementById('instructions-desktop');
    const mobileInstructions = document.getElementById('instructions-mobile');

    if (toggleDesktopBtn && toggleMobileBtn && desktopInstructions && mobileInstructions) {
        toggleDesktopBtn.addEventListener('click', () => {
            toggleDesktopBtn.style.background = 'var(--primary)';
            toggleDesktopBtn.style.color = '#fff';
            toggleMobileBtn.style.background = 'transparent';
            toggleMobileBtn.style.color = 'var(--text-muted)';
            desktopInstructions.style.display = 'block';
            mobileInstructions.style.display = 'none';
        });
        
        toggleMobileBtn.addEventListener('click', () => {
            toggleMobileBtn.style.background = 'var(--primary)';
            toggleMobileBtn.style.color = '#fff';
            toggleDesktopBtn.style.background = 'transparent';
            toggleDesktopBtn.style.color = 'var(--text-muted)';
            desktopInstructions.style.display = 'none';
            mobileInstructions.style.display = 'block';
        });
    }

    const guideToggleDesktopBtn = document.getElementById('guide-toggle-desktop');
    const guideToggleMobileBtn = document.getElementById('guide-toggle-mobile');
    const guideDesktopInstructions = document.getElementById('guide-instructions-desktop');
    const guideMobileInstructions = document.getElementById('guide-instructions-mobile');

    if (guideToggleDesktopBtn && guideToggleMobileBtn && guideDesktopInstructions && guideMobileInstructions) {
        guideToggleDesktopBtn.addEventListener('click', () => {
            guideToggleDesktopBtn.style.background = 'var(--primary)';
            guideToggleDesktopBtn.style.color = '#fff';
            guideToggleMobileBtn.style.background = 'transparent';
            guideToggleMobileBtn.style.color = 'var(--text-muted)';
            guideDesktopInstructions.style.display = 'block';
            guideMobileInstructions.style.display = 'none';
        });
        
        guideToggleMobileBtn.addEventListener('click', () => {
            guideToggleMobileBtn.style.background = 'var(--primary)';
            guideToggleMobileBtn.style.color = '#fff';
            guideToggleDesktopBtn.style.background = 'transparent';
            guideToggleDesktopBtn.style.color = 'var(--text-muted)';
            guideDesktopInstructions.style.display = 'none';
            guideMobileInstructions.style.display = 'block';
        });
    }
});
