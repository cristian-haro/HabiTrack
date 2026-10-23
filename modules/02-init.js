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
            navigator.serviceWorker.register('/sw.js?v=44.0').catch(err => {
                console.debug('Service Worker no registrado:', err);
            });
        }
    }

    // Configurar manejadores de autenticación
    setupAuthHandlers();
    
    // Verificar sesión y cargar datos
    await checkSession();
});
