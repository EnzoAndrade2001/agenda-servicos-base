const { pool } = require('../config/database');
const agendamentos = require('../models/agendamentos');
const clientes = require('../models/clientes');
const servicosModel = require('../models/servicos');
const openaiAssistant = require('./openaiAssistant');
const business = require('../config/business');

function moeda(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizar(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function formatarHora(value) {
    return new Date(value).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });
}

function telefoneLocal(telefone) {
    return String(telefone || '').replace(/\D/g, '').slice(-11);
}

function dataHoje() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
}

function dataAmanha() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
}

function interpretarFallback(mensagem) {
    const texto = normalizar(mensagem);
    if (/(servico|servicos|valor|preco|quanto|tabela)/.test(texto)) return { intent: 'listar_servicos' };
    if (/(horario|agenda|disponivel|livre|manha|tarde|noite)/.test(texto)) {
        return {
            intent: 'consultar_horarios',
            date: texto.includes('amanha') ? dataAmanha() : dataHoje()
        };
    }
    if (/(oi|ola|bom dia|boa tarde|boa noite)/.test(texto)) return { intent: 'saudacao' };
    return { intent: 'desconhecido' };
}

function encontrarServico(servicos, nome) {
    const alvo = normalizar(nome);
    if (!alvo) return null;
    return servicos.find((servico) => normalizar(servico.nome) === alvo)
        || servicos.find((servico) => normalizar(servico.nome).includes(alvo) || alvo.includes(normalizar(servico.nome)));
}

async function horariosLivres(data, servicoId, limite = 8) {
    const result = await pool.query(
        `SELECT slot.inicio
         FROM configuracoes c
         JOIN servicos s ON s.id = $2 AND s.ativo
         CROSS JOIN LATERAL generate_series(
             (($1::date + c.horario_abertura) AT TIME ZONE 'America/Sao_Paulo'),
             (($1::date + c.horario_fechamento) AT TIME ZONE 'America/Sao_Paulo') - make_interval(mins => s.duracao_minutos),
             make_interval(mins => c.intervalo_minutos)
         ) AS slot(inicio)
         WHERE EXTRACT(ISODOW FROM $1::date)::smallint = ANY(c.dias_funcionamento)
           AND slot.inicio >= NOW()
           AND (
               EXTRACT(ISODOW FROM $1::date)::smallint NOT BETWEEN 1 AND 5
               OR (
                   (slot.inicio AT TIME ZONE 'America/Sao_Paulo')::time < TIME '11:30'
                   AND ((slot.inicio + make_interval(mins => s.duracao_minutos)) AT TIME ZONE 'America/Sao_Paulo')::time <= TIME '11:30'
               )
               OR (slot.inicio AT TIME ZONE 'America/Sao_Paulo')::time >= TIME '19:30'
           )
           AND NOT EXISTS (
               SELECT 1 FROM agendamentos a
               WHERE a.status NOT IN ('cancelado', 'faltou')
                 AND a.inicio < slot.inicio + make_interval(mins => s.duracao_minutos)
                 AND a.fim > slot.inicio
           )
           AND NOT EXISTS (
               SELECT 1 FROM bloqueios b
               WHERE b.inicio < slot.inicio + make_interval(mins => s.duracao_minutos)
                 AND b.fim > slot.inicio
           )
         ORDER BY slot.inicio
         LIMIT $3`,
        [data, servicoId, limite]
    );
    return result.rows.map((row) => row.inicio);
}

function listaServicos(servicos) {
    const negocio = business.dadosNegocio();
    return [
        `Claro! Estes sao os servicos de ${negocio.nome}:`,
        ...servicos.map((servico) => `- ${servico.nome}: ${moeda(servico.preco)} (${servico.duracao_minutos} min)`),
        '',
        'Me diga qual servico, dia e horario voce prefere.'
    ].join('\n');
}

