const repasses = require('../models/repasses');
const asaas = require('../services/asaas');
const business = require('../config/business');
const { HttpError } = require('../utils/httpError');
const validacao = require('../utils/validation');

const tiposChave = ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'];

function tipoChave(value) {
    const tipo = validacao.texto(value, 'pix_chave_tipo', { max: 20 }).toUpperCase();
    if (!tiposChave.includes(tipo)) {
        throw new HttpError(400, `Tipo de chave Pix invalido. Use: ${tiposChave.join(', ')}.`);
    }
    return tipo;
}

function chavePix(value, tipo) {
    const chave = validacao.texto(value, 'pix_chave', { max: 160 });
    if (tipo === 'CPF' || tipo === 'CNPJ') return chave.replace(/\D/g, '');
    if (tipo === 'PHONE') return chave.replace(/\D/g, '');
    return chave;
}

function validarChavePorTipo(chave, tipo) {
    if (tipo === 'CPF' && chave.length !== 11) throw new HttpError(400, 'CPF deve conter 11 digitos.');
    if (tipo === 'CNPJ' && chave.length !== 14) throw new HttpError(400, 'CNPJ deve conter 14 digitos.');
    if (tipo === 'PHONE' && chave.length !== 11) throw new HttpError(400, 'Telefone deve conter DDD e 11 digitos.');
    if (tipo === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chave)) {
        throw new HttpError(400, 'Email da chave Pix invalido.');
    }
    return chave;
}

function mascararChave(chave, tipo) {
    if (tipo === 'EMAIL') {
        const [nome, dominio] = chave.split('@');
        return `${nome.slice(0, 2)}***@${dominio}`;
    }
    if (chave.length <= 8) return `${chave.slice(0, 2)}***`;
    return `${chave.slice(0, 4)}***${chave.slice(-4)}`;
}

function statusTransferencia(status) {
    return ({
        DONE: 'concluido',
        PENDING: 'pendente',
        CANCELLED: 'cancelado',
        FAILED: 'falhou'
    })[status] || 'pendente';
}

async function listar(req, res) {
    res.json(await repasses.listar());
}

function destinoPadrao() {
    const pix = business.pixPadrao();
    if (!pix.chave || !pix.tipo) return null;
    const tipo = tipoChave(pix.tipo);
    const chave = validarChavePorTipo(chavePix(pix.chave, tipo), tipo);
    return { tipo, chave, mascarada: mascararChave(chave, tipo) };
}

function resumoDestinoPadrao() {
    const destino = destinoPadrao();
    return destino ? {
        configurado: true,
        pix_chave_tipo: destino.tipo,
        pix_chave_mascarada: destino.mascarada
    } : { configurado: false };
}

async function criar(req, res) {
    if (!asaas.estaConfigurado()) throw new HttpError(503, 'ASAAS_API_KEY nao configurada.');
    if (req.body.confirmacao !== 'REPASSAR') {
        throw new HttpError(400, 'Digite REPASSAR no campo de confirmacao para executar a transferencia.');
    }
    const valor = validacao.dinheiro(req.body.valor, 'valor');
    if (valor <= 0) throw new HttpError(400, 'Valor de repasse deve ser maior que zero.');
    if (req.body.usar_destino_padrao !== true) {
        throw new HttpError(400, 'Repasse permitido somente para a chave Pix padrao configurada.');
    }
    const destino = destinoPadrao();
    if (!destino) {
        throw new HttpError(400, 'Destino padrao de repasse nao configurado no .env.');
    }
    const tipo = destino.tipo;
    const chave = destino.chave;
    const descricao = validacao.texto(req.body.descricao, 'descricao', { obrigatorio: false, max: 200 })
        || business.descricaoRepasse();
    const repasse = await repasses.criar({
        valor,
        pix_chave_tipo: tipo,
        pix_chave_mascarada: destino.mascarada,
        descricao
    });
    try {
        const transferencia = await asaas.criarTransferenciaPix({
            valor,
            pixAddressKey: chave,
            pixAddressKeyType: tipo,
            descricao
        });
        const atualizado = await repasses.atualizar(repasse.id, {
            status: statusTransferencia(transferencia.status),
            asaas_transfer_id: transferencia.id,
            payload: asaas.payloadTransferenciaSeguro(transferencia)
        });
        res.status(201).json(atualizado);
    } catch (error) {
        await repasses.atualizar(repasse.id, {
            status: 'falhou',
            payload: { erro: error.message, detalhes: error.details || null }
        });
        throw error;
    }
}

module.exports = { listar, criar, resumoDestinoPadrao };
