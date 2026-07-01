const { pool } = require('../config/database');

const colunas = `id, provedor, valor::float AS valor, pix_chave_tipo, pix_chave_mascarada,
    descricao, status, asaas_transfer_id, payload, criado_em, atualizado_em`;

async function listar() {
    const result = await pool.query(`SELECT ${colunas} FROM repasses ORDER BY criado_em DESC LIMIT 50`);
    return result.rows;
}

async function criar({ valor, pix_chave_tipo, pix_chave_mascarada, descricao }) {
    const result = await pool.query(
        `INSERT INTO repasses (valor, pix_chave_tipo, pix_chave_mascarada, descricao)
         VALUES ($1, $2, $3, $4) RETURNING ${colunas}`,
        [valor, pix_chave_tipo, pix_chave_mascarada, descricao]
    );
    return result.rows[0];
}

async function atualizar(id, campos) {
    const entries = Object.entries(campos).filter(([, value]) => value !== undefined);
    if (!entries.length) {
        const result = await pool.query(`SELECT ${colunas} FROM repasses WHERE id = $1`, [id]);
        return result.rows[0] || null;
    }
    const sets = entries.map(([chave], index) => `${chave} = $${index + 1}`);
    const values = entries.map(([, value]) => value);
    values.push(id);
    const result = await pool.query(
        `UPDATE repasses SET ${sets.join(', ')}, atualizado_em = NOW()
         WHERE id = $${values.length} RETURNING ${colunas}`,
        values
    );
    return result.rows[0] || null;
}

module.exports = { listar, criar, atualizar };