async function obterOuCriarCliente({ nome, telefone }) {
    const telefoneCadastro = telefoneLocal(telefone);
    const existente = await clientes.buscarPorTelefone(telefoneCadastro);
    if (existente) {
        if (nome && normalizar(nome) !== normalizar(existente.nome)) {
            return clientes.atualizar(existente.id, { nome });
        }
        return existente;
    }
    return clientes.criar({
        nome: nome || 'Cliente WhatsApp',
        telefone: telefoneCadastro,
        observacoes: 'Cliente criada pelo atendimento automatico do WhatsApp.'
    });
}

async function criarPedido({ interpretacao, servico, telefone }) {
    const nome = interpretacao.customer_name || 'Cliente WhatsApp';
    const metodo = interpretacao.payment_method === 'dinheiro' ? 'dinheiro' : 'pix_manual';
    const inicio = new Date(`${interpretacao.date}T${interpretacao.time}:00-03:00`);
    const cliente = await obterOuCriarCliente({ nome, telefone });
    return agendamentos.criar({
        cliente_id: cliente.id,
        servico_id: servico.id,
        inicio,
        observacoes: [
            interpretacao.notes,
            'Pedido criado pelo atendimento automatico do WhatsApp.'
        ].filter(Boolean).join('\n'),
        permitir_conflito: false,
        origem_publica: true,
        aprovacao_pendente: true,
        tipo_cobranca: 'pagar_na_hora',
        metodo_pagamento_preferido: metodo
    });
}

async function responder({ telefone, nomeContato, mensagem }) {
    const servicos = await servicosModel.listar();
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const negocio = business.dadosNegocio();
    const interpretacao = await openaiAssistant.interpretarMensagem({ mensagem, servicos, agora, negocio })
        || interpretarFallback(mensagem);
    const servico = encontrarServico(servicos, interpretacao.service_name);

    if (interpretacao.intent === 'listar_servicos') return listaServicos(servicos);
    if (interpretacao.intent === 'saudacao') {
        return `Oi${nomeContato ? `, ${nomeContato}` : ''}! Sou o atendimento automatico de ${negocio.nome}. Posso te mostrar servicos, horarios livres e deixar um pedido de horario para ${negocio.proprietaria} aprovar.`;
    }
    if (interpretacao.intent === 'humano') {
        return `Tudo bem, vou deixar sua mensagem para ${negocio.proprietaria} responder assim que puder.`;
    }
    if (interpretacao.intent === 'consultar_horarios' || interpretacao.intent === 'agendar') {
        if (!servico) return `Qual servico voce quer fazer?\n\n${listaServicos(servicos)}`;
        if (!interpretacao.date) return `Qual dia voce prefere para ${servico.nome}?`;
        const livres = await horariosLivres(interpretacao.date, servico.id);
        if (!livres.length) return `Nao encontrei horario livre para ${servico.nome} nesse dia. Quer tentar outra data?`;
        if (interpretacao.intent !== 'agendar' || !interpretacao.time || !interpretacao.customer_name) {
            return [
                `Tenho estes horarios livres para ${servico.nome}:`,
                livres.map(formatarHora).join(', '),
                '',
                'Para reservar, me envie nome, dia e horario. Ex: "Meu nome e Ana, quero banho de gel dia 06/07 as 14:00".'
            ].join('\n');
        }
        const horarioEscolhido = livres.some((livre) => formatarHora(livre) === interpretacao.time);
        if (!horarioEscolhido) {
            return `Esse horario nao apareceu como livre. Para ${servico.nome}, tenho: ${livres.map(formatarHora).join(', ')}.`;
        }
        const agendamento = await criarPedido({ interpretacao, servico, telefone });
        return `Perfeito! Enviei o pedido para ${negocio.proprietaria} aprovar: ${servico.nome} no dia ${interpretacao.date} as ${formatarHora(agendamento.inicio)}. Assim que ela confirmar, o horario fica certinho na agenda.`;
    }
    return 'Posso te ajudar com servicos, valores e horarios livres. Me diga o servico e o dia que voce prefere.';
}

module.exports = { responder };
