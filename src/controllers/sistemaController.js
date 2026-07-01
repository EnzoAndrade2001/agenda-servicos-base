const { pool } = require('../config/database');
const configuracoes = require('../models/configuracoes');
const negocioConfiguracoes = require('../models/negocioConfiguracoes');
const pagamentos = require('../models/pagamentos');
const repasses = require('./repassesController');
const { HttpError } = require('../utils/httpError');
const validacao = require('../utils/validation');

function dataLocal(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new HttpError(400, 'A data deve estar no formato AAAA-MM-DD.');
    }
    const parsed = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
        throw new HttpError(400, 'Data invalida.');
    }
    return value;
}

function pagamentoOnlineConfigurado() {
    return Boolean(process.env.ASAAS_API_KEY);
}

async function infoPublica(req, res) {
    const whatsapp = process.env.WHATSAPP_BUSINESS_NUMBER || null;
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || null;
    const pagamentoConfigurado = pagamentoOnlineConfigurado();
    const negocio = await negocioConfiguracoes.buscar();
    res.json({
        nome: negocio.nome,
        subtitulo: negocio.subtitulo,
        negocio,
        whatsapp,
        setup: {
            whatsapp_configurado: Boolean(whatsapp),
            pagamento_online_configurado: pagamentoConfigurado,
            public_base_url_configurada: Boolean(publicBaseUrl),
            public_base_url_https: Boolean(publicBaseUrl && publicBaseUrl.startsWith('https://')),
            pix_disponivel: pagamentoConfigurado,
            repasse_destino_padrao: repasses.resumoDestinoPadrao()
        }
    });
}

async function disponibilidade(req, res) {
    await pagamentos.expirarReservasOnlinePendentes();
    const dia = dataLocal(req.query.data);
    const servicoId = validacao.id(req.query.servico_id, 'servico_id');
    const result = await pool.query(
        `SELECT slot.inicio
         FROM configuracoes c
         JOIN servicos s ON s.id = $2 AND s.ativo
         CROSS JOIN LATERAL generate_series(
             (($1::date + c.horario_abertura) AT TIME ZONE 'America/Sao_Paulo'),
             (($1::date + c.horario_fechamento) AT TIME ZONE 'America/Sao_Paulo')
                 - make_interval(mins => s.duracao_minutos),
             make_interval(mins => c.intervalo_minutos)
         ) AS slot(inicio)
         WHERE EXTRACT(ISODOW FROM $1::date)::smallint = ANY(c.dias_funcionamento)
           AND slot.inicio >= NOW()
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
         ORDER BY slot.inicio`,
        [dia, servicoId]
    );
    res.json(result.rows.map((row) => row.inicio));
}

async function gradeDisponibilidade(req, res) {
    await pagamentos.expirarReservasOnlinePendentes();
    const dia = dataLocal(req.query.data);
    const servicoId = validacao.id(req.query.servico_id, 'servico_id');
    const result = await pool.query(
        `SELECT
            slot.inicio,
            slot.inicio + make_interval(mins => s.duracao_minutos) AS fim,
            EXISTS (
                SELECT 1 FROM agendamentos a
                WHERE a.status NOT IN ('cancelado', 'faltou')
                  AND a.inicio < slot.inicio + make_interval(mins => s.duracao_minutos)
                  AND a.fim > slot.inicio
            ) AS ocupado,
            EXISTS (
                SELECT 1 FROM bloqueios b
                WHERE b.inicio < slot.inicio + make_interval(mins => s.duracao_minutos)
                  AND b.fim > slot.inicio
            ) AS bloqueado,
            FALSE AS fora_jornada
         FROM configuracoes c
         JOIN servicos s ON s.id = $2 AND s.ativo
         CROSS JOIN LATERAL generate_series(
             (($1::date + c.horario_abertura) AT TIME ZONE 'America/Sao_Paulo'),
             (($1::date + c.horario_fechamento) AT TIME ZONE 'America/Sao_Paulo')
                 - make_interval(mins => s.duracao_minutos),
             make_interval(mins => c.intervalo_minutos)
         ) AS slot(inicio)
         WHERE EXTRACT(ISODOW FROM $1::date)::smallint = ANY(c.dias_funcionamento)
         ORDER BY slot.inicio`,
        [dia, servicoId]
    );
    const agora = new Date();
    res.json(result.rows.map((row) => {
        const passado = new Date(row.inicio) < agora;
        const motivo = passado ? 'passado' : (
            row.fora_jornada ? 'fora da jornada de atendimento' : (row.bloqueado ? 'bloqueado' : (row.ocupado ? 'ocupado' : null))
        );
        return {
            inicio: row.inicio,
            fim: row.fim,
            disponivel: !motivo,
            motivo
        };
    }));
}

