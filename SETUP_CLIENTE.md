# Checklist para novo cliente

Use este roteiro sempre que clonar a base para um novo negocio.

## 1. Criar o projeto

- Criar repositorio privado para o cliente.
- Clonar `agenda-servicos-base`.
- Trocar o nome do projeto no Render.
- Criar banco PostgreSQL separado no Neon.
- Nunca reutilizar banco, Asaas, WhatsApp ou `.env` de outro cliente.

## 2. Identidade

Configurar no Render como padrao inicial ou ajustar depois no painel admin, na
aba `Negocio`:

```env
BUSINESS_NAME="Nome do Negocio"
BUSINESS_SHORT_NAME="Nome Curto"
BUSINESS_OWNER_NAME="Responsavel"
BUSINESS_INITIAL=N
BUSINESS_SEGMENT="Segmento do negocio"
BUSINESS_SUBTITLE="Frase curta sobre o atendimento."
BUSINESS_REGION="Cidade, bairro ou regiao"
BUSINESS_BOOKING_TEXT="Texto exibido na area de horarios."
BUSINESS_LOCATION_TITLE="Titulo da localidade"
BUSINESS_LOCATION_DESCRIPTION="Como o endereco/atendimento sera combinado."
```

## 3. Admin

- Definir `ADMIN_PATH` com caminho dificil de adivinhar.
- Rodar `npm run hash:admin`.
- Configurar `ADMIN_USER`.
- Configurar `ADMIN_PASSWORD_HASH`.
- Configurar `ADMIN_SESSION_SECRET`.
- Nao usar `DISABLE_ADMIN_AUTH` em producao.

## 4. Agenda

- Ajustar dias de funcionamento no painel.
- Ajustar horario de abertura/fechamento no painel.
- Ajustar intervalo entre horarios.
- Cadastrar servicos reais.
- Conferir duracao e preco de cada servico.
- Criar bloqueios de teste.
- Testar conflito entre agendamentos.

## 5. Pagamentos Asaas

- Criar conta Asaas do cliente ou definir o fluxo financeiro combinado.
- Configurar `ASAAS_ENV=production`.
- Configurar `ASAAS_API_KEY`.
- Configurar `ASAAS_WEBHOOK_TOKEN`.
- Configurar webhook:

```text
https://dominio-do-cliente.com/api/webhooks/asaas?token=ASAAS_WEBHOOK_TOKEN
```

- Configurar `BUSINESS_PIX_KEY_TYPE`.
- Configurar `BUSINESS_PIX_KEY`.
- Fazer teste real de Pix pequeno.
- Fazer teste de cartao, se estiver habilitado no Asaas.

## 6. WhatsApp

- Configurar `WHATSAPP_BUSINESS_NUMBER` para links simples.
- Para automacao/IA, configurar WhatsApp Cloud API:
  - `WHATSAPP_VERIFY_TOKEN`
  - `WHATSAPP_ACCESS_TOKEN`
  - `WHATSAPP_PHONE_NUMBER_ID`
- Configurar webhook:

```text
https://dominio-do-cliente.com/api/webhooks/whatsapp
```

- Se usar IA, configurar `OPENAI_API_KEY` e `OPENAI_MODEL`.

## 7. Testes antes de entregar

- Abrir site publico no celular.
- Criar reserva Pix online.
- Nao pagar e confirmar se a reserva expira.
- Pagar Pix real e confirmar se webhook atualiza pagamento.
- Criar reserva para pagamento na hora.
- Confirmar se admin consegue editar/remarcar/cancelar.
- Excluir cliente de teste.
- Instalar PWA no celular.
- Testar login admin no celular.
