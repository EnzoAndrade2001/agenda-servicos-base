(function () {
    var standalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
    var isiOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent)
        || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

    function showUpdatePrompt(registration) {
        if (!registration || !registration.waiting || document.querySelector('[data-pwa-update]')) return;
        var prompt = document.createElement('aside');
        prompt.className = 'pwa-update-prompt';
        prompt.setAttribute('data-pwa-update', '');
        prompt.innerHTML = [
            '<div>',
            '<strong>Atualizacao disponivel</strong>',
            '<span>Toque para carregar a versao mais nova do app.</span>',
            '</div>',
            '<button class="primary-button" type="button">Atualizar</button>'
        ].join('');
        document.body.appendChild(prompt);
        prompt.querySelector('button').addEventListener('click', function () {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        });
    }

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        var refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });
        navigator.serviceWorker.register('/service-worker.js').then(function (registration) {
            if (registration.waiting && navigator.serviceWorker.controller) {
                showUpdatePrompt(registration);
            }
            registration.addEventListener('updatefound', function () {
                var worker = registration.installing;
                if (!worker) return;
                worker.addEventListener('statechange', function () {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdatePrompt(registration);
                    }
                });
            });
        }).catch(function () {});
    }

    window.addEventListener('load', registerServiceWorker);

    if (standalone) {
        document.documentElement.classList.add('pwa-standalone');
        return;
    }
    if (!isiOS) return;

    document.documentElement.classList.add('ios-browser');
    window.addEventListener('DOMContentLoaded', function () {
        if (document.querySelector('[data-install-ios]')) return;
        var hint = document.createElement('aside');
        hint.className = 'install-ios-hint';
        hint.setAttribute('data-install-ios', '');
        hint.innerHTML = [
            '<button class="install-ios-close" type="button" aria-label="Fechar aviso">x</button>',
            '<strong>Instalar como app</strong>',
            '<span>Abra pelo Safari, toque em compartilhar e escolha Adicionar a Tela de Inicio. Depois abra pelo icone criado para sumir a barra do Safari.</span>'
        ].join('');
        document.body.appendChild(hint);
        hint.querySelector('button').addEventListener('click', function () {
            hint.remove();
        });
    });
})();
