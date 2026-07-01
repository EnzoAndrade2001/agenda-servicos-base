const { HttpError } = require('../utils/httpError');
const business = require('../config/business');
const negocioConfiguracoes = require('../models/negocioConfiguracoes');

function ambiente() {
    return process.env.ASAAS_ENV === 'production' ? 'production' : 'sandbox';
}

function baseUrl() {
    return ambiente() === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
}

function apiKey() {
    if (!process.env.ASAAS_API_KEY) throw new HttpError(503, 'ASAAS_API_KEY nao configurada.');
    return process.env.ASAAS_API_KEY;
}

function estaConfigurado() {
    return Boolean(process.env.ASAAS_API_KEY);
}

async function request(path, options = {}) {
    const response = await fetch(`${baseUrl()}${path}`, {
        ...options,
        headers: {
            access_token: apiKey(),
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const erro = data.errors && data.errors[0] && data.errors[0].description;
        throw new HttpError(response.status, erro || data.message || 'Erro ao comunicar com Asaas.', data);
    }
    return data;
}

function hojeLocal() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
}

async function criarCliente({ nome, email, cpfCnpj, telefone: telefoneCliente }) {
    return request('/customers', {
        method: 'POST',
        body: JSON.stringify({
            name: nome,
            email: email || undefined,
            cpfCnpj,
            mobilePhone: process.env.ASAAS_SEND_CUSTOMER_PHONE === 'true'
                ? String(telefoneCliente || '').replace(/\D/g, '').slice(-11) || undefined
                : undefined
        })
    });
}

async function criarPagamentoPix({ agendamento, pagamento, cliente, cpfCnpj }) {
    const negocio = await negocioConfiguracoes.buscar();
    const customer = await criarCliente({
        nome: agendamento.cliente_nome,
        email: cliente && cliente.email,
        cpfCnpj,
        telefone: agendamento.cliente_telefone
    });
    const payment = await request('/payments', {
        method: 'POST',
        body: JSON.stringify({
            customer: customer.id,
            billingType: 'PIX',
            value: Number(pagamento.valor),
            dueDate: hojeLocal(),
            description: `${pagamento.tipo === 'sinal' ? 'Entrada' : 'Pagamento'} ${negocio.nome} - ${agendamento.servico_nome}`,
            externalReference: `agendamento:${agendamento.id}:pagamento:${pagamento.id}`
        })
    });
    const pix = await request(`/payments/${encodeURIComponent(payment.id)}/pixQrCode`);
    return { customer, payment, pix };
}

async function criarPagamentoCartao({ agendamento, pagamento, cliente, cpfCnpj }) {
    const negocio = await negocioConfiguracoes.buscar();
    const customer = await criarCliente({
        nome: agendamento.cliente_nome,
        email: cliente && cliente.email,
        cpfCnpj,
        telefone: agendamento.cliente_telefone
    });
    const payment = await request('/payments', {
        method: 'POST',
        body: JSON.stringify({
            customer: customer.id,
            billingType: 'CREDIT_CARD',
            value: Number(pagamento.valor),
            dueDate: hojeLocal(),
            description: `${pagamento.tipo === 'sinal' ? 'Entrada' : 'Pagamento'} ${negocio.nome} - ${agendamento.servico_nome}`,
            externalReference: `agendamento:${agendamento.id}:pagamento:${pagamento.id}`
        })
    });
    return { customer, payment };
}

async function criarTransferenciaPix({ valor, pixAddressKey, pixAddressKeyType, descricao }) {
    return request('/transfers', {
        method: 'POST',
        body: JSON.stringify({
            value: Number(valor),
            pixAddressKey,
            pixAddressKeyType,
            description: descricao || business.descricaoRepasse()
        })
    });
}

function mapearStatus(status) {
    const mapa = {
        RECEIVED: 'pago',
        CONFIRMED: 'pago',
        PENDING: 'pendente',
        OVERDUE: 'pendente',
        REFUNDED: 'reembolsado',
        PARTIALLY_REFUNDED: 'reembolsado',
        DELETED: 'cancelado'
    };
    return mapa[status] || 'pendente';
}

function payloadTransferenciaSeguro(transferencia) {
    return {
        id: transferencia && transferencia.id,
        status: transferencia && transferencia.status,
        value: transferencia && transferencia.value,
        effectiveDate: transferencia && transferencia.effectiveDate,
        scheduleDate: transferencia && transferencia.scheduleDate,
        type: transferencia && transferencia.type,
        operationType: transferencia && transferencia.operationType
    };
}

function payloadSeguro(cobranca) {
    const payment = cobranca && cobranca.payment ? cobranca.payment : {};
    const customer = cobranca && cobranca.customer ? cobranca.customer : {};
    const pix = cobranca && cobranca.pix ? cobranca.pix : null;
    return {
        payment: {
            id: payment.id,
            status: payment.status,
            billingType: payment.billingType,
            value: payment.value,
            netValue: payment.netValue,
            dueDate: payment.dueDate,
            invoiceUrl: payment.invoiceUrl,
            externalReference: payment.externalReference,
            description: payment.description
        },
        customer: {
            id: customer.id,
            name: customer.name
        },
        pix: pix ? {
            success: pix.success,
            expirationDate: pix.expirationDate,
            description: pix.description
        } : null
    };
}

module.exports = {
    estaConfigurado,
    criarPagamentoPix,
    criarPagamentoCartao,
    criarTransferenciaPix,
    mapearStatus,
    payloadSeguro,
    payloadTransferenciaSeguro
};
