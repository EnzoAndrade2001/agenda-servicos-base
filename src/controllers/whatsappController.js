const atendimento = require('../services/whatsappAtendimento');
const whatsapp = require('../services/whatsappCloud');
const business = require('../config/business');
const { HttpError } = require('../utils/httpError');

function verificarWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    throw new HttpError(403, 'Token de verificacao do WhatsApp invalido.');
}

function mensagensDoPayload(body) {
    const mensagens = [];
    for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
            const value = change.value || {};
            const contacts = value.contacts || [];
            for (const message of value.messages || []) {
                if (message.type !== 'text' || !message.text || !message.text.body) continue;
                const contato = contacts.find((item) => item.wa_id === message.from) || {};
                mensagens.push({
                    from: message.from,
                    text: message.text.body,
                    name: contato.profile && contato.profile.name
                });
            }
        }
    }
    return mensagens;
}

async function receberWebhook(req, res) {
    res.status(200).json({ recebido: true });
    const mensagens = mensagensDoPayload(req.body);
    for (const mensagem of mensagens) {
        try {
            const resposta = await atendimento.responder({
                telefone: mensagem.from,
                nomeContato: mensagem.name,
                mensagem: mensagem.text
            });
            await whatsapp.enviarTexto({ para: mensagem.from, texto: resposta });
        } catch (error) {
            console.error('Erro no atendimento do WhatsApp:', error);
            try {
                await whatsapp.enviarTexto({
                    para: mensagem.from,
                    texto: `Tive um problema para processar sua mensagem. ${business.dadosNegocio().proprietaria} vai te responder assim que puder.`
                });
            } catch (sendError) {
                console.error('Erro ao avisar cliente no WhatsApp:', sendError);
            }
        }
    }
}

module.exports = { verificarWebhook, receberWebhook };
