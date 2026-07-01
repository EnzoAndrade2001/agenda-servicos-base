function textoEnv(nome, padrao) {
    const valor = process.env[nome];
    return valor && String(valor).trim() ? String(valor).trim() : padrao;
}

function inicial(nome) {
    const limpa = String(nome || '').trim();
    return limpa ? limpa[0].toUpperCase() : 'A';
}

function dadosNegocio() {
    const nome = textoEnv('BUSINESS_NAME', 'Agenda de Servicos');
    const proprietaria = textoEnv('BUSINESS_OWNER_NAME', 'Equipe');
    return {
        nome,
        nome_curto: textoEnv('BUSINESS_SHORT_NAME', 'Agenda'),
        proprietaria,
        inicial: textoEnv('BUSINESS_INITIAL', inicial(proprietaria || nome)),
        segmento: textoEnv('BUSINESS_SEGMENT', 'Atendimento com hora marcada'),
        subtitulo: textoEnv('BUSINESS_SUBTITLE', 'Agendamento online simples, organizado e com pagamento integrado.'),
        regiao: textoEnv('BUSINESS_REGION', 'Informe sua regiao'),
        frase_agendamento: textoEnv('BUSINESS_BOOKING_TEXT', 'Veja horarios disponiveis e escolha entre os servicos que cabem na agenda.'),
        local_titulo: textoEnv('BUSINESS_LOCATION_TITLE', 'Atendimento com local combinado'),
        local_descricao: textoEnv('BUSINESS_LOCATION_DESCRIPTION', 'Endereco ou forma de atendimento combinados apos a confirmacao.')
    };
}

function descricaoPagamento(tipo, servicoNome) {
    const negocio = dadosNegocio();
    const prefixo = tipo === 'sinal' ? 'Entrada' : 'Pagamento';
    return `${prefixo} ${negocio.nome} - ${servicoNome}`;
}

function descricaoRepasse() {
    return textoEnv('BUSINESS_TRANSFER_DESCRIPTION', `Repasse ${dadosNegocio().nome}`);
}

function pixPadrao() {
    return {
        tipo: process.env.BUSINESS_PIX_KEY_TYPE || null,
        chave: process.env.BUSINESS_PIX_KEY || null
    };
}

module.exports = {
    dadosNegocio,
    descricaoPagamento,
    descricaoRepasse,
    pixPadrao
};
