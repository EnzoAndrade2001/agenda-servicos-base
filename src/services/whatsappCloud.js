const { HttpError } = require('../utils/httpError');

function estaConfigurado() {
    return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

async function enviarTexto({ para, texto }) {
    if (!estaConfigurado()) {
        console.log(`[WhatsApp IA] Resposta para ${para}: ${texto}`);
        return null;
    }
    const response = await fetch(
        `https://graph.facebook.com/v20.0/${encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID)}/messages`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: para,
                type: 'text',
                text: { preview_url: false, body: texto }
            })
        }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new HttpError(response.status, data.error && data.error.message ? data.error.message : 'Erro ao enviar WhatsApp.', data);
    }
    return data;
}

module.exports = { estaConfigurado, enviarTexto };
