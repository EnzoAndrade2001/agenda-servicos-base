# Demo gratuita no GitHub Pages

Use esta opcao quando quiser divulgar uma demo comercial sem pagar hospedagem.

O que funciona:

- Landing comercial do AgendaPro na raiz do site.
- Demo visual do lado cliente em `/demo/`.
- Preview visual do painel em `admin.html`.

O que nao funciona nesta versao estatica:

- Banco de dados.
- Login real do admin.
- Agendamentos persistentes.
- Pix/cartao via Asaas.
- Webhooks.

Para publicar:

1. Abra o repositorio no GitHub.
2. Entre em `Settings` > `Pages`.
3. Em `Build and deployment`, selecione `GitHub Actions`.
4. Va em `Actions`.
5. Rode o workflow `Publicar demo estatica` ou envie um novo commit na branch `main`.

Depois de alguns instantes, a URL ficara parecida com:

```text
https://EnzoAndrade2001.github.io/agenda-servicos-base/
```

Links principais:

```text
/          Landing comercial
/demo/     Demo publica cliente
/admin.html Preview do painel
```

Quando precisar do sistema real com pagamentos e banco, use um deploy Node com PostgreSQL.
