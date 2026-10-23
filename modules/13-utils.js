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
