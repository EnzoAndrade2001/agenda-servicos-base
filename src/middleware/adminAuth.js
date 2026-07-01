const crypto = require('crypto');
const { HttpError } = require('../utils/httpError');

const COOKIE_NAME = 'karina_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const SCRYPT_KEY_LENGTH = 64;
const attempts = new Map();

function producao() {
    return process.env.NODE_ENV === 'production';
}

function authDesabilitadaParaTeste() {
    return process.env.DISABLE_ADMIN_AUTH === 'true' && !producao();
}

function credenciaisConfiguradas() {
    return Boolean(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_TOKEN);
}

function adminProtegido() {
    if (authDesabilitadaParaTeste()) return false;
    return true;
}

function sessionSecret() {
    return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_TOKEN || null;
}

function cookieSeguro() {
    return producao()
        || (process.env.PUBLIC_BASE_URL || '').startsWith('https://');
}

function parseCookies(header = '') {
    return Object.fromEntries(header.split(';').map((item) => {
        const [key, ...value] = item.trim().split('=');
        return [key, decodeURIComponent(value.join('='))];
    }).filter(([key]) => key));
}

function assinar(payload) {
    const secret = sessionSecret();
    if (!secret) throw new Error('Credenciais administrativas nao configuradas.');
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64url');
}

function safeEqualText(a = '', b = '') {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
}

function validarSenhaHash(senha, hashConfig) {
    const [algoritmo, salt, hash] = String(hashConfig || '').split('$');
    if (algoritmo !== 'scrypt' || !salt || !hash) return false;
    const senhaHash = crypto.scryptSync(String(senha || ''), salt, SCRYPT_KEY_LENGTH).toString('base64url');
    return safeEqualText(senhaHash, hash);
}

function credenciaisValidas(body = {}) {
    if (!credenciaisConfiguradas()) return false;
    if (process.env.ADMIN_USER && !safeEqualText(body.usuario || '', process.env.ADMIN_USER)) return false;
    if (process.env.ADMIN_PASSWORD_HASH) return validarSenhaHash(body.token, process.env.ADMIN_PASSWORD_HASH);
    return Boolean(process.env.ADMIN_TOKEN) && safeEqualText(body.token || '', process.env.ADMIN_TOKEN);
}

function criarSessao() {
    const payload = Buffer.from(JSON.stringify({
        iat: Date.now(),
        exp: Date.now() + SESSION_SECONDS * 1000
    })).toString('base64url');
    return `${payload}.${assinar(payload)}`;
}

function sessaoValida(req) {
    if (!adminProtegido()) return true;
    if (!credenciaisConfiguradas()) return false;
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    if (!token || !token.includes('.')) return false;
    const [payload, signature] = token.split('.');
    const expected = assinar(payload);
    if (signature.length !== expected.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        return Number(data.exp) > Date.now();
    } catch (error) {
        return false;
    }
}

function setSessionCookie(res) {
    const secure = cookieSeguro() ? '; Secure' : '';
    res.setHeader(
        'Set-Cookie',
        `${COOKIE_NAME}=${encodeURIComponent(criarSessao())}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}${secure}`
    );
}

function clearSessionCookie(res) {
    const secure = cookieSeguro() ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
}

function clientKey(req) {
    return req.ip || req.socket.remoteAddress || 'unknown';
}

function registrarFalha(req) {
    const key = clientKey(req);
    const now = Date.now();
    const current = attempts.get(key);
    if (!current || current.resetAt < now) {
        attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return;
    }
    current.count += 1;
}

function muitasTentativas(req) {
    const current = attempts.get(clientKey(req));
    return Boolean(current && current.resetAt > Date.now() && current.count >= MAX_ATTEMPTS);
}

function limparTentativas(req) {
    attempts.delete(clientKey(req));
}

function exigirAdmin(req, res, next) {
    if (!adminProtegido() || sessaoValida(req)) return next();
    return next(new HttpError(401, 'Acesso administrativo nao autorizado.'));
}

function statusAdmin(req, res) {
    res.json({
        protegido: adminProtegido(),
        autenticado: sessaoValida(req),
        usuario_obrigatorio: Boolean(process.env.ADMIN_USER)
    });
}

function loginAdmin(req, res, next) {
    if (!adminProtegido()) return res.json({ autenticado: true });
    if (!credenciaisConfiguradas()) {
        return next(new HttpError(503, 'Login administrativo nao configurado no servidor.'));
    }
    if (muitasTentativas(req)) {
        return next(new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'));
    }
    if (!credenciaisValidas(req.body)) {
        registrarFalha(req);
        return next(new HttpError(401, 'Usuario ou senha administrativa invalida.'));
    }
    limparTentativas(req);
    setSessionCookie(res);
    res.json({ autenticado: true });
}

function logoutAdmin(req, res) {
    clearSessionCookie(res);
    res.status(204).end();
}

module.exports = {
    exigirAdmin,
    statusAdmin,
    loginAdmin,
    logoutAdmin
};
