const state = {
    whatsapp: null,
    business: {
        nome: 'Agenda de Servicos',
        nome_curto: 'Agenda',
        proprietaria: 'Equipe',
        inicial: 'A',
        segmento: 'Atendimento com hora marcada',
        regiao: 'Informe sua regiao',
        frase_agendamento: 'Veja horarios disponiveis e escolha entre os servicos que cabem na agenda.',
        local_titulo: 'Atendimento com local combinado',
        local_descricao: 'Endereco ou forma de atendimento combinados apos a confirmacao.'
    },
    servicos: [],
    selectedSlot: null,
    setup: {
        whatsapp_configurado: false,
        pagamento_online_configurado: false,
        public_base_url_configurada: false,
        public_base_url_https: false,
        pix_disponivel: false
    }
};

const el = {
    services: document.querySelector('#publicServices'),
    heroWhatsapp: document.querySelector('#heroWhatsapp'),
    bottomWhatsapp: document.querySelector('#bottomWhatsapp'),
    availabilityForm: document.querySelector('#availabilityForm'),
    availabilityDate: document.querySelector('#availabilityDate'),
    availabilityGrid: document.querySelector('#availabilityGrid'),
    publicSetupNotice: document.querySelector('#publicSetupNotice'),
    bookingPanel: document.querySelector('#bookingPanel'),
    bookingSummary: document.querySelector('#bookingSummary'),
    bookingForm: document.querySelector('#bookingForm'),
    bookingService: document.querySelector('#bookingService'),
    bookingName: document.querySelector('#bookingName'),
    bookingPhone: document.querySelector('#bookingPhone'),
    bookingEmail: document.querySelector('#bookingEmail'),
    bookingDocument: document.querySelector('#bookingDocument'),
    bookingPaymentMethod: document.querySelector('#bookingPaymentMethod'),
    bookingChargeType: document.querySelector('#bookingChargeType'),
    bookingNotes: document.querySelector('#bookingNotes'),
    bookingWhatsapp: document.querySelector('#bookingWhatsapp'),
    bookingSetupHint: document.querySelector('#bookingSetupHint'),
    paymentResult: document.querySelector('#paymentResult'),
    heroBookingText: document.querySelector('#heroBookingText'),
    locationBadge: document.querySelector('.location-badge'),
    locationTitle: document.querySelector('#locationTitle'),
    locationDescription: document.querySelector('#locationDescription'),
    toast: document.querySelector('#toast')
};

function today() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
    const date = new Date(`${dateValue}T12:00:00`);
    date.setDate(date.getDate() + days);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
}

function currency(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function durationLabel(minutes) {
    const total = Number(minutes || 0);
    const hours = Math.floor(total / 60);
    const remaining = total % 60;
    if (hours && remaining) return `${hours}h${String(remaining).padStart(2, '0')}`;
    if (hours) return `${hours}h`;
    return `${remaining} min`;
}

function time(value) {
    return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function dateLong(value) {
    return new Date(value).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('visible');
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => el.toast.classList.remove('visible'), 3200);
}

function applyBusinessInfo(negocio = {}) {
    state.business = { ...state.business, ...(negocio || {}) };
    document.title = state.business.nome;
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', state.business.nome_curto || state.business.nome);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', state.business.nome);
    document.querySelector('meta[name="description"]')?.setAttribute('content', state.business.subtitulo || state.business.nome);
    document.querySelectorAll('.brand-name').forEach((node) => { node.textContent = state.business.nome; });
    document.querySelectorAll('.brand-mark').forEach((node) => { node.textContent = state.business.inicial || 'A'; });
    document.querySelector('.public-brand')?.setAttribute('aria-label', state.business.nome);
    if (el.locationBadge) el.locationBadge.textContent = state.business.regiao || '';
    if (el.heroBookingText) el.heroBookingText.textContent = state.business.frase_agendamento || '';
    if (el.locationTitle) el.locationTitle.textContent = state.business.local_titulo || '';
    if (el.locationDescription) el.locationDescription.textContent = state.business.local_descricao || '';
}

async function copyText(text, sourceElement = null) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // Safari/mobile can reject Clipboard API even after a tap.
        }
    }
    if (sourceElement) {
        sourceElement.focus();
        sourceElement.select();
        sourceElement.setSelectionRange(0, sourceElement.value.length);
        try {
            return document.execCommand('copy');
        } catch (error) {
            return false;
        }
    }
    return false;
}