async function horariosDisponiveis(req, res) {
    await pagamentos.expirarReservasOnlinePendentes();
    const dia = dataLocal(req.query.data);
    const result = await pool.query(
        `WITH cfg AS (
            SELECT *
            FROM configuracoes
            LIMIT 1
        ),
        slots AS (
            SELECT slot.inicio
            FROM cfg c
            CROSS JOIN LATERAL generate_series(
                (($1::date + c.horario_abertura) AT TIME ZONE 'America/Sao_Paulo'),
                (($1::date + c.horario_fechamento) AT TIME ZONE 'America/Sao_Paulo')
                    - make_interval(mins => c.intervalo_minutos),
                make_interval(mins => c.intervalo_minutos)
            ) AS slot(inicio)
            WHERE EXTRACT(ISODOW FROM $1::date)::smallint = ANY(c.dias_funcionamento)
              AND EXISTS (
                  SELECT 1
                  FROM servicos s
                  WHERE s.ativo
                    AND slot.inicio + make_interval(mins => s.duracao_minutos)
                        <= (($1::date + c.horario_fechamento) AT TIME ZONE 'America/Sao_Paulo')
              )
        )
        SELECT
            slots.inicio,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', svc.id,
                        'nome', svc.nome,
                        'descricao', svc.descricao,
                        'categoria', svc.categoria,
                        'duracao_minutos', svc.duracao_minutos,
                        'preco', svc.preco::float
                    )
                    ORDER BY svc.duracao_minutos, svc.nome
                ) FILTER (WHERE svc.id IS NOT NULL),
                '[]'::json
            ) AS servicos
        FROM slots
        CROSS JOIN cfg c
        LEFT JOIN LATERAL (
            SELECT s.*
            FROM servicos s
            WHERE s.ativo
              AND slots.inicio >= NOW()
              AND slots.inicio + make_interval(mins => s.duracao_minutos)
                  <= (($1::date + c.horario_fechamento) AT TIME ZONE 'America/Sao_Paulo')
              AND NOT EXISTS (
                  SELECT 1 FROM agendamentos a
                  WHERE a.status NOT IN ('cancelado', 'faltou')
                    AND a.inicio < slots.inicio + make_interval(mins => s.duracao_minutos)
                    AND a.fim > slots.inicio
              )
              AND NOT EXISTS (
                  SELECT 1 FROM bloqueios b
                  WHERE b.inicio < slots.inicio + make_interval(mins => s.duracao_minutos)
                    AND b.fim > slots.inicio
              )
        ) svc ON TRUE
        GROUP BY slots.inicio
        ORDER BY slots.inicio`,
        [dia]
    );
    res.json(result.rows.map((row) => ({
        inicio: row.inicio,
        disponivel: row.servicos.length > 0,
        servicos: row.servicos,
        motivo: row.servicos.length ? null : 'sem servicos disponiveis'
    })));
}

async function lembretesRetorno(req, res) {
    const result = await pool.query(
        `SELECT a.id AS agendamento_id, a.inicio, a.fim, a.preco::float AS preco,
                c.id AS cliente_id, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
                s.nome AS servico_nome,
                a.lembrete_retorno_em::text AS data_retorno,
                a.lembrete_retorno_observacoes,
                (a.lembrete_retorno_em - CURRENT_DATE)::int AS dias_restantes
         FROM agendamentos a
         JOIN clientes c ON c.id = a.cliente_id
         JOIN servicos s ON s.id = a.servico_id
         WHERE a.lembrete_retorno_em IS NOT NULL
           AND a.lembrete_retorno_concluido = FALSE
           AND a.lembrete_retorno_em BETWEEN CURRENT_DATE - INTERVAL '30 days'
               AND CURRENT_DATE + INTERVAL '7 days'
           AND NOT EXISTS (
               SELECT 1 FROM agendamentos futuro
               WHERE futuro.cliente_id = a.cliente_id
                 AND futuro.status NOT IN ('cancelado', 'faltou')
                 AND futuro.inicio > a.inicio
           )
         ORDER BY data_retorno, a.inicio
         LIMIT 30`
    );
    res.json(result.rows);
}

