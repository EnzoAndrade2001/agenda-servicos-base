const agendamentos = require('../models/agendamentos');
const pagamentos = require('../models/pagamentos');
const asaas = require('../services/asaas');
const { HttpError } = require('../utils/httpError');
const validacao = require('../utils/validation');
const regrasPagamento = require('../utils/paymentRules');

const metodosOnline = ['pix_online', 'cartao_online'];

function validarMetodoOnline(value = 'pix_online') {
    const metodo = validacao.texto(value, 'metodo', { max: 30 });
    if (!metodosOnline.includes(metodo)) throw new HttpError(400, `Metodo online invalido. Use: ${metodosOnline.join(', ')}.`);
    return metodo;
}

async function listar(req, res) {
    res.json(await pagamentos.listar({
        agendamentoId: req.query.agendamento_id ? validacao.id(req.query.agendamento_id, 'agendamento_id') : undefined
    }));
}

async function buscar(req, res) {
    const pagamento = await pagamentos.buscarPorId(validacao.id(req.params.id));
    if (!pagamento) throw new HttpError(404, 'Pagamento nao encontrado.');
    res.json(pagamento);
}

async function registrarManual(req, res) {
    const agendamentoId = validacao.id(req.body.agendamento_id, 'agendamento_id');
    const pagamento = await pagamentos.registrarManual({
        agendamento_id: agendamentoId,
        valor: validacao.dinheiro(req.body.valor, 'valor'),
        metodo: regrasPagamento.validarMetodoManual(req.body.metodo || 'dinheiro'),
        tipo: regrasPagamento.validarTipoPagamento(req.body.tipo || 'manual')
    });
    res.status(201).json(pagamento);
}

async function criarAsaas(req, res) {
    if (!asaas.estaConfigurado()) throw new HttpError(503, 'ASAAS_API_KEY nao configurada.');
    const agendamentoId = validacao.id(req.body.agendamento_id || req.params.agendamentoId, 'agendamento_id');
    const agendamento = await agendamentos.buscarPorId(agendamentoId);
    if (!agendamento) throw new HttpError(404, 'Agendamento nao encontrado.');
    if (['cancelado', 'faltou'].includes(agendamento.status)) {
        throw new HttpError(409, 'Nao e possivel cobrar um agendamento cancelado ou com falta.');
    }
    const metodo = validarMetodoOnline(req.body.metodo || agendamento.metodo_pagamento_preferido || 'pix_online');
    const tipo = regrasPagamento.validarTipoPagamento(req.body.tipo || (agendamento.tipo_cobranca === 'total' ? 'total' : 'sinal'));
    const valorPadrao = tipo === 'sinal' ? agendamento.valor_sinal : agendamento.preco;
    const valor = req.body.valor !== undefined ? validacao.dinheiro(req.body.valor, 'valor') : valorPadrao;
    if (valor <= 0) throw new HttpError(400, 'Valor de cobranca deve ser maior que zero.');
    const cpfCnpj = String(req.body.cpf_cnpj || '').replace(/\D/g, '');
    if (![11, 14].includes(cpfCnpj.length)) {
        throw new HttpError(400, 'Informe CPF ou CNPJ para criar pagamento online.');
    }
    const pagamento = await pagamentos.criarPendente({
        agendamento_id: agendamentoId,
        valor,
        provedor: 'asaas',
        metodo,
        tipo
    });
    const cobranca = metodo === 'pix_online'
        ? await asaas.criarPagamentoPix({ agendamento, pagamento, cliente: {
            nome: agendamento.cliente_nome,
            email: req.body.email || undefined
        }, cpfCnpj })
        : await asaas.criarPagamentoCartao({ agendamento, pagamento, cliente: {
            nome: agendamento.cliente_nome,
            email: req.body.email || undefined
        }, cpfCnpj });
    const atualizado = await pagamentos.atualizar(pagamento.id, {
        status: asaas.mapearStatus(cobranca.payment.status),
        asaas_payment_id: cobranca.payment.id,
        checkout_url: cobranca.payment.invoiceUrl,
        payload: asaas.payloadSeguro(cobranca)
    });
    if (atualizado.status === 'pago') await pagamentos.sincronizarAgendamento(undefined, agendamentoId);
    res.status(201).json(atualizado);
}

async function webhookAsaas(req, res) {
    const token = req.get('asaas-access-token') || req.get('access_token') || req.query.token;
    if (process.env.ASAAS_WEBHOOK_TOKEN && token !== process.env.ASAAS_WEBHOOK_TOKEN) {
        throw new HttpError(401, 'Token do webhook Asaas invalido.');
    }
    const payment = req.body.payment || {};
    await pagamentos.atualizarPorAsaas({
        paymentId: payment.id,
        externalReference: payment.externalReference,
        status: asaas.mapearStatus(payment.status),
        valor: payment.value,
        payload: req.body
    });
    res.status(200).json({ recebido: true });
}

module.exports = { listar, buscar, registrarManual, criarAsaas, webhookAsaas };
