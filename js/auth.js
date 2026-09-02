import { state } from './state.js';
import { apiRequest } from './api.js';
import { showToast } from './ui.js';

/**
 * Checks session validity with /api/auth/me
 */
export async function checkSession(onSuccess) {
    if (!state.token) {
        showLoginScreen();
        return;
    }

    const { ok, data } = await apiRequest('/api/auth/me');

    if (ok && data && data.username) {
        state.username = data.username;
        localStorage.setItem('username', state.username);

        const label = document.getElementById('username-label');
        if (label) label.textContent = state.username;

        hideLoginScreen();
        if (typeof onSuccess === 'function') await onSuccess();
    } else {
        logout();
    }
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    state.token = '';
    state.username = '';
    showLoginScreen();
    showToast('Sesión cerrada correctamente.', 'info');
}

export function showLoginScreen() {
    const login = document.getElementById('login-container');
    const app = document.getElementById('app-container');
    if (login) login.classList.remove('hidden-app');
    if (app) app.classList.add('hidden-app');
}

export function hideLoginScreen() {
    const login = document.getElementById('login-container');
    const app = document.getElementById('app-container');
    if (login) login.classList.add('hidden-app');
    if (app) app.classList.remove('hidden-app');
}

/**
 * Attaches OTP login event handlers
 */
export function setupAuthHandlers(onLoginSuccess) {
    const otpRequestForm = document.getElementById('otp-request-form');
    const otpVerifyForm = document.getElementById('otp-verify-form');
    const btnChangeEmail = document.getElementById('btn-change-email');

    let pendingEmail = '';

    if (otpRequestForm) {
        otpRequestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('otp-email');
            const email = emailInput ? emailInput.value.trim() : '';

            if (!email || !email.includes('@')) {
                showToast('Introduce un correo electrónico válido.', 'error');
                return;
            }

            const { ok, data } = await apiRequest('/api/auth/send-otp', {
                method: 'POST',
                body: JSON.stringify({ email })
            });

            if (ok) {
                pendingEmail = email;
                showToast(data.message || 'Código OTP enviado a tu correo.', 'success');

                const sentDisplay = document.getElementById('sent-email-display');
                if (sentDisplay) sentDisplay.textContent = email;

                const devBanner = document.getElementById('otp-dev-banner');
                const devCodeEl = document.getElementById('otp-dev-code');
                if (data.devOtp) {
                    if (devCodeEl) devCodeEl.textContent = data.devOtp;
                    if (devBanner) devBanner.style.display = 'block';
                }

                otpRequestForm.classList.add('hidden');
                otpRequestForm.style.display = 'none';

                otpVerifyForm.classList.remove('hidden');
                otpVerifyForm.style.display = 'block';

                const codeInput = document.getElementById('otp-code');
                if (codeInput) {
                    codeInput.value = data.devOtp || '';
                    codeInput.focus();
                }
            } else {
                showToast(data.error || 'Error al solicitar el código de acceso.', 'error');
            }
        });
    }

    if (otpVerifyForm) {
        otpVerifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codeInput = document.getElementById('otp-code');
            const code = codeInput ? codeInput.value.trim() : '';

            if (!code || code.length < 4) {
                showToast('Introduce el código de acceso recibido.', 'error');
                return;
            }

            const { ok, data } = await apiRequest('/api/auth/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ email: pendingEmail, code })
            });

            if (ok && data.token) {
                state.token = data.token;
                state.username = data.username || pendingEmail;
                localStorage.setItem('token', state.token);
                localStorage.setItem('username', state.username);

                const label = document.getElementById('username-label');
                if (label) label.textContent = state.username;

                showToast('¡Bienvenido a HabiTrack!', 'success');
                hideLoginScreen();

                if (typeof onLoginSuccess === 'function') await onLoginSuccess();
            } else {
                showToast(data.error || 'Código incorrecto o caducado.', 'error');
            }
        });
    }

    if (btnChangeEmail) {
        btnChangeEmail.addEventListener('click', () => {
            otpVerifyForm.classList.add('hidden');
            otpVerifyForm.style.display = 'none';
            otpRequestForm.classList.remove('hidden');
            otpRequestForm.style.display = 'block';
        });
    }

    // Logout trigger
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}