async function api(path, options = {}) {
    const response = await fetch(path, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || 'Nao foi possivel carregar.');
    return data;
}

function whatsappUrl(servico = null, horario = null, cliente = null) {
    const horarioTexto = horario ? ` no dia ${dateLong(horario)} as ${time(horario)}` : '';
    const clienteTexto = cliente ? `\nNome: ${cliente.nome}\nTelefone: ${cliente.telefone}` : '';
    const nomeAtendente = state.business.proprietaria || state.business.nome;
    const message = servico
        ? `Oi, ${nomeAtendente}! Vim pelo site e quero marcar ${servico.nome}${horarioTexto}. Pode confirmar disponibilidade?${clienteTexto}`
        : `Oi, ${nomeAtendente}! Vim pelo site e quero marcar um horario.`;
    if (!state.whatsapp) return null;
    return `https://wa.me/${state.whatsapp}?text=${encodeURIComponent(message)}`;
}

function option(value, label) {
    const node = document.createElement('option');
    node.value = value;
    node.textContent = label;
    return node;
}

function metodoLabel(value) {
    return ({
        pix_online: 'Pix online',
        cartao_online: 'Cartao online',
        pix_manual: 'Pix manual na hora',
        dinheiro: 'Dinheiro na hora'
    })[value] || value;
}

function renderHeroAction() {
    const url = whatsappUrl();
    if (!url) {
        el.heroWhatsapp.href = '#servicos';
        el.heroWhatsapp.textContent = 'Ver servicos';
        if (el.bottomWhatsapp) {
            el.bottomWhatsapp.href = '#servicos';
            el.bottomWhatsapp.textContent = 'Ver servicos';
        }
        return;
    }
    el.heroWhatsapp.href = url;
    el.heroWhatsapp.target = '_blank';
    el.heroWhatsapp.rel = 'noopener';
    if (el.bottomWhatsapp) {
        el.bottomWhatsapp.href = url;
        el.bottomWhatsapp.target = '_blank';
        el.bottomWhatsapp.rel = 'noopener';
    }
}

function metodoOnline() {
    return ['pix_online', 'cartao_online'].includes(el.bookingPaymentMethod.value);
}

