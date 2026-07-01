async function carregarContato() {
    const botoes = [
        document.querySelector('#salesWhatsappTop'),
        document.querySelector('#salesWhatsappBottom')
    ].filter(Boolean);
    const hint = document.querySelector('#salesContactHint');
    try {
        const response = await fetch('/api/produto');
        if (!response.ok) throw new Error('Contato comercial nao configurado.');
        const data = await response.json();
        if (data.product_name) {
            document.querySelectorAll('[data-product-name]').forEach((node) => {
                node.textContent = data.product_name;
            });
            document.title = `${data.product_name} | Sistema de Agendamento`;
        }
        if (!data.sales_whatsapp) throw new Error('Contato comercial nao configurado.');
        const texto = encodeURIComponent('Oi! Quero conhecer o sistema de agendamento.');
        const url = `https://wa.me/${data.sales_whatsapp}?text=${texto}`;
        botoes.forEach((botao) => {
            botao.href = url;
            botao.textContent = 'Falar no WhatsApp';
            botao.target = '_blank';
            botao.rel = 'noopener';
        });
        if (hint) hint.textContent = 'Fale no WhatsApp para ver planos, implantacao e demo guiada.';
    } catch (error) {
        botoes.forEach((botao) => {
            botao.href = '/admin';
            botao.textContent = 'Ver painel em demo';
        });
        if (hint) hint.textContent = 'Configure SALES_WHATSAPP_NUMBER no ambiente para ativar o botao de WhatsApp desta pagina.';
    }
}

carregarContato();
