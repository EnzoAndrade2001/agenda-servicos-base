# Deploy comercial do AgendaPro

Use este roteiro para publicar uma demo comercial do produto.

## 1. Criar Web Service no Render

Repositorio:

```text
https://github.com/EnzoAndrade2001/agenda-servicos-base
```

Configuracao:

- Runtime: Node
- Build command: `npm ci`
- Start command: `npm start`
- Branch: `main`

O `render.yaml` ja vem preparado com o nome `agendapro-demo`.

## 2. Banco

Crie um banco PostgreSQL no Neon e copie a connection string para:

```env
DATABASE_URL=postgresql://...
DB_SSL=true
```

## 3. Variaveis comerciais

No Render, configure:

```env
PUBLIC_BASE_URL=https://sua-url.onrender.com
PRODUCT_LANDING_HOME=true
DEMO_CLIENT_PATH=/demo
PRODUCT_NAME=AgendaPro
SALES_WHATSAPP_NUMBER=55DDDNUMERO
SALES_EMAIL=seu-email@dominio.com
```

Com isso:

- `/` abre a landing comercial do AgendaPro.
- `/produto` tambem abre a landing.
- `/demo` abre a demo publica do lado cliente.
- `ADMIN_PATH` abre o painel admin.

## 4. Admin da demo

Configure:

```env
ADMIN_PATH=/painel-demo-agendapro
ADMIN_USER=admin
ADMIN_PASSWORD_HASH=...
ADMIN_SESSION_SECRET=...
```

Gere o hash localmente:

```bash
npm run hash:admin
```

## 5. Pagamentos e WhatsApp

Para demo comercial, voce pode deixar pagamentos e WhatsApp de atendimento
desativados no inicio. O botao comercial da landing usa apenas
`SALES_WHATSAPP_NUMBER`.

Quando quiser demonstrar fluxo real:

- configure `ASAAS_API_KEY`;
- configure `ASAAS_WEBHOOK_TOKEN`;
- configure `BUSINESS_PIX_KEY_TYPE`;
- configure `BUSINESS_PIX_KEY`;
- configure webhook Asaas para `/api/webhooks/asaas`.
