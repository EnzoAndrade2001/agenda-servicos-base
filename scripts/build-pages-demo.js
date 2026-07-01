const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'docs');

function copyRecursive(source, target) {
    const stat = fs.statSync(source);
    if (stat.isDirectory()) {
        fs.mkdirSync(target, { recursive: true });
        for (const entry of fs.readdirSync(source)) {
            copyRecursive(path.join(source, entry), path.join(target, entry));
        }
        return;
    }
    fs.copyFileSync(source, target);
}

function rewriteRootHtml(html) {
    return html
        .replaceAll('href="/icon.svg', 'href="icon.svg')
        .replaceAll('src="/icon.svg', 'src="icon.svg')
        .replaceAll('href="/produto.css', 'href="produto.css')
        .replaceAll('src="/produto.js', 'src="produto.js')
        .replaceAll('href="/produto"', 'href="./"')
        .replaceAll('href="/demo"', 'href="demo/"')
        .replaceAll('href="/admin"', 'href="admin.html"');
}

function rewriteDemoHtml(html) {
    return html
        .replaceAll('href="/"', 'href="../"')
        .replaceAll('href="/icon.svg', 'href="../icon.svg')
        .replaceAll('href="/manifest.webmanifest', 'href="../manifest.webmanifest')
        .replaceAll('href="/styles.css', 'href="../styles.css')
        .replaceAll('src="/lookbook-', 'src="../lookbook-')
        .replaceAll('src="/pwa-mode.js', 'src="../pwa-mode.js')
        .replaceAll('src="/custom-select.js', 'src="../custom-select.js')
        .replaceAll('src="/servicos.js', 'src="../servicos.js');
}

function rewriteAdminHtml(html) {
    return html
        .replaceAll('href="/"', 'href="./"')
        .replaceAll('href="/admin"', 'href="admin.html"')
        .replaceAll('href="/icon.svg', 'href="icon.svg')
        .replaceAll('href="/manifest-admin.webmanifest', 'href="manifest-admin.webmanifest')
        .replaceAll('href="/styles.css', 'href="styles.css')
        .replaceAll('src="/pwa-mode.js', 'src="pwa-mode.js')
        .replaceAll('src="/custom-select.js', 'src="custom-select.js')
        .replaceAll('src="/app.js', 'src="app.js');
}

function rewriteProductJs(js) {
    return js.replace("botao.href = '/admin';", "botao.href = 'admin.html';");
}

fs.mkdirSync(distDir, { recursive: true });
for (const entry of fs.readdirSync(distDir)) {
    if (entry.toLowerCase().endsWith('.md')) continue;
    fs.rmSync(path.join(distDir, entry), { recursive: true, force: true });
}
copyRecursive(publicDir, distDir);
fs.mkdirSync(path.join(distDir, 'demo'), { recursive: true });

const produtoHtml = fs.readFileSync(path.join(publicDir, 'produto.html'), 'utf8');
fs.writeFileSync(path.join(distDir, 'index.html'), rewriteRootHtml(produtoHtml));

const demoHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
fs.writeFileSync(path.join(distDir, 'demo', 'index.html'), rewriteDemoHtml(demoHtml));

const adminHtml = fs.readFileSync(path.join(publicDir, 'admin.html'), 'utf8');
fs.writeFileSync(path.join(distDir, 'admin.html'), rewriteAdminHtml(adminHtml));

const produtoJs = fs.readFileSync(path.join(publicDir, 'produto.js'), 'utf8');
fs.writeFileSync(path.join(distDir, 'produto.js'), rewriteProductJs(produtoJs));

fs.writeFileSync(path.join(distDir, '.nojekyll'), '');
fs.writeFileSync(
    path.join(distDir, 'README.txt'),
    'Demo estatica do AgendaPro gerada para GitHub Pages via pasta /docs. Backend, banco e pagamentos reais exigem deploy Node.\n'
);

console.log(`Demo estatica gerada em ${distDir}`);
