const { pool } = require('../config/database');
const business = require('../config/business');

const CAMPOS = [
    'nome',
    'nome_curto',
    'proprietaria',
    'inicial',
    'segmento',
    'subtitulo',
    'regiao',
    'frase_agendamento',
    'local_titulo',
    'local_descricao'
];

function mesclarComPadrao(row = {}) {
    const padrao = business.dadosNegocio();
    const dados = { ...padrao };
    for (const campo of CAMPOS) {
        if (row[campo]) dados[campo] = row[campo];
    }
    return dados;
}

async function buscar() {
    const result = await pool.query(
        `SELECT nome, nome_curto, proprietaria, inicial, segmento, subtitulo,
                regiao, frase_agendamento, local_titulo, local_descricao, atualizado_em
         FROM negocio_configuracoes
         WHERE id = 1`
    );
    return mesclarComPadrao(result.rows[0]);
}

async function atualizar(valores) {
    const result = await pool.query(
        `UPDATE negocio_configuracoes SET
            nome = COALESCE($1, nome),
            nome_curto = COALESCE($2, nome_curto),
            proprietaria = COALESCE($3, proprietaria),
            inicial = COALESCE($4, inicial),
            segmento = COALESCE($5, segmento),
            subtitulo = COALESCE($6, subtitulo),
            regiao = COALESCE($7, regiao),
            frase_agendamento = COALESCE($8, frase_agendamento),
            local_titulo = COALESCE($9, local_titulo),
            local_descricao = COALESCE($10, local_descricao),
            atualizado_em = NOW()
         WHERE id = 1
         RETURNING nome, nome_curto, proprietaria, inicial, segmento, subtitulo,
                   regiao, frase_agendamento, local_titulo, local_descricao, atualizado_em`,
        CAMPOS.map((campo) => valores[campo] ?? null)
    );
    return mesclarComPadrao(result.rows[0]);
}

module.exports = { buscar, atualizar, CAMPOS };
