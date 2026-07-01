const express = require('express');
const path = require('path');
const routes = require('./routes');
const business = require('./config/business');
const { HttpError } = require('./utils/httpError');

function splitOrigins(value) {
    return String(value || '')
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean);
}

function allowedOrigins() {
    return new Set([
        ...splitOrigins(process.env.CORS_ORIGIN),
        ...splitOrigins(process.env.PUBLIC_BASE_URL)
    ].filter((origin) => origin !== '*'));
}

function sameOrigin(req, origin) {
    if (!origin) return true;
    const host = req.get('host');
    return origin === `https://${host}` || origin === `http://${host}`;
}

function applySecurityHeaders(req, res, next) {
    const isProd = process.env.NODE_ENV === 'production';
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self'",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join('; ')
    });
    if (isProd) {
        res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
}

function applyCors(req, res, next) {
    const origin = req.get('origin');
    const allowed = allowedOrigins();
    const explicitlyAllowed = origin && allowed.has(origin.replace(/\/$/, ''));
    if (sameOrigin(req, origin) || explicitlyAllowed) {
        if (origin) {
            res.set('Access-Control-Allow-Origin', origin);
            res.set('Vary', 'Origin');
        }
        res.set({
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
            'Access-Control-Allow-Credentials': 'true'
        });
        if (req.method === 'OPTIONS') return res.status(204).end();
        return next();
    }
    if (req.method === 'OPTIONS') return res.status(403).end();
    return next();
}

function createApp() {
    const app = express();
    const adminPath = process.env.ADMIN_PATH || '/admin';
    const publicDir = path.join(__dirname, '..', 'public');
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.use(express.json({ limit: '100kb' }));
    app.use(applySecurityHeaders);
    app.use(applyCors);

    app.get('/admin.html', (req, res) => res.status(404).send('Not found'));
    app.get('/app.js', (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.sendFile(path.join(publicDir, 'app.js'));
    });
    app.get('/robots.txt', (req, res) => {
        const baseUrl = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
        res.type('text/plain').send([
            'User-agent: *',
            `Disallow: ${adminPath}`,
            'Disallow: /api/',
            `Sitemap: ${baseUrl}/sitemap.xml`,
            ''
        ].join('\n'));
    });
    app.get('/sitemap.xml', (req, res) => {
        const baseUrl = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
        res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/servicos</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
    });
    app.get('/manifest.webmanifest', (req, res) => {
        const negocio = business.dadosNegocio();
        res.type('application/manifest+json').json({
            name: negocio.nome,
            short_name: negocio.nome_curto,
            start_url: '/',
            scope: '/',
            display: 'standalone',
            orientation: 'portrait',
            background_color: '#fff3f6',
            theme_color: '#ffdce7',
            description: `Agendamento online de ${negocio.nome}.`,
            categories: ['beauty', 'business', 'lifestyle'],
            icons: [
                { src: '/icon-180.png?v=1', sizes: '180x180', type: 'image/png', purpose: 'any' },
                { src: '/icon-512.png?v=1', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
                { src: '/icon.svg?v=2', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
            ],
            shortcuts: [
                { name: 'Horarios', short_name: 'Horarios', url: '/#horarios', description: 'Ver horarios disponiveis' },
                { name: 'Servicos', short_name: 'Servicos', url: '/#servicos', description: 'Ver servicos e valores' },
                { name: 'Painel admin', short_name: 'Admin', url: adminPath, description: 'Abrir painel administrativo' }
            ]
        });
    });
    app.get('/manifest-admin.webmanifest', (req, res) => {
        const negocio = business.dadosNegocio();
        res.type('application/manifest+json').json({
            name: `${negocio.nome} Admin`,
            short_name: `${negocio.nome_curto} Admin`.slice(0, 24),
            start_url: adminPath,
            scope: '/',
            display: 'standalone',
            orientation: 'portrait',
            background_color: '#fff3f6',
            theme_color: '#ffdce7',
            description: `Painel administrativo da agenda ${negocio.nome}.`,
            categories: ['business', 'productivity'],
            icons: [
                { src: '/icon-180.png?v=1', sizes: '180x180', type: 'image/png', purpose: 'any' },
                { src: '/icon-512.png?v=1', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
                { src: '/icon.svg?v=2', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
            ],
            shortcuts: [
                { name: 'Agenda do dia', short_name: 'Agenda', url: `${adminPath}#agenda`, description: 'Abrir agenda do dia' },
                { name: 'Novo horario', short_name: 'Agendar', url: `${adminPath}#novo-horario`, description: 'Criar novo horario' },
                { name: 'Repasses', short_name: 'Repasse', url: `${adminPath}#repasse`, description: 'Abrir area de repasse' }
            ]
        });
    });
    app.get(adminPath, (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.sendFile(path.join(publicDir, 'admin.html'));
    });
    if (adminPath !== '/admin') {
        app.get('/admin', (req, res) => res.status(404).send('Not found'));
    }
    app.use(express.static(publicDir));
    app.get('/servicos', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
    app.get('/api/health', (req, res) => res.json({ ok: true }));
    app.get('/api', (req, res) => res.json({
        endpoints: [
            '/api/clientes', '/api/servicos', '/api/agendamentos',
            '/api/bloqueios', '/api/disponibilidade', '/api/disponibilidade/grade',
            '/api/lembretes/retorno', '/api/resumo', '/api/configuracoes'
        ]
    }));
    app.use('/api', routes);
    app.use((req, res, next) => next(new HttpError(404, 'Rota nao encontrada.')));
    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        if (error.type === 'entity.parse.failed') {
            return res.status(400).json({ erro: 'JSON invalido.' });
        }
        if (error.code === '23505') {
            return res.status(409).json({ erro: 'Ja existe um cadastro com esses dados.' });
        }
        if (error.code === '23503') {
            return res.status(409).json({ erro: 'O registro esta em uso e nao pode ser removido.' });
        }
        const status = error.status || 500;
        if (status === 500) console.error(error);
        return res.status(status).json({
            erro: status === 500 ? 'Erro interno do servidor.' : error.message,
            ...(error.details ? { detalhes: error.details } : {})
        });
    });
    return app;
}

module.exports = { createApp };
