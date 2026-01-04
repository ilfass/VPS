// Lógica para el botón de compartir

const ShareFeature = {
    init: function () {
        this.createDOM();
    },

    createDOM: function () {
        if (document.getElementById('shareBtnContainer')) return;

        const container = document.createElement('div');
        container.id = 'shareBtnContainer';
        container.className = 'share-button-container';

        container.innerHTML = `
            <div style="position: relative;">
                <button class="share-btn" id="shareBtn" aria-label="Compartir">
                    🔗
                </button>
                <div class="share-tooltip">Compartir estado</div>
            </div>
        `;

        document.body.appendChild(container);

        // Toast container
        const toast = document.createElement('div');
        toast.id = 'shareToast';
        toast.className = 'share-toast';
        toast.textContent = '¡Enlace copiado al portapapeles!';
        document.body.appendChild(toast);

        // Event listener
        document.getElementById('shareBtn').addEventListener('click', () => this.share());
    },

    share: async function () {
        const url = 'https://habilispro.com';

        // Intentar obtener el país actual del usuario si está disponible en el DOM
        let userTime = document.getElementById('userTime')?.textContent || '';
        let nextCountry = document.getElementById('nextCountryName')?.textContent || 'el mundo';

        const text = `¡Sigue el Año Nuevo en vivo! Próxima parada: ${nextCountry}. Míralo aquí:`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Año Nuevo Global 2026',
                    text: text,
                    url: url
                });
            } catch (err) {
                // Fallback to clipboard if share fails or is cancelled
                if (err.name !== 'AbortError') {
                    this.copyToClipboard(`${text} ${url}`);
                }
            }
        } else {
            this.copyToClipboard(`${text} ${url}`);
        }
    },

    copyToClipboard: function (text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast();
        }).catch(err => {
            console.error('Error al copiar:', err);
        });
    },

    showToast: function () {
        const toast = document.getElementById('shareToast');
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
};

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    ShareFeature.init();
});
