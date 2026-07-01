const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PREVIEW_PORT || 3100);
const HOST = process.env.PREVIEW_HOST || '127.0.0.1';
const root = path.join(__dirname, '..', 'public');
const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function resolveFile(url) {
    const clean = decodeURIComponent(String(url || '/').split('?')[0]);
    let file = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
    if (file === 'admin') file = 'admin.html';
    if (file === 'produto') file = 'produto.html';
    if (file === 'demo') file = 'index.html';
    const target = path.normalize(path.join(root, file));
    return target.startsWith(root) ? target : null;
}

http.createServer((req, res) => {
    const target = resolveFile(req.url);
    if (!target) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    fs.readFile(target, (error, data) => {
        if (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
        }
        res.writeHead(200, {
            'Content-Type': types[path.extname(target)] || 'application/octet-stream',
            'Cache-Control': 'no-store'
        });
        res.end(data);
    });
}).listen(PORT, HOST, () => {
    console.log(`Preview estatico em http://${HOST}:${PORT}`);
});
