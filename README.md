# Agenda de Servicos Base

Sistema base para agendamento online de servicos, pensado para ser clonado e
personalizado para pequenos negocios que trabalham com hora marcada.

Inclui site publico, painel administrativo mobile-first, agenda com validacao de
conflitos, clientes, servicos, bloqueios, pagamentos via Asaas, repasses Pix,
webhooks e estrutura inicial para atendimento via WhatsApp/IA.

## Principais recursos

- Site publico para clientes escolherem data, horario e servico.
- Painel admin para gerenciar agenda, clientes, servicos, pagamentos e repasses.
- Validacao de conflito por duracao do servico.
- Horarios disponiveis filtrados para nao poluir a tela da cliente.
- Pix e cartao online via Asaas.
- Reservas online pendentes expiram automaticamente.
- Webhook de pagamento Asaas.
- Webhook de WhatsApp Cloud API com interpretacao opcional por OpenAI.
- Instalavel como app/PWA no celular.
- Identidade do negocio configuravel por variaveis `BUSINESS_*`.

## Executar localmente

1. Copie `.env.example` para `.env`.
2. Configure o PostgreSQL local ou `DATABASE_URL`.
3. Instale dependencias:

```bash
npm install
```

4. Inicie:

```bash
npm start
```

Por padrao:

- site publico: `http://localhost:3000`
- painel admin: `http://localhost:3000/admin`
- API: `http://localhost:3000/api`

## Configuracao por cliente

Troque estas variaveis no `.env` ou no Render para personalizar cada negocio:

```env
BUSINESS_NAME="Agenda de Servicos"
BUSINESS_SHORT_NAME="Agenda"
BUSINESS_OWNER_NAME="Equipe"
BUSINESS_INITIAL=A
BUSINESS_SEGMENT="Atendimento com hora marcada"
BUSINESS_SUBTITLE="Agendamento online simples, organizado e com pagamento integrado."
BUSINESS_REGION="Informe sua regiao"
BUSINESS_BOOKING_TEXT="Veja horarios disponiveis e escolha entre os servicos que cabem na agenda."
BUSINESS_LOCATION_TITLE="Atendimento com local combinado"
BUSINESS_LOCATION_DESCRIPTION="Endereco ou forma de atendimento combinados apos a confirmacao."
```

Para cada novo cliente, configure tambem:

- `PUBLIC_BASE_URL`
- `ADMIN_PATH`
- `ADMIN_USER`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `WHATSAPP_BUSINESS_NUMBER`
- `ASAAS_API_KEY`
- `ASAAS_WEBHOOK_TOKEN`
- `BUSINESS_PIX_KEY_TYPE`
- `BUSINESS_PIX_KEY`

Gere senha segura para o painel:

```bash
npm run hash:admin
```

## Deploy gratuito

Uma combinacao simples para comecar:

- Render para o Web Service Node.
- Neon para PostgreSQL gratuito.
- GitHub para versionamento.

O arquivo `render.yaml` ja sobe o Web Service. No Render, preencha as variaveis
marcadas como secretas e configure `PUBLIC_BASE_URL` com a URL final.

Para configurar um cliente novo, siga o roteiro em `SETUP_CLIENTE.md`.

Depois do primeiro deploy, nome publico, responsavel, regiao e textos principais
tambem podem ser ajustados diretamente no painel admin, na aba `Negocio`.

## Pagamentos

Pagamentos online usam Asaas:

- `pix_online`: gera QR Code Pix.
- `cartao_online`: cria link/cobranca online.
- `pix_manual` e `dinheiro`: ficam aguardando aprovacao/confirmacao no admin.

Webhook Asaas:

```text
https://seu-dominio.com/api/webhooks/asaas?token=SEU_ASAAS_WEBHOOK_TOKEN
```

## WhatsApp com IA

Para automacao real no WhatsApp, use WhatsApp Business Platform / Cloud API:

```text
https://seu-dominio.com/api/webhooks/whatsapp
```

Variaveis:

- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Sem `OPENAI_API_KEY`, o atendimento usa um modo guiado simples.

## Rotas principais

| Metodo | Rota | Finalidade |
| --- | --- | --- |
| GET/POST | `/api/clientes` | Listar e cadastrar clientes |
| GET/PATCH/DELETE | `/api/clientes/:id` | Consultar, alterar e arquivar cliente |
| GET/POST | `/api/servicos` | Listar e cadastrar servicos |
| GET/PATCH | `/api/servicos/:id` | Consultar e alterar servico |
| GET/POST | `/api/agendamentos` | Consultar e criar agendamentos |
| GET/PATCH/DELETE | `/api/agendamentos/:id` | Gerenciar agendamento |
| GET/POST | `/api/bloqueios` | Consultar e criar bloqueios |
| DELETE | `/api/bloqueios/:id` | Remover bloqueio |
| GET | `/api/disponibilidade/horarios` | Horarios livres por data |
| GET | `/api/resumo` | Resumo financeiro |
| GET/PATCH | `/api/configuracoes/negocio` | Identidade publica do negocio |
| POST | `/api/publico/agendamentos` | Reserva criada pelo site publico |
| POST | `/api/webhooks/asaas` | Webhook de pagamentos |
| GET/POST | `/api/webhooks/whatsapp` | Webhook de WhatsApp |

## Observacoes de seguranca

- Nao publique `.env`.
- Use `ADMIN_USER`, `ADMIN_PASSWORD_HASH` e `ADMIN_SESSION_SECRET` em producao.
- Configure `ADMIN_PATH` com um caminho dificil de adivinhar.
- Deixe `DISABLE_ADMIN_AUTH` somente para teste local.
- Use chaves Asaas e WhatsApp separadas por cliente.
