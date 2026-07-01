const state = {
    clientes: [],
    servicos: [],
    agendamentos: [],
    resumo: null,
    lembretes: [],
    setup: null,
    business: {
        nome: 'Agenda de Servicos',
        nome_curto: 'Agenda Admin',
        inicial: 'A',
        proprietaria: 'Equipe'
    },
    adminProtegido: false
};

const el = {
    selectedDate: document.querySelector('#selectedDate'),
    prevDay: document.querySelector('#prevDay'),
    nextDay: document.querySelector('#nextDay'),
    refreshButton: document.querySelector('#refreshButton'),
    dayLabel: document.querySelector('#dayLabel'),
    summaryGrid: document.querySelector('#summaryGrid'),
    appointmentsList: document.querySelector('#appointmentsList'),
    appointmentForm: document.querySelector('#appointmentForm'),
    appointmentClient: document.querySelector('#appointmentClient'),
    appointmentService: document.querySelector('#appointmentService'),
    appointmentTime: document.querySelector('#appointmentTime'),
    appointmentCustomTime: document.querySelector('#appointmentCustomTime'),
    appointmentChargeType: document.querySelector('#appointmentChargeType'),
    appointmentPaymentMethod: document.querySelector('#appointmentPaymentMethod'),
    appointmentNotes: document.querySelector('#appointmentNotes'),
    clientForm: document.querySelector('#clientForm'),
    clientName: document.querySelector('#clientName'),
    clientPhone: document.querySelector('#clientPhone'),
    clientEmail: document.querySelector('#clientEmail'),
    clientList: document.querySelector('#clientList'),
    serviceForm: document.querySelector('#serviceForm'),
    serviceName: document.querySelector('#serviceName'),
    serviceDuration: document.querySelector('#serviceDuration'),
    servicePrice: document.querySelector('#servicePrice'),
    businessForm: document.querySelector('#businessForm'),
    businessName: document.querySelector('#businessName'),
    businessShortName: document.querySelector('#businessShortName'),
    businessOwner: document.querySelector('#businessOwner'),
    businessInitial: document.querySelector('#businessInitial'),
    businessSegment: document.querySelector('#businessSegment'),
    businessSubtitle: document.querySelector('#businessSubtitle'),
    businessRegion: document.querySelector('#businessRegion'),
    businessBookingText: document.querySelector('#businessBookingText'),
    businessLocationTitle: document.querySelector('#businessLocationTitle'),
    businessLocationDescription: document.querySelector('#businessLocationDescription'),
    transferForm: document.querySelector('#transferForm'),
    transferAmount: document.querySelector('#transferAmount'),
    transferDefaultHint: document.querySelector('#transferDefaultHint'),
    transferDescription: document.querySelector('#transferDescription'),
    transferConfirmation: document.querySelector('#transferConfirmation'),
    transferList: document.querySelector('#transferList'),
    adminLogin: document.querySelector('#adminLogin'),
    adminLoginForm: document.querySelector('#adminLoginForm'),
    adminUserLabel: document.querySelector('#adminUserLabel'),
    adminUser: document.querySelector('#adminUser'),
    adminToken: document.querySelector('#adminToken'),
    editDialog: document.querySelector('#editDialog'),
    editForm: document.querySelector('#editForm'),
    closeEdit: document.querySelector('#closeEdit'),
    editAppointmentId: document.querySelector('#editAppointmentId'),
    editClient: document.querySelector('#editClient'),
    editService: document.querySelector('#editService'),
    editDate: document.querySelector('#editDate'),
    editTime: document.querySelector('#editTime'),
    editChargeType: document.querySelector('#editChargeType'),
    editPaymentMethod: document.querySelector('#editPaymentMethod'),
    editNotes: document.querySelector('#editNotes'),
    editReminderDate: document.querySelector('#editReminderDate'),
    editReminderDays: document.querySelector('#editReminderDays'),
    editReminderNotes: document.querySelector('#editReminderNotes'),
    editReminderDone: document.querySelector('#editReminderDone'),
    confirmDialog: document.querySelector('#confirmDialog'),
    confirmKicker: document.querySelector('#confirmKicker'),
    confirmTitle: document.querySelector('#confirmTitle'),
    confirmMessage: document.querySelector('#confirmMessage'),
    confirmCancel: document.querySelector('#confirmCancel'),
    confirmAccept: document.querySelector('#confirmAccept'),
    notificationButton: document.querySelector('#notificationButton'),
    notificationCount: document.querySelector('#notificationCount'),
    notificationPanel: document.querySelector('#notificationPanel'),
    notificationList: document.querySelector('#notificationList'),
    setupChecklist: document.querySelector('#setupChecklist'),
    toast: document.querySelector('#toast')
};