function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function formatPhone(value) {
    const digits = onlyDigits(value).slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function fieldErrorElement(input) {
    return input && document.querySelector(`[data-error-for="${input.id}"]`);
}

function setFieldError(input, message = '') {
    if (!input) return;
    input.classList.toggle('invalid', Boolean(message));
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    const error = fieldErrorElement(input);
    if (error) error.textContent = message;
}

function clearBookingErrors() {
    [el.bookingName, el.bookingPhone, el.bookingEmail, el.bookingDocument, el.bookingService]
        .forEach((input) => setFieldError(input, ''));
}

function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function validateBookingForm() {
    clearBookingErrors();
    const errors = [];
    const online = metodoOnline();
    const name = el.bookingName.value.trim();
    const phoneDigits = onlyDigits(el.bookingPhone.value);
    const email = el.bookingEmail.value.trim();
    const documentDigits = onlyDigits(el.bookingDocument.value);

    if (!state.selectedSlot) errors.push({ input: null, message: 'Escolha um horario livre antes de reservar.' });
    if (!el.bookingService.value) errors.push({ input: el.bookingService, message: 'Escolha o servico deste horario.' });
    if (name.length < 2) errors.push({ input: el.bookingName, message: 'Informe o nome da cliente.' });
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        errors.push({ input: el.bookingPhone, message: 'Informe um WhatsApp com DDD.' });
    }
    if (online && !validEmail(email)) {
        errors.push({ input: el.bookingEmail, message: 'Informe um email valido para o pagamento.' });
    }
    if (online && ![11, 14].includes(documentDigits.length)) {
        errors.push({ input: el.bookingDocument, message: 'Informe CPF com 11 digitos ou CNPJ com 14 digitos.' });
    }

    errors.forEach((error) => {
        if (error.input) setFieldError(error.input, error.message);
    });
    if (!errors.length) return true;

    const firstInput = errors.find((error) => error.input);
    showToast(errors[0].message);
    if (firstInput) {
        firstInput.input.focus({ preventScroll: true });
        firstInput.input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return false;
}

function pagamentoOnlineConfigurado() {
    return Boolean(state.setup.pagamento_online_configurado);
}

function updateBookingModeUI() {
    if (!el.bookingForm) return;
    const metodo = el.bookingPaymentMethod.value;
    const submitButton = el.bookingForm.querySelector('button[type="submit"]');
    const online = metodoOnline();
    el.bookingEmail.required = online;
    if (el.bookingDocument) el.bookingDocument.required = online;
    if (!online) {
        setFieldError(el.bookingEmail, '');
        setFieldError(el.bookingDocument, '');
    }
    el.bookingChargeType.disabled = !online;
    if (!online) el.bookingChargeType.value = 'sinal_30';
    submitButton.textContent = ({
        pix_online: 'Gerar QR Pix',
        cartao_online: 'Abrir pagamento com cartao',
        pix_manual: 'Reservar horario',
        dinheiro: 'Reservar horario'
    })[metodo] || 'Reservar horario';
    submitButton.disabled = online && !pagamentoOnlineConfigurado();
    el.bookingWhatsapp.disabled = !state.whatsapp;

    const avisos = [];
    if (online && !pagamentoOnlineConfigurado()) {
        avisos.push('Pagamento online ainda nao configurado.');
    }
    if (!state.whatsapp) {
        avisos.push(`WhatsApp sera liberado quando o numero de ${state.business.nome} entrar no .env.`);
    }
    el.bookingSetupHint.hidden = !avisos.length;
    el.bookingSetupHint.textContent = avisos.join(' ');
}

function renderSetupNotice() {
    const pendencias = [];
    if (!state.setup.whatsapp_configurado) pendencias.push('WhatsApp');
    if (!pagamentoOnlineConfigurado()) pendencias.push('pagamento online');
    if (!pendencias.length) {
        el.publicSetupNotice.hidden = true;
        return;
    }
    el.publicSetupNotice.hidden = false;
    el.publicSetupNotice.textContent = `Integracoes em configuracao: ${pendencias.join(' e ')}. O agendamento manual segue funcionando.`;
}

function serviceCard(servico) {
    const article = document.createElement('article');
    article.className = 'service-card';
    const url = whatsappUrl(servico);
    article.innerHTML = `
        <div class="service-meta">
            <span>${escapeHtml(servico.categoria || 'Unhas')}</span>
            <strong>${durationLabel(servico.duracao_minutos)}</strong>
        </div>
        <h3>${escapeHtml(servico.nome)}</h3>
        <p>${escapeHtml(servico.descricao || 'Servico com atendimento personalizado.')}</p>
        <div class="service-bottom">
            <strong>${currency(servico.preco)}</strong>
            ${
                url
                    ? `<a class="primary-button service-button" href="${url}" target="_blank" rel="noopener">Marcar</a>`
                    : '<button class="secondary-button service-button" type="button" data-disabled-whatsapp>Marcar</button>'
            }
        </div>
    `;
    const disabled = article.querySelector('[data-disabled-whatsapp]');
    if (disabled) disabled.addEventListener('click', () => showToast('Configure WHATSAPP_BUSINESS_NUMBER no .env.'));
    return article;
}

function renderServices() {
    if (!state.servicos.length) {
        el.services.innerHTML = '<div class="empty-state">Nenhum servico ativo cadastrado.</div>';
        return;
    }
    el.services.replaceChildren(...state.servicos.map(serviceCard));
}

function selectedBookingService() {
    if (!state.selectedSlot || !el.bookingService) return null;
    return (state.selectedSlot.servicos || [])
        .find((servico) => String(servico.id) === String(el.bookingService.value)) || null;
}

function serviceOptionLabel(servico) {
    return `${servico.nome} - ${durationLabel(servico.duracao_minutos)} - ${currency(servico.preco)}`;
}

function slotServicesLabel(slot) {
    const count = (slot.servicos || []).length;
    if (count === 1) return '1 servico';
    return `${count} servicos`;
}

function renderBookingServices(slot) {
    el.bookingService.replaceChildren(
        ...slot.servicos.map((servico) => option(servico.id, serviceOptionLabel(servico)))
    );
    if (slot.servicos.length) el.bookingService.value = slot.servicos[0].id;
}

function updateBookingSummary() {
    if (!state.selectedSlot) {
        el.bookingSummary.textContent = 'Escolha um horario livre.';
        return;
    }
    const servico = selectedBookingService();
    el.bookingSummary.textContent = servico
        ? `${servico.nome} em ${dateLong(state.selectedSlot.inicio)} as ${time(state.selectedSlot.inicio)}.`
        : `Horario em ${dateLong(state.selectedSlot.inicio)} as ${time(state.selectedSlot.inicio)}.`;
}

function selectSlot(slot) {
    state.selectedSlot = slot;
    renderBookingServices(slot);
    updateBookingSummary();
    el.bookingPanel.hidden = false;
    el.paymentResult.hidden = true;
    el.paymentResult.replaceChildren();
    updateBookingModeUI();
    el.bookingPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAvailability(slots, { preserveBooking = false } = {}) {
    if (!preserveBooking) {
        state.selectedSlot = null;
        el.bookingPanel.hidden = true;
    }
    const availableSlots = slots.filter((slot) => slot.disponivel);
    if (!availableSlots.length) {
        el.availabilityGrid.innerHTML = '<div class="empty-state compact-empty">Nenhum horario livre para esta data.</div>';
        return;
    }
    el.availabilityGrid.replaceChildren(...availableSlots.map((slot) => {
        const item = document.createElement('button');
        item.className = 'availability-slot available';
        item.type = 'button';
        item.addEventListener('click', () => selectSlot(slot));
        item.setAttribute('aria-label', `Reservar horario das ${time(slot.inicio)}`);
        item.innerHTML = `
            <strong>${time(slot.inicio)}</strong>
            <small>${slotServicesLabel(slot)}</small>
        `;
        return item;
    }));
}

async function loadAvailability(options = {}) {
    if (!el.availabilityDate.value) {
        el.availabilityGrid.innerHTML = '<div class="empty-state compact-empty">Escolha a data para ver horarios.</div>';
        return [];
    }
    const slots = await api(`/api/disponibilidade/horarios?data=${el.availabilityDate.value}`);
    renderAvailability(slots, options);
    return slots;
}

async function openNextAvailableDate() {
    const baseDate = today();
    el.availabilityDate.min = baseDate;
    el.availabilityDate.value = baseDate;

    for (let offset = 0; offset <= 21; offset += 1) {
        el.availabilityDate.value = addDays(baseDate, offset);
        const slots = await loadAvailability();
        if (slots.some((slot) => slot.disponivel)) return;
    }
}

function bookingPayload(metodo) {
    if (!state.selectedSlot) throw new Error('Escolha um horario livre.');
    return {
        nome: el.bookingName.value,
        telefone: onlyDigits(el.bookingPhone.value),
        email: el.bookingEmail.value,
        cpf_cnpj: el.bookingDocument ? el.bookingDocument.value : '',
        servico_id: el.bookingService.value,
        inicio: state.selectedSlot.inicio,
        tipo_cobranca: metodoOnline() ? el.bookingChargeType.value : 'pagar_na_hora',
        metodo_pagamento_preferido: metodo,
        observacoes: el.bookingNotes.value
    };
}

function renderPixPayment(result) {
    const pix = result.pagamento && result.pagamento.pix;
    if (!pix || !pix.qr_code) {
        showToast('Agendamento criado, mas o QR Pix nao retornou.');
        return;
    }
    el.paymentResult.hidden = false;
    el.paymentResult.innerHTML = `
        <div>
            <strong>QR Pix gerado</strong>
            <p>Horario reservado temporariamente. Pague pelo QR Code ou copie o codigo Pix para confirmar.</p>
        </div>
        ${pix.qr_code_base64 ? `<img src="data:image/png;base64,${pix.qr_code_base64}" alt="QR Code Pix">` : ''}
        <textarea readonly rows="4" data-pix-code>${escapeHtml(pix.qr_code)}</textarea>
        <button class="secondary-button" type="button" data-copy-pix>Copiar Pix</button>
        <p class="copy-hint" data-copy-hint hidden>Se nao copiar automaticamente, toque no codigo acima, selecione tudo e copie.</p>
    `;
    const copyButton = el.paymentResult.querySelector('[data-copy-pix]');
    const pixTextarea = el.paymentResult.querySelector('[data-pix-code]');
    const copyHint = el.paymentResult.querySelector('[data-copy-hint]');
    copyButton.addEventListener('click', async () => {
        const copied = await copyText(pix.qr_code, pixTextarea);
        if (copied) {
            copyButton.textContent = 'Pix copiado';
            showToast('Codigo Pix copiado.');
            setTimeout(() => { copyButton.textContent = 'Copiar Pix'; }, 2200);
            return;
        }
        pixTextarea.focus();
        pixTextarea.select();
        copyHint.hidden = false;
        showToast('Nao consegui copiar automaticamente. O codigo ficou selecionado.');
    });
}

function renderCardPayment(result) {
    const pagamento = result.pagamento || {};
    const checkoutUrl = pagamento.checkout_url || pagamento.sandbox_checkout_url;
    if (!checkoutUrl) {
        showToast('Agendamento criado, mas o link de pagamento nao retornou.');
        return;
    }
    el.paymentResult.hidden = false;
    el.paymentResult.innerHTML = `
        <div>
            <strong>Pagamento com cartao pronto</strong>
            <p>Horario reservado. Abra o checkout para concluir o pagamento online.</p>
        </div>
        <a class="primary-button payment-link" href="${checkoutUrl}" target="_blank" rel="noopener">Ir para o pagamento</a>
    `;
}

function renderManualReservation(result) {
    const aviso = result.aviso_whatsapp || {};
    const whatsappButton = aviso.url
        ? `<a class="primary-button payment-link" href="${aviso.url}" target="_blank" rel="noopener" data-manual-whatsapp>Avisar no WhatsApp</a>`
        : '';
    el.paymentResult.hidden = false;
    el.paymentResult.innerHTML = `
        <div>
            <strong>Pedido enviado</strong>
            <p>A cliente pediu ${escapeHtml(metodoLabel(el.bookingPaymentMethod.value).toLowerCase())}. O horario fica aguardando aprovacao.</p>
        </div>
        ${whatsappButton}
    `;
    const link = el.paymentResult.querySelector('[data-manual-whatsapp]');
    if (link && !aviso.enviado) {
        setTimeout(() => {
            window.open(link.href, '_blank', 'noopener');
        }, 120);
    }
}

async function init() {
    try {
        const [info, servicos] = await Promise.all([
            api('/api/publico'),
            api('/api/servicos')
        ]);
        state.whatsapp = info.whatsapp;
        applyBusinessInfo(info.negocio);
        state.setup = info.setup || state.setup;
        state.servicos = servicos;
        renderSetupNotice();
        renderHeroAction();
        renderServices();
        updateBookingModeUI();
        if (state.servicos.length) {
            await openNextAvailableDate();
        }
    } catch (error) {
        showToast(error.message);
    }
}

if (el.availabilityForm) {
    el.availabilityForm.addEventListener('submit', (event) => {
        event.preventDefault();
        loadAvailability().catch((error) => showToast(error.message));
    });
    el.availabilityDate.addEventListener('change', () => loadAvailability().catch((error) => showToast(error.message)));
}

if (el.bookingForm) {
    el.bookingForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const metodo = el.bookingPaymentMethod.value;
        if (!validateBookingForm()) return;
        if (metodoOnline() && !pagamentoOnlineConfigurado()) {
            showToast('Pagamento online ainda nao configurado no .env.');
            return;
        }
        try {
            const result = await api('/api/publico/agendamentos', {
                method: 'POST',
                body: JSON.stringify(bookingPayload(metodo))
            });
            if (metodo === 'pix_online') renderPixPayment(result);
            else if (metodo === 'cartao_online') renderCardPayment(result);
            else renderManualReservation(result);
            await loadAvailability({ preserveBooking: true });
        } catch (error) {
            showToast(error.message);
        }
    });
}

if (el.bookingPaymentMethod) {
    el.bookingPaymentMethod.addEventListener('change', () => {
        updateBookingModeUI();
        clearBookingErrors();
    });
}

if (el.bookingService) {
    el.bookingService.addEventListener('change', updateBookingSummary);
}

[el.bookingName, el.bookingPhone, el.bookingEmail, el.bookingDocument].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
        if (input === el.bookingPhone) input.value = formatPhone(input.value);
        setFieldError(input, '');
    });
});

if (el.bookingWhatsapp) {
    el.bookingWhatsapp.addEventListener('click', () => {
        try {
            const servico = selectedBookingService();
            const url = whatsappUrl(servico, state.selectedSlot && state.selectedSlot.inicio, {
                nome: el.bookingName.value || 'Cliente pelo site',
                telefone: el.bookingPhone.value || 'nao informado'
            });
            if (!url) {
                showToast('Configure WHATSAPP_BUSINESS_NUMBER no .env.');
                return;
            }
            window.open(url, '_blank', 'noopener');
        } catch (error) {
            showToast(error.message);
        }
    });
}

init();
