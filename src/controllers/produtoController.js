function info(req, res) {
    res.json({
        sales_whatsapp: process.env.SALES_WHATSAPP_NUMBER
            ? String(process.env.SALES_WHATSAPP_NUMBER).replace(/\D/g, '')
            : null,
        sales_email: process.env.SALES_EMAIL || null
    });
}

module.exports = { info };
