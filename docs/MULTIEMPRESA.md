# Caminho para multiempresa

A base atual foi desenhada para o modelo mais simples de venda: um deploy e um
banco por cliente. Esse modelo e mais facil de operar no inicio, reduz risco de
vazamento entre clientes e permite personalizar cada projeto rapidamente.

Quando houver varios clientes ativos, o proximo passo pode ser transformar a
aplicacao em multiempresa real.

## O que muda

- Criar tabela `tenants` ou `empresas`.
- Adicionar `tenant_id` em clientes, servicos, agendamentos, bloqueios,
  pagamentos, repasses e configuracoes.
- Resolver tenant por dominio, subdominio ou slug.
- Isolar autenticacao por empresa.
- Separar credenciais Asaas, WhatsApp e OpenAI por empresa.
- Garantir indices compostos com `tenant_id`.
- Revisar todos os endpoints para filtrar por `tenant_id`.
- Criar testes contra vazamento de dados entre empresas.

## Quando vale fazer

Considere multiempresa quando:

- houver muitos clientes para manter deploys separados;
- existir necessidade de painel central do dono da plataforma;
- atualizacoes individuais comecarem a dar trabalho;
- houver estrategia clara de assinatura/SaaS.

Antes disso, o modelo um deploy por cliente costuma ser mais barato, simples e
seguro para vender os primeiros projetos.
