const { HttpError } = require('../utils/httpError');

function estaConfigurado() {
    return Boolean(process.env.OPENAI_API_KEY);
}

function extrairTexto(data) {
    if (typeof data.output_text === 'string') return data.output_text;
    const partes = [];
    for (const item of data.output || []) {
        for (const content of item.content || []) {
            if (content.type === 'output_text' && content.text) partes.push(content.text);
            if (content.type === 'text' && content.text) partes.push(content.text);
        }
    }
    return partes.join('\n').trim();
}

async function interpretarMensagem({ mensagem, servicos, agora, negocio = null }) {
    if (!estaConfigurado()) return null;

    const prompt = [
        `Voce interpreta mensagens de clientes para um negocio chamado ${negocio && negocio.nome ? negocio.nome : 'agenda online'}.`,
        'Responda somente JSON valido, sem markdown.',
        'Campos: intent, service_name, date, time, customer_name, payment_method, notes.',
        'intent deve ser um de: saudacao, listar_servicos, consultar_horarios, agendar, humano, desconhecido.',
        'date deve ser AAAA-MM-DD quando houver data. time deve ser HH:mm quando houver horario.',
        'payment_method deve ser pix_manual, dinheiro ou null.',
        `Agora no fuso America/Sao_Paulo: ${agora}.`,
        'Servicos ativos:',
        ...servicos.map((servico) => `- ${servico.nome}: ${servico.duracao_minutos} min, R$ ${Number(servico.preco).toFixed(2)}`)
    ].join('\n');

    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
            input: [
                { role: 'system', content: prompt },
                { role: 'user', content: mensagem }
            ],
            temperature: 0.1
        })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new HttpError(response.status, data.error && data.error.message ? data.error.message : 'Erro ao chamar OpenAI.');
    }
    const texto = extrairTexto(data);
    try {
        return JSON.parse(texto);
    } catch (error) {
        return { intent: 'desconhecido', notes: texto };
    }
}

module.exports = { estaConfigurado, interpretarMensagem };
