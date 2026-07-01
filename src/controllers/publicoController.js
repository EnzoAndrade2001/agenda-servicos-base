const agendamentos = require('../models/agendamentos');
const clientes = require('../models/clientes');
const pagamentos = require('../models/pagamentos');
const asaas = require('../services/asaas');
const whatsapp = require('../services/whatsappCloud');
const business = require('../config/business');
const { HttpError } = require('../utils/httpError');
const validacao = require('../utils/validation');
const regrasPagamento = require('../utils/paymentRules');

function tipoPagamentoParaCobranca(tipoCobranca) {
    return tipoCobranca === 'total' ? 'total' : 'sinal';
}

function metodoOnline(metodo) {
    return ['pix_online', 'cartao_online'].includes(metodo);
}

function pagamentoOnlineConfigurado(metodo) {
    return metodoOnline(metodo) && asaas.estaConfigurado();
}

function formatarDataHora(value) {
    return new Date(value).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function moeda(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function metodoLabel(value) {
    return ({
        pix_manual: 'Pix na hora',
        dinheiro: 'Dinheiro na hora',
        pix_online: 'Pix online',
        cartao_online: 'Cartao online'
    })[value] || value;
}

function numeroNotificacaoAdmin() {
    return process.env.WHATSAPP_ADMIN_NOTIFY_NUMBER || process.env.WHATSAPP_BUSINESS_NUMBER || null;
}

function montarMensagemAdmin({ agendamento, cliente }) {
    const negocio = business.dadosNegocio();
    return [
        `Novo pedido de horario pelo site ${negocio.nome}.`,
        '',
        `Cliente: ${cliente.nome}`,
        `WhatsApp: ${cliente.telefone}`,
        `Servico: ${agendamento.servico_nome}`,
        `Data: ${formatarDataHora(agendamento.inicio)}`,
        `Valor: ${moeda(agendamento.preco)}`,
        `Pagamento: ${metodoLabel(agendamento.metodo_pagamento_preferido)}`,
        '',
        'Esse pedido esta aguardando aprovacao no painel admin.'
    ].join('\n');
}

function whatsappUrlAdmin(texto) {
    const numero = numeroNotificacaoAdmin();
    if (!numero) return null;
    return `https://wa.me/${String(numero).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;
}

async function avisarAdminPedidoManual({ agendamento, cliente }) {
    const texto = montarMensagemAdmin({ agendamento, cliente });
    const para = numeroNotificacaoAdmin();
    if (!para) return { enviado: false, url: null };
    try {
        await whatsapp.enviarTexto({ para: String(para).replace(/\D/g, ''), texto });
        return { enviado: true, url: whatsappUrlAdmin(texto) };
    } catch (error) {
        console.error('Erro ao avisar admin no WhatsApp:', error);
        return { enviado: false, url: whatsappUrlAdmin(texto) };
    }
}

function dadosPixAsaas(pix) {
    return {
        qr_code: pix && pix.payload,
        qr_code_base64: pix && pix.encodedImage,
        ticket_url: null,
        expiration_date: pix && pix.expirationDate
    };
}

function cpfCnpj(value) {
    const digitos = String(value || '').replace(/\D/g, '');
    if (![11, 14].includes(digitos.length)) {
        throw new HttpError(400, 'Informe CPF ou CNPJ para gerar o pagamento online.');
    }
    return digitos;
}

async function obterOuCriarCliente({ nome, telefone, email }) {
    const existente = await clientes.buscarPorTelefone(telefone);
    if (!existente) return clientes.criar({ nome, telefone, email });
    const atualizacoes = {};
    if (existente.nome !== nome) atualizacoes.nome = nome;
    if (email && existente.email !== email) atualizacoes.email = email;
    if (!Object.keys(atualizacoes).length) return existente;
    return clientes.atualizar(existente.id, atualizacoes);
}

async function agendar(req, res) {
    await pagamentos.expirarReservasOnlinePendentes();
    const metodoSolicitado = req.body.metodo_pagamento_preferido || 'pix_online';
    const nome = validacao.texto(req.body.nome, 'nome', { max: 120 });
    const telefone = validacao.telefone(req.body.telefone);
    const email = validacao.email(req.body.email, { obrigatorio: metodoOnline(metodoSolicitado) });
    const inicio = validacao.data(req.body.inicio);
    if (inicio <= new Date()) throw new HttpError(400, 'O agendamento deve ser feito em uma data futura.');

    const tipoCobranca = regrasPagamento.validarTipoCobranca(req.body.tipo_cobranca || 'sinal_30');
    const metodoPreferido = regrasPagamento.validarMetodoPreferido(metodoSolicitado);
    regrasPagamento.validarCombinacao(tipoCobranca, metodoPreferido);
    if (metodoOnline(metodoPreferido) && !pagamentoOnlineConfigurado(metodoPreferido)) {
        throw new HttpError(503, 'Pagamento online ainda nao configurado para esse metodo.');
    }

    const cliente = await obterOuCriarCliente({ nome, telefone, email });
    const online = metodoOnline(metodoPreferido);
    const documentoPagamento = online ? cpfCnpj(req.body.cpf_cnpj) : null;
    const agendamento = await agendamentos.criar({
        cliente_id: cliente.id,
        servico_id: validacao.id(req.body.servico_id, 'servico_id'),
        inicio,
        observacoes: validacao.texto(req.body.observacoes, 'observacoes', { obrigatorio: false, max: 1000 }),
        permitir_conflito: false,
        origem_publica: true,
        aprovacao_pendente: !online,
        tipo_cobranca: tipoCobranca,
        metodo_pagamento_preferido: metodoPreferido
    });

    if (!online) {
        const avisoWhatsapp = await avisarAdminPedidoManual({ agendamento, cliente });
        return res.status(201).json({ agendamento, pagamento: null, aviso_whatsapp: avisoWhatsapp });
    }

    const tipo = tipoPagamentoParaCobranca(tipoCobranca);
    const valor = tipo === 'sinal' ? agendamento.valor_sinal : agendamento.preco;
    if (valor <= 0) throw new HttpError(400, 'Valor de cobranca deve ser maior que zero.');

    let atualizado;
    let pix = null;
    try {
        const pagamento = await pagamentos.criarPendente({
            agendamento_id: agendamento.id,
            valor,
            provedor: 'asaas',
            metodo: metodoPreferido,
            tipo
        });
        if (metodoPreferido === 'pix_online') {
            const cobranca = await asaas.criarPagamentoPix({
                agendamento,
                pagamento,
                cliente,
                cpfCnpj: documentoPagamento
            });
            pix = dadosPixAsaas(cobranca.pix);
            atualizado = await pagamentos.atualizar(pagamento.id, {
                status: asaas.mapearStatus(cobranca.payment.status),
                asaas_payment_id: cobranca.payment.id,
                checkout_url: cobranca.payment.invoiceUrl,
                payload: asaas.payloadSeguro(cobranca)
            });
            if (atualizado.status === 'pago') await pagamentos.sincronizarAgendamento(undefined, agendamento.id);
        } else if (metodoPreferido === 'cartao_online') {
            const cobranca = await asaas.criarPagamentoCartao({
                agendamento,
                pagamento,
                cliente,
                cpfCnpj: documentoPagamento
            });
            atualizado = await pagamentos.atualizar(pagamento.id, {
                status: asaas.mapearStatus(cobranca.payment.status),
                asaas_payment_id: cobranca.payment.id,
                checkout_url: cobranca.payment.invoiceUrl,
                payload: asaas.payloadSeguro(cobranca)
            });
            if (atualizado.status === 'pago') await pagamentos.sincronizarAgendamento(undefined, agendamento.id);
        }
    } catch (error) {
        await agendamentos.remover(agendamento.id);
        throw error;
    }

    res.status(201).json({
        agendamento,
        pagamento: {
            ...atualizado,
            pix
        }
    });
}

module.exports = { agendar };