async function resumo(req, res) {
    const dia = dataLocal(req.query.data || new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo'
    }).format(new Date()));
    const result = await pool.query(
        `SELECT
            COUNT(*) FILTER (WHERE status NOT IN ('cancelado', 'faltou'))::int AS total,
            COUNT(*) FILTER (WHERE status = 'confirmado')::int AS confirmados,
            COUNT(*) FILTER (WHERE status = 'concluido')::int AS concluidos,
            COALESCE(SUM(valor_pago), 0)::float AS faturamento,
            COUNT(*) FILTER (WHERE pagamento_status = 'pago')::int AS pagos,
            COUNT(*) FILTER (WHERE pagamento_status IN ('pendente', 'parcial'))::int AS pagamentos_pendentes,
            COALESCE(SUM(valor_pago), 0)::float AS recebido,
            COUNT(*) FILTER (WHERE status = 'cancelado')::int AS cancelados
         FROM agendamentos
         WHERE inicio >= $1::date AND inicio < $1::date + INTERVAL '1 day'`,
        [dia]
    );
    res.json({ data: dia, ...result.rows[0] });
}

async function buscarConfiguracoes(req, res) {
    res.json(await configuracoes.buscar());
}

async function buscarNegocio(req, res) {
    res.json(await negocioConfiguracoes.buscar());
}

async function atualizarNegocio(req, res) {
    const valores = {};
    const regras = {
        nome: 120,
        nome_curto: 40,
        proprietaria: 80,
        inicial: 2,
        segmento: 120,
        subtitulo: 240,
        regiao: 120,
        frase_agendamento: 240,
        local_titulo: 160,
        local_descricao: 240
    };
    for (const [campo, max] of Object.entries(regras)) {
        if (req.body[campo] !== undefined) {
            valores[campo] = validacao.texto(req.body[campo], campo, { max });
        }
    }
    if (valores.inicial) valores.inicial = valores.inicial.slice(0, 1).toUpperCase();
    if (!Object.keys(valores).length) throw new HttpError(400, 'Nenhuma configuracao valida foi enviada.');
    res.json(await negocioConfiguracoes.atualizar(valores));
}

async function atualizarConfiguracoes(req, res) {
    const valores = {};
    if (req.body.intervalo_minutos !== undefined) {
        valores.intervalo_minutos = validacao.inteiro(req.body.intervalo_minutos, 'intervalo_minutos', 5, 120);
    }
    for (const campo of ['horario_abertura', 'horario_fechamento']) {
        if (req.body[campo] !== undefined) {
            if (typeof req.body[campo] !== 'string' || !/^\d{2}:\d{2}$/.test(req.body[campo])) {
                throw new HttpError(400, `${campo} deve estar no formato HH:MM.`);
            }
            valores[campo] = req.body[campo];
        }
    }
    if (req.body.dias_funcionamento !== undefined) {
        const dias = req.body.dias_funcionamento;
        if (!Array.isArray(dias) || !dias.length || dias.some((dia) => !Number.isInteger(dia) || dia < 1 || dia > 7)) {
            throw new HttpError(400, 'dias_funcionamento deve conter numeros de 1 (segunda) a 7 (domingo).');
        }
        valores.dias_funcionamento = [...new Set(dias)];
    }
    if (!Object.keys(valores).length) throw new HttpError(400, 'Nenhuma configuracao valida foi enviada.');
    const atuais = await configuracoes.buscar();
    const abertura = valores.horario_abertura || atuais.horario_abertura.slice(0, 5);
    const fechamento = valores.horario_fechamento || atuais.horario_fechamento.slice(0, 5);
    if (fechamento <= abertura) throw new HttpError(400, 'O horario de fechamento deve ser posterior a abertura.');
    res.json(await configuracoes.atualizar(valores));
}

module.exports = {
    infoPublica,
    disponibilidade,
    gradeDisponibilidade,
    horariosDisponiveis,
    lembretesRetorno,
    resumo,
    buscarConfiguracoes,
    atualizarConfiguracoes,
    buscarNegocio,
    atualizarNegocio
};