function today() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
}

function addDays(dateText, amount) {
    const date = new Date(`${dateText}T12:00:00`);
    date.setDate(date.getDate() + amount);
    return date.toISOString().slice(0, 10);
}

function addDaysFromDate(value, amount) {
    const date = new Date(value);
    date.setDate(date.getDate() + amount);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
}

function startOfDay(dateText) {
    return `${dateText}T00:00:00-03:00`;
}

function nextDayStart(dateText) {
    return `${addDays(dateText, 1)}T00:00:00-03:00`;
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

function dateInputValue(value) {
    const date = new Date(value);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
}

function timeInputValue(value) {
    const date = new Date(value);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function dateLong(dateText) {
    const date = new Date(`${dateText}T12:00:00`);
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function dateShort(value) {
    const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T12:00:00`)
        : new Date(value);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function reminderLabel(days) {
    if (days < 0) return `${Math.abs(days)} dia(s) atrasado`;
    if (days === 0) return 'retorno hoje';
    return `em ${days} dia(s)`;
}

function chargeLabel(value) {
    return ({
        pagar_na_hora: 'pagar na hora',
        sinal_30: 'entrada 30%',
        sinal_50: 'entrada 50%',
        total: 'total antecipado'
    })[value] || value || 'pagar na hora';
}

function methodLabel(value) {
    return ({
        pix_online: 'Pix online',
        cartao_online: 'cartao online',
        pix_manual: 'Pix manual',
        dinheiro: 'dinheiro'
    })[value] || value || 'Pix manual';
}

function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('visible');
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => el.toast.classList.remove('visible'), 3200);
}

function applyBusinessInfo(negocio = {}) {
    state.business = { ...state.business, ...(negocio || {}) };
    document.title = `Admin | ${state.business.nome}`;
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', `${state.business.nome_curto || state.business.nome} Admin`);
    document.querySelectorAll('.brand-name').forEach((node) => { node.textContent = state.business.nome; });
    document.querySelectorAll('.brand-mark').forEach((node) => { node.textContent = state.business.inicial || 'A'; });
    document.querySelectorAll('.brand-lockup').forEach((node) => { node.setAttribute('aria-label', state.business.nome); });
    if (el.transferDescription && !el.transferDescription.dataset.edited) {
        el.transferDescription.value = `Repasse ${state.business.nome}`;
    }
    fillBusinessForm();
}

function fillBusinessForm() {
    if (!el.businessForm) return;
    el.businessName.value = state.business.nome || '';
    el.businessShortName.value = state.business.nome_curto || '';
    el.businessOwner.value = state.business.proprietaria || '';
    el.businessInitial.value = state.business.inicial || '';
    el.businessSegment.value = state.business.segmento || '';
    el.businessSubtitle.value = state.business.subtitulo || '';
    el.businessRegion.value = state.business.regiao || '';
    el.businessBookingText.value = state.business.frase_agendamento || '';
    el.businessLocationTitle.value = state.business.local_titulo || '';
    el.businessLocationDescription.value = state.business.local_descricao || '';
}

function confirmAction({
    title = 'Confirmar acao',
    message = 'Tem certeza?',
    kicker = 'Confirmacao',
    acceptText = 'Confirmar',
    danger = false
}) {
    if (!el.confirmDialog) return Promise.resolve(window.confirm(message));
    el.confirmKicker.textContent = kicker;
    el.confirmTitle.textContent = title;
    el.confirmMessage.textContent = message;
    el.confirmAccept.textContent = acceptText;
    el.confirmAccept.className = danger ? 'danger-button' : 'primary-button';
    el.confirmDialog.hidden = false;
    document.body.classList.add('modal-open');
    el.confirmCancel.focus();

    return new Promise((resolve) => {
        const close = (result) => {
            el.confirmDialog.hidden = true;
            document.body.classList.remove('modal-open');
            el.confirmCancel.removeEventListener('click', onCancel);
            el.confirmAccept.removeEventListener('click', onAccept);
            el.confirmDialog.removeEventListener('click', onBackdrop);
            document.removeEventListener('keydown', onKeydown);
            resolve(result);
        };
        const onCancel = () => close(false);
        const onAccept = () => close(true);
        const onBackdrop = (event) => {
            if (event.target === el.confirmDialog) close(false);
        };
        const onKeydown = (event) => {
            if (event.key === 'Escape') close(false);
        };
        el.confirmCancel.addEventListener('click', onCancel);
        el.confirmAccept.addEventListener('click', onAccept);
        el.confirmDialog.addEventListener('click', onBackdrop);
        document.addEventListener('keydown', onKeydown);
    });
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

async function api(path, options = {}) {
    const response = await fetch(path, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });
    if (response.status === 204) return null;
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.erro || 'Nao foi possivel completar a acao.');
        error.status = response.status;
        error.details = data.detalhes || {};
        if (response.status === 401) showLogin();
        throw error;
    }
    return data;
}

function showLogin() {
    if (!el.adminLogin) return;
    el.adminLogin.hidden = false;
    el.adminLogin.style.display = 'grid';
    document.body.classList.add('login-open');
    if (el.adminUser && !el.adminUserLabel.hidden) el.adminUser.focus();
    else if (el.adminToken) el.adminToken.focus();
}

function hideLogin() {
    if (!el.adminLogin) return;
    el.adminLogin.hidden = true;
    el.adminLogin.style.display = 'none';
    document.body.classList.remove('login-open');
}

function option(value, label) {
    const node = document.createElement('option');
    node.value = value;
    node.textContent = label;
    return node;
}

function renderSelects() {
    el.appointmentClient.replaceChildren(
        option('', state.clientes.length ? 'Selecione' : 'Cadastre uma cliente'),
        ...state.clientes.map((cliente) => option(cliente.id, `${cliente.nome} - ${cliente.telefone}`))
    );
    el.appointmentService.replaceChildren(
        option('', state.servicos.length ? 'Selecione' : 'Cadastre um servico'),
        ...state.servicos.map((servico) => option(
            servico.id,
            `${servico.nome} - ${durationLabel(servico.duracao_minutos)} - ${currency(servico.preco)}`
        ))
    );
    if (el.editClient && el.editService) {
        el.editClient.replaceChildren(
            ...state.clientes.map((cliente) => option(cliente.id, `${cliente.nome} - ${cliente.telefone}`))
        );
        el.editService.replaceChildren(
            ...state.servicos.map((servico) => option(
                servico.id,
                `${servico.nome} - ${durationLabel(servico.duracao_minutos)} - ${currency(servico.preco)}`
            ))
        );
    }
}

function renderClientList() {
    if (!el.clientList) return;
    if (!state.clientes.length) {
        el.clientList.innerHTML = '<div class="mini-empty">Nenhuma cliente ativa.</div>';
        return;
    }
    el.clientList.replaceChildren(...state.clientes.slice(0, 8).map((cliente) => {
        const item = document.createElement('article');
        item.className = 'client-item';
        item.innerHTML = `
            <div>
                <strong>${escapeHtml(cliente.nome)}</strong>
                <span>${escapeHtml(cliente.telefone)}</span>
            </div>
        `;
        item.append(actionButton('Excluir', 'secondary-button mini-button', () => archiveClient(cliente)));
        return item;
    }));
}

async function loadTimes() {
    const servicoId = el.appointmentService.value;
    if (!servicoId) {
        el.appointmentTime.replaceChildren(option('', 'Escolha um servico'));
        return;
    }
    const horarios = await api(`/api/disponibilidade?data=${el.selectedDate.value}&servico_id=${servicoId}`);
    el.appointmentTime.replaceChildren(
        option('', horarios.length ? 'Selecione' : 'Sem horarios livres'),
        ...horarios.map((inicio) => option(inicio, time(inicio)))
    );
}

function selectedStart() {
    if (el.appointmentCustomTime.value) {
        return `${el.selectedDate.value}T${el.appointmentCustomTime.value}:00-03:00`;
    }
    return el.appointmentTime.value;
}

function renderSummary() {
    const resumo = state.resumo || { total: 0, concluidos: 0, faturamento: 0, cancelados: 0 };
    el.summaryGrid.innerHTML = `
        <div><strong>${resumo.total}</strong><span>marcados</span></div>
        <div><strong>${resumo.concluidos}</strong><span>concluidos</span></div>
        <div><strong>${currency(resumo.faturamento)}</strong><span>recebido</span></div>
        <div><strong>${resumo.cancelados}</strong><span>cancelados</span></div>
    `;
}

function actionButton(text, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = text;
    button.addEventListener('click', handler);
    return button;
}

function renderAppointments() {
    el.dayLabel.textContent = dateLong(el.selectedDate.value);
    if (!state.agendamentos.length) {
        el.appointmentsList.innerHTML = '<div class="empty-state">Nenhum horario marcado para este dia.</div>';
        return;
    }

    el.appointmentsList.replaceChildren(...state.agendamentos.map((agendamento) => {
        const row = document.createElement('article');
        row.className = `appointment ${agendamento.status}`;
        const statusClass = ['cancelado', 'faltou'].includes(agendamento.status) ? agendamento.status : '';
        row.innerHTML = `
            <div class="appointment-time">
                <strong>${time(agendamento.inicio)}</strong>
                <span>${time(agendamento.fim)}</span>
            </div>
            <div class="appointment-main">
                <div class="appointment-title">
                    <h3>${escapeHtml(agendamento.cliente_nome)}</h3>
                    <strong>${currency(agendamento.preco)}</strong>
                </div>
                <p>${escapeHtml(agendamento.servico_nome)}</p>
                ${agendamento.observacoes ? `<p>${escapeHtml(agendamento.observacoes)}</p>` : ''}
                <div class="status-row">
                    <span class="pill ${statusClass}">${escapeHtml(agendamento.status)}</span>
                    ${agendamento.aprovacao_pendente ? '<span class="pill approval">aguardando aprovacao</span>' : ''}
                    ${agendamento.encaixe ? '<span class="pill encaixe">encaixe</span>' : ''}
                    <span class="pill pagamento">${escapeHtml(agendamento.pagamento_status || 'pendente')}</span>
                    <span class="pill">${escapeHtml(chargeLabel(agendamento.tipo_cobranca))}</span>
                    <span class="pill">${escapeHtml(methodLabel(agendamento.metodo_pagamento_preferido))}</span>
                    ${agendamento.lembrete_retorno_em ? `<span class="pill reminder">retorno ${dateShort(agendamento.lembrete_retorno_em)}</span>` : ''}
                </div>
                <div class="money-row">
                    <span>Entrada: ${currency(agendamento.valor_sinal)}</span>
                    <span>Pago: ${currency(agendamento.valor_pago)}</span>
                    <span>Falta: ${currency(agendamento.saldo_restante)}</span>
                </div>
            </div>
        `;
        const actions = document.createElement('div');
        actions.className = 'actions';
        if (!['concluido', 'cancelado', 'faltou'].includes(agendamento.status)) {
            actions.append(
                actionButton('Editar', 'secondary-button', () => openEdit(agendamento)),
                actionButton(
                    agendamento.aprovacao_pendente ? 'Aprovar' : 'Confirmar',
                    agendamento.aprovacao_pendente ? 'primary-button' : 'secondary-button',
                    () => updateStatus(agendamento.id, 'confirmado')
                ),
                actionButton('Concluir', 'primary-button', () => updateStatus(agendamento.id, 'concluido')),
                actionButton('Cancelar', 'danger-button', () => updateStatus(agendamento.id, 'cancelado'))
            );
        } else {
            actions.append(actionButton('Editar', 'secondary-button', () => openEdit(agendamento)));
        }
        actions.append(actionButton('Excluir', 'danger-button outline-danger', () => deleteAppointment(agendamento)));
        row.append(actions);
        return row;
    }));
}

function renderNotifications() {
    if (!el.notificationButton || !el.notificationCount || !el.notificationList) return;
    const count = state.lembretes.length;
    el.notificationCount.textContent = count;
    el.notificationButton.classList.toggle('has-alerts', count > 0);
    if (!count) {
        el.notificationList.innerHTML = '<div class="notification-empty">Nenhum retorno pendente.</div>';
        return;
    }
    el.notificationList.replaceChildren(...state.lembretes.map((lembrete) => {
        const item = document.createElement('article');
        item.className = 'notification-item';
        item.innerHTML = `
            <strong>${escapeHtml(lembrete.cliente_nome)}</strong>
            <span>${escapeHtml(lembrete.servico_nome)} - ${dateShort(lembrete.data_retorno)}</span>
            <small>${escapeHtml(reminderLabel(Number(lembrete.dias_restantes)))} · ${escapeHtml(lembrete.cliente_telefone)}</small>
            ${lembrete.lembrete_retorno_observacoes ? `<small>${escapeHtml(lembrete.lembrete_retorno_observacoes)}</small>` : ''}
        `;
        item.append(actionButton('Resolvido', 'secondary-button mini-button', () => resolveReminder(lembrete.agendamento_id)));
        return item;
    }));
}

function renderSetupChecklist() {
    if (!el.setupChecklist || !state.setup) return;
    const itens = [
        {
            pronto: Boolean(state.setup.whatsapp_configurado),
            label: 'WhatsApp Business'
        },
        {
            pronto: Boolean(state.setup.pagamento_online_configurado),
            label: 'Pagamento online'
        },
        {
            pronto: Boolean(state.setup.public_base_url_configurada),
            label: 'PUBLIC_BASE_URL'
        },
        {
            pronto: Boolean(state.setup.public_base_url_https),
            label: 'PUBLIC_BASE_URL com HTTPS'
        }
    ];
    const pendentes = itens.filter((item) => !item.pronto);
    if (!pendentes.length) {
        el.setupChecklist.hidden = true;
        return;
    }
    el.setupChecklist.hidden = false;
    el.setupChecklist.innerHTML = `
        <strong>Configuracao pendente</strong>
        <div class="setup-checklist-items">
            ${itens.map((item) => `<span class="setup-pill ${item.pronto ? 'ok' : 'pending'}">${item.pronto ? 'ok' : 'pendente'} - ${escapeHtml(item.label)}</span>`).join('')}
        </div>
    `;
}

function renderTransferDefault() {
    if (!el.transferDefaultHint) return;
    const destino = state.setup && state.setup.repasse_destino_padrao;
    if (destino && destino.configurado) {
        el.transferDefaultHint.textContent = `Destino fixo: ${destino.pix_chave_tipo} ${destino.pix_chave_mascarada}`;
        return;
    }
    el.transferDefaultHint.textContent = 'Destino padrao nao configurado.';
}

async function loadTransfers() {
    if (!el.transferList) return;
    const repasses = await api('/api/repasses');
    if (!repasses.length) {
        el.transferList.hidden = true;
        el.transferList.replaceChildren();
        return;
    }
    el.transferList.hidden = false;
    el.transferList.innerHTML = `
        <strong>Ultimos repasses</strong>
        <div class="setup-checklist-items">
            ${repasses.slice(0, 5).map((repasse) => `
                <span class="setup-pill ${repasse.status === 'concluido' ? 'ok' : 'pending'}">
                    ${escapeHtml(repasse.status)} - ${currency(repasse.valor)} - ${escapeHtml(repasse.pix_chave_mascarada)}
                </span>
            `).join('')}
        </div>
    `;
}

async function resolveReminder(id) {
    try {
        await api(`/api/agendamentos/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ lembrete_retorno_concluido: true })
        });
        showToast('Lembrete resolvido.');
        await loadDay();
    } catch (error) {
        showToast(error.message);
    }
}

