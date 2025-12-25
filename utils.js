// ============================================================================
// UTILITIES
// ============================================================================

window.AppUtils = {
    debounce(fn, delay) {
        let timeoutId = null;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    formatCoords(lat, lng) {
        const latDirection = lat >= 0 ? '°N' : '°S';
        const lngDirection = lng >= 0 ? '°E' : '°W';
        return `${Math.abs(lat).toFixed(4)}${latDirection} ${Math.abs(lng).toFixed(4)}${lngDirection}`;
    },

    showToast(message, type = 'info') {
        const container = document.querySelector('.toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};
