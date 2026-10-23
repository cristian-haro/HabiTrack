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
            currentUserId = null;
            currentUserEmail = '';
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            showLoginScreen();
            return;
        }
        
        if (response.ok) {
            const data = await response.json();
            username = data.username || data.email;
            currentUserId = data.id || null;
            currentUserEmail = data.email || data.username || '';
            localStorage.setItem('username', username);
            
            const label = document.getElementById('username-label');
            if (label) label.textContent = username;
            
            hideLoginScreen();
            await loadAppData();
        } else {
            token = '';
            username = '';
            currentUserId = null;
            currentUserEmail = '';
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
        await fetchWorkspaces();
        await fetchProperties();
        
        populateCcaaDropdowns();

        if (!eventHandlersSetup) {
            setupEventHandlers();
            eventHandlersSetup = true;
        }

        renderDashboard();
        renderListings();
        renderSettingsForm();

        // Comprobar si hay un código de invitación en la URL (?invite=HABI-XXXXXX o ?join=HABI-XXXXXX)
        checkUrlInviteCode();
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

                if (codeInput) {
                    codeInput.value = '';
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