async function updateStatus(id, status) {
    try {
        await api(`/api/agendamentos/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        showToast('Agendamento atualizado.');
        await loadDay();
    } catch (error) {
        showToast(error.message);
    }
}

async function deleteAppointment(agendamento) {
    const confirma = await confirmAction({
        title: 'Excluir horario',
        message: `Excluir o horario de ${agendamento.cliente_nome} as ${time(agendamento.inicio)}? Essa acao remove o agendamento da agenda.`,
        kicker: 'Agenda',
        acceptText: 'Excluir',
        danger: true
    });
    if (!confirma) return;
    try {
        await api(`/api/agendamentos/${agendamento.id}`, { method: 'DELETE' });
        showToast('Horario excluido.');
        await loadDay();
    } catch (error) {
        showToast(error.message);
    }
}

async function archiveClient(cliente) {
    const confirma = await confirmAction({
        title: 'Excluir cliente',
        message: `Excluir ${cliente.nome} da lista de clientes ativas? Ela sai dos novos agendamentos, mas o historico antigo continua salvo.`,
        kicker: 'Clientes',
        acceptText: 'Excluir',
        danger: true
    });
    if (!confirma) return;
    try {
        await api(`/api/clientes/${cliente.id}`, { method: 'DELETE' });
        showToast('Cliente excluida da lista ativa.');
        await loadBaseData();
        await loadTimes();
    } catch (error) {
        showToast(error.message);
    }
}

function openEdit(agendamento) {
    if (!el.editDialog) return;
    el.editAppointmentId.value = agendamento.id;
    el.editClient.value = agendamento.cliente_id;
    el.editService.value = agendamento.servico_id;
    el.editDate.value = dateInputValue(agendamento.inicio);
    el.editTime.value = timeInputValue(agendamento.inicio);
    el.editChargeType.value = agendamento.tipo_cobranca || 'pagar_na_hora';
    el.editPaymentMethod.value = agendamento.metodo_pagamento_preferido || 'pix_manual';
    el.editNotes.value = agendamento.observacoes || '';
    el.editReminderDate.value = agendamento.lembrete_retorno_em || '';
    el.editReminderDays.value = '';
    el.editReminderNotes.value = agendamento.lembrete_retorno_observacoes || '';
    el.editReminderDone.checked = Boolean(agendamento.lembrete_retorno_concluido);
    updateEditPaymentUI();
    el.editDialog.hidden = false;
    document.body.classList.add('modal-open');
}

function closeEditDialog() {
    if (!el.editDialog) return;
    el.editDialog.hidden = true;
    document.body.classList.remove('modal-open');
}

function editBody(extra = {}) {
    return {
        cliente_id: el.editClient.value,
        servico_id: el.editService.value,
        inicio: `${el.editDate.value}T${el.editTime.value}:00-03:00`,
        tipo_cobranca: el.editChargeType.value,
        metodo_pagamento_preferido: el.editPaymentMethod.value,
        lembrete_retorno_em: el.editReminderDate.value || null,
        lembrete_retorno_observacoes: el.editReminderNotes.value,
        lembrete_retorno_concluido: el.editReminderDone.checked,
        observacoes: el.editNotes.value,
        ...extra
    };
}

async function saveEdit(extra = {}) {
    await api(`/api/agendamentos/${el.editAppointmentId.value}`, {
        method: 'PATCH',
        body: JSON.stringify(editBody(extra))
    });
}

async function handleEditSubmit(event) {
    event.preventDefault();
    try {
        await saveEdit();
        closeEditDialog();
        showToast('Horario atualizado.');
        await loadDay();
    } catch (error) {
        if (error.status === 409 && error.details.pode_confirmar_encaixe) {
            const conflito = error.details.conflito;
            const confirma = await confirmAction({
                title: 'Salvar como encaixe?',
                message: `Esse novo horario conflita com ${conflito.cliente_nome} das ${time(conflito.inicio)} as ${time(conflito.fim)}. Deseja salvar como encaixe mesmo assim?`,
                kicker: 'Conflito de horario',
                acceptText: 'Salvar encaixe'
            });
            if (!confirma) return;
            try {
                await saveEdit({
                    permitir_conflito: true,
                    encaixe: true,
                    motivo_encaixe: 'Remarcado como encaixe no painel'
                });
                closeEditDialog();
                showToast('Horario remarcado como encaixe.');
                await loadDay();
            } catch (confirmError) {
                showToast(confirmError.message);
            }
            return;
        }
        showToast(error.message);
    }
}

async function loadDay() {
    const date = el.selectedDate.value;
    const [agendamentos, resumo, lembretes] = await Promise.all([
        api(`/api/agendamentos?inicio=${encodeURIComponent(startOfDay(date))}&fim=${encodeURIComponent(nextDayStart(date))}`),
        api(`/api/resumo?data=${date}`),
        api('/api/lembretes/retorno')
    ]);
    state.agendamentos = agendamentos;
    state.resumo = resumo;
    state.lembretes = lembretes;
    renderSummary();
    renderAppointments();
    renderNotifications();
    await loadTimes();
}

async function loadBaseData() {
    const [clientes, servicos, publico] = await Promise.all([
        api('/api/clientes'),
        api('/api/servicos'),
        api('/api/publico')
    ]);
    state.clientes = clientes;
    state.servicos = servicos;
    state.setup = publico.setup || null;
    applyBusinessInfo(publico.negocio);
    renderSelects();
    renderClientList();
    renderSetupChecklist();
    renderTransferDefault();
}

async function refreshAll() {
    try {
        await loadBaseData();
        await loadDay();
        await loadTransfers();
    } catch (error) {
        showToast(error.message);
    }
}

async function checkAdminAccess() {
    const status = await api('/api/admin/status');
    state.adminProtegido = status.protegido;
    if (el.adminUserLabel && el.adminUser) {
        el.adminUserLabel.hidden = !status.usuario_obrigatorio;
        el.adminUser.required = Boolean(status.usuario_obrigatorio);
    }
    if (state.adminProtegido && !status.autenticado) {
        showLogin();
        return false;
    }
    hideLogin();
    return true;
}

el.prevDay.addEventListener('click', () => {
    el.selectedDate.value = addDays(el.selectedDate.value, -1);
    loadDay().catch((error) => showToast(error.message));
});

el.nextDay.addEventListener('click', () => {
    el.selectedDate.value = addDays(el.selectedDate.value, 1);
    loadDay().catch((error) => showToast(error.message));
});

el.selectedDate.addEventListener('change', () => loadDay().catch((error) => showToast(error.message)));
el.refreshButton.addEventListener('click', refreshAll);
el.appointmentService.addEventListener('change', () => loadTimes().catch((error) => showToast(error.message)));
el.appointmentCustomTime.addEventListener('input', () => {
    el.appointmentTime.required = !el.appointmentCustomTime.value;
});

function ajustarCobrancaPorMetodo(metodoEl, cobrancaEl) {
    if (!metodoEl || !cobrancaEl) return;
    const metodo = metodoEl.value;
    const online = ['pix_online', 'cartao_online'].includes(metodo);
    if (metodo === 'dinheiro') {
        cobrancaEl.value = 'pagar_na_hora';
        cobrancaEl.disabled = true;
        return;
    }
    cobrancaEl.disabled = false;
    if (online && cobrancaEl.value === 'pagar_na_hora') {
        cobrancaEl.value = 'sinal_30';
    }
}

function updateAppointmentPaymentUI() {
    ajustarCobrancaPorMetodo(el.appointmentPaymentMethod, el.appointmentChargeType);
}

function updateEditPaymentUI() {
    ajustarCobrancaPorMetodo(el.editPaymentMethod, el.editChargeType);
}

el.appointmentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const baseBody = {
        cliente_id: el.appointmentClient.value,
        servico_id: el.appointmentService.value,
        inicio: selectedStart(),
        tipo_cobranca: el.appointmentChargeType.value,
        metodo_pagamento_preferido: el.appointmentPaymentMethod.value,
        observacoes: el.appointmentNotes.value
    };
    try {
        await api('/api/agendamentos', {
            method: 'POST',
            body: JSON.stringify(baseBody)
        });
        el.appointmentNotes.value = '';
        el.appointmentCustomTime.value = '';
        el.appointmentTime.required = true;
        showToast('Horario agendado.');
        await loadDay();
    } catch (error) {
        if (error.status === 409 && error.details.pode_confirmar_encaixe) {
            const conflito = error.details.conflito;
            const confirma = await confirmAction({
                title: 'Criar encaixe?',
                message: `Esse horario conflita com ${conflito.cliente_nome} das ${time(conflito.inicio)} as ${time(conflito.fim)}. Tem certeza que deseja encaixar mesmo assim?`,
                kicker: 'Conflito de horario',
                acceptText: 'Criar encaixe'
            });
            if (!confirma) {
                showToast('Encaixe cancelado.');
                return;
            }
            try {
                await api('/api/agendamentos', {
                    method: 'POST',
                    body: JSON.stringify({
                        ...baseBody,
                        permitir_conflito: true,
                        motivo_encaixe: 'Confirmado manualmente no painel'
                    })
                });
                el.appointmentNotes.value = '';
                el.appointmentCustomTime.value = '';
                el.appointmentTime.required = true;
                showToast('Encaixe agendado.');
                await loadDay();
                return;
            } catch (confirmError) {
                showToast(confirmError.message);
                return;
            }
        }
        showToast(error.message);
    }
});

el.clientForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
        const cliente = await api('/api/clientes', {
            method: 'POST',
            body: JSON.stringify({
                nome: el.clientName.value,
                telefone: el.clientPhone.value,
                email: el.clientEmail.value
            })
        });
        el.clientForm.reset();
        showToast('Cliente salvo.');
        await loadBaseData();
        el.appointmentClient.value = cliente.id;
    } catch (error) {
        showToast(error.message);
    }
});

el.serviceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
        const servico = await api('/api/servicos', {
            method: 'POST',
            body: JSON.stringify({
                nome: el.serviceName.value,
                duracao_minutos: Number(el.serviceDuration.value),
                preco: Number(el.servicePrice.value)
            })
        });
        el.serviceForm.reset();
        el.serviceDuration.value = 60;
        showToast('Servico salvo.');
        await loadBaseData();
        el.appointmentService.value = servico.id;
        await loadTimes();
    } catch (error) {
        showToast(error.message);
    }
});

if (el.businessForm) {
    el.businessForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            const negocio = await api('/api/configuracoes/negocio', {
                method: 'PATCH',
                body: JSON.stringify({
                    nome: el.businessName.value,
                    nome_curto: el.businessShortName.value,
                    proprietaria: el.businessOwner.value,
                    inicial: el.businessInitial.value,
                    segmento: el.businessSegment.value,
                    subtitulo: el.businessSubtitle.value,
                    regiao: el.businessRegion.value,
                    frase_agendamento: el.businessBookingText.value,
                    local_titulo: el.businessLocationTitle.value,
                    local_descricao: el.businessLocationDescription.value
                })
            });
            applyBusinessInfo(negocio);
            showToast('Configuracao do negocio salva.');
        } catch (error) {
            showToast(error.message);
        }
    });
}

if (el.transferForm) {
    el.transferForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const valor = Number(el.transferAmount.value);
        const destino = state.setup && state.setup.repasse_destino_padrao;
        if (!Number.isFinite(valor) || valor <= 0) {
            showToast('Informe um valor valido para repasse.');
            return;
        }
        if (!destino || !destino.configurado) {
            showToast('Configure a chave Pix padrao de repasse no ambiente.');
            return;
        }
        if (el.transferConfirmation.value !== 'REPASSAR') {
            showToast('Digite REPASSAR para confirmar.');
            return;
        }
        const ok = await confirmAction({
            title: 'Enviar repasse?',
            message: `Enviar ${currency(valor)} para a chave Pix padrao configurada (${destino.pix_chave_mascarada})? Essa acao movimenta dinheiro real no Asaas.`,
            kicker: 'Dinheiro real',
            acceptText: 'Enviar repasse',
            danger: true
        });
        if (!ok) return;
        try {
            await api('/api/repasses/asaas', {
                method: 'POST',
                body: JSON.stringify({
                    valor,
                    usar_destino_padrao: true,
                    descricao: el.transferDescription.value,
                    confirmacao: el.transferConfirmation.value
                })
            });
            el.transferForm.reset();
            el.transferDescription.value = `Repasse ${state.business.nome}`;
            showToast('Repasse solicitado no Asaas.');
            await loadTransfers();
        } catch (error) {
            showToast(error.message);
            await loadTransfers().catch(() => {});
        }
    });
}

if (el.adminLoginForm) {
    el.adminLoginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            await api('/api/admin/login', {
                method: 'POST',
                body: JSON.stringify({
                    usuario: el.adminUser ? el.adminUser.value.trim() : '',
                    token: el.adminToken.value
                })
            });
            if (el.adminUser) el.adminUser.value = '';
            el.adminToken.value = '';
            await refreshAll();
            hideLogin();
            showToast('Acesso liberado.');
        } catch (error) {
            showLogin();
            showToast(error.message);
        }
    });
}

if (el.editForm) {
    el.editForm.addEventListener('submit', handleEditSubmit);
}

if (el.appointmentPaymentMethod) {
    el.appointmentPaymentMethod.addEventListener('change', updateAppointmentPaymentUI);
    updateAppointmentPaymentUI();
}

if (el.editPaymentMethod) {
    el.editPaymentMethod.addEventListener('change', updateEditPaymentUI);
}

if (el.closeEdit) {
    el.closeEdit.addEventListener('click', closeEditDialog);
}

if (el.editDialog) {
    el.editDialog.addEventListener('click', (event) => {
        if (event.target === el.editDialog) closeEditDialog();
    });
}

if (el.editReminderDays) {
    el.editReminderDays.addEventListener('input', () => {
        const days = Number(el.editReminderDays.value);
        if (!Number.isInteger(days) || days < 1 || !el.editDate.value) return;
        el.editReminderDate.value = addDaysFromDate(`${el.editDate.value}T12:00:00`, days);
        el.editReminderDone.checked = false;
    });
}

if (el.notificationButton && el.notificationPanel) {
    el.notificationButton.addEventListener('click', () => {
        const willOpen = el.notificationPanel.hidden;
        el.notificationPanel.hidden = !willOpen;
        el.notificationButton.setAttribute('aria-expanded', String(willOpen));
    });
    document.addEventListener('click', (event) => {
        if (
            !el.notificationPanel.hidden
            && !el.notificationPanel.contains(event.target)
            && !el.notificationButton.contains(event.target)
        ) {
            el.notificationPanel.hidden = true;
            el.notificationButton.setAttribute('aria-expanded', 'false');
        }
    });
}

el.selectedDate.value = today();
checkAdminAccess().then((ok) => {
    if (ok) refreshAll();
}).catch((error) => showToast(error.message));
