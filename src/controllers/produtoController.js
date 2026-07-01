function info(req, res) {
    res.json({
        product_name: process.env.PRODUCT_NAME || 'AgendaPro',
        sales_whatsapp: process.env.SALES_WHATSAPP_NUMBER
            ? String(process.env.SALES_WHATSAPP_NUMBER).replace(/\D/g, '')
            : null,
        sales_email: process.env.SALES_EMAIL || null
    });
}

module.exports = { info };
