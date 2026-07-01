const { pool } = require('./database');

const schema = `
CREATE TABLE IF NOT EXISTS clientes (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(160),
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS clientes_telefone_ativo_idx
    ON clientes (telefone) WHERE ativo = TRUE;

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email VARCHAR(160);

CREATE TABLE IF NOT EXISTS servicos (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(60) NOT NULL DEFAULT 'Unhas',
    duracao_minutos INTEGER NOT NULL CHECK (duracao_minutos BETWEEN 15 AND 480),
    preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE servicos ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS categoria VARCHAR(60) NOT NULL DEFAULT 'Unhas';

CREATE TABLE IF NOT EXISTS agendamentos (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES clientes(id),
    servico_id BIGINT NOT NULL REFERENCES servicos(id),
    inicio TIMESTAMPTZ NOT NULL,
    fim TIMESTAMPTZ NOT NULL,
    preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'agendado'
        CHECK (status IN ('agendado', 'confirmado', 'concluido', 'cancelado', 'faltou')),
    pagamento_status VARCHAR(20) NOT NULL DEFAULT 'pendente'
        CHECK (pagamento_status IN ('pendente', 'parcial', 'pago', 'reembolsado', 'cancelado')),
    forma_pagamento VARCHAR(30),
    valor_pago NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (valor_pago >= 0),
    tipo_cobranca VARCHAR(30) NOT NULL DEFAULT 'pagar_na_hora'
        CHECK (tipo_cobranca IN ('sinal_30', 'sinal_50', 'total', 'pagar_na_hora')),
    percentual_sinal INTEGER NOT NULL DEFAULT 0 CHECK (percentual_sinal IN (0, 30, 50, 100)),
    valor_sinal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (valor_sinal >= 0),
    saldo_restante NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (saldo_restante >= 0),
    metodo_pagamento_preferido VARCHAR(30) NOT NULL DEFAULT 'pix_manual'
        CHECK (metodo_pagamento_preferido IN ('pix_online', 'cartao_online', 'pix_manual', 'dinheiro')),
    origem_publica BOOLEAN NOT NULL DEFAULT FALSE,
    aprovacao_pendente BOOLEAN NOT NULL DEFAULT FALSE,
    confirmado_em TIMESTAMPTZ,
    pago_em TIMESTAMPTZ,
    encaixe BOOLEAN NOT NULL DEFAULT FALSE,
    motivo_encaixe VARCHAR(300),
    lembrete_retorno_em DATE,
    lembrete_retorno_observacoes VARCHAR(300),
    lembrete_retorno_concluido BOOLEAN NOT NULL DEFAULT FALSE,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (fim > inicio)
);

ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS pagamento_status VARCHAR(20) NOT NULL DEFAULT 'pendente';
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(30);
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS tipo_cobranca VARCHAR(30) NOT NULL DEFAULT 'pagar_na_hora';
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS percentual_sinal INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS valor_sinal NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS saldo_restante NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS metodo_pagamento_preferido VARCHAR(30) NOT NULL DEFAULT 'pix_manual';
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS origem_publica BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS aprovacao_pendente BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS confirmado_em TIMESTAMPTZ;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS encaixe BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS motivo_encaixe VARCHAR(300);
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS lembrete_retorno_em DATE;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS lembrete_retorno_observacoes VARCHAR(300);
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS lembrete_retorno_concluido BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS agendamentos_inicio_idx ON agendamentos (inicio);
CREATE INDEX IF NOT EXISTS agendamentos_cliente_idx ON agendamentos (cliente_id);
CREATE INDEX IF NOT EXISTS agendamentos_pagamento_status_idx ON agendamentos (pagamento_status);
CREATE INDEX IF NOT EXISTS agendamentos_lembrete_retorno_idx
    ON agendamentos (lembrete_retorno_em) WHERE lembrete_retorno_em IS NOT NULL;

UPDATE agendamentos
SET saldo_restante = GREATEST(preco - valor_pago, 0)
WHERE saldo_restante = 0 AND valor_pago < preco;

CREATE TABLE IF NOT EXISTS pagamentos (
    id BIGSERIAL PRIMARY KEY,
    agendamento_id BIGINT NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
    provedor VARCHAR(30) NOT NULL DEFAULT 'manual',
    metodo VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'parcial', 'pago', 'reembolsado', 'cancelado', 'falhou')),
    tipo VARCHAR(30) NOT NULL DEFAULT 'total'
        CHECK (tipo IN ('sinal', 'total', 'saldo', 'manual')),
    valor NUMERIC(10, 2) NOT NULL CHECK (valor >= 0),
    mercado_pago_preference_id VARCHAR(120),
    mercado_pago_payment_id VARCHAR(120),
    asaas_payment_id VARCHAR(120),
    checkout_url TEXT,
    sandbox_checkout_url TEXT,
    payload JSONB,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS tipo VARCHAR(30) NOT NULL DEFAULT 'total';
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS asaas_payment_id VARCHAR(120);

CREATE INDEX IF NOT EXISTS pagamentos_agendamento_idx ON pagamentos (agendamento_id);
CREATE UNIQUE INDEX IF NOT EXISTS pagamentos_mp_preference_idx
    ON pagamentos (mercado_pago_preference_id) WHERE mercado_pago_preference_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pagamentos_mp_payment_idx
    ON pagamentos (mercado_pago_payment_id) WHERE mercado_pago_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pagamentos_asaas_payment_idx
    ON pagamentos (asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS repasses (
    id BIGSERIAL PRIMARY KEY,
    provedor VARCHAR(30) NOT NULL DEFAULT 'asaas',
    valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
    pix_chave_tipo VARCHAR(20) NOT NULL,
    pix_chave_mascarada VARCHAR(160) NOT NULL,
    descricao VARCHAR(200),
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    asaas_transfer_id VARCHAR(120),
    payload JSONB,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS repasses_asaas_transfer_idx
    ON repasses (asaas_transfer_id) WHERE asaas_transfer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS bloqueios (
    id BIGSERIAL PRIMARY KEY,
    inicio TIMESTAMPTZ NOT NULL,
    fim TIMESTAMPTZ NOT NULL,
    motivo VARCHAR(200),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (fim > inicio)
);

CREATE INDEX IF NOT EXISTS bloqueios_inicio_idx ON bloqueios (inicio);

CREATE TABLE IF NOT EXISTS configuracoes (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    intervalo_minutos INTEGER NOT NULL DEFAULT 30 CHECK (intervalo_minutos BETWEEN 5 AND 120),
    horario_abertura TIME NOT NULL DEFAULT '08:00',
    horario_fechamento TIME NOT NULL DEFAULT '22:30',
    dias_funcionamento SMALLINT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,7],
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO configuracoes (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE configuracoes
    ALTER COLUMN horario_fechamento SET DEFAULT '22:30';

UPDATE configuracoes
SET horario_fechamento = '22:30',
    atualizado_em = NOW()
WHERE id = 1
  AND horario_fechamento <= TIME '19:00';

ALTER TABLE configuracoes
    ALTER COLUMN dias_funcionamento SET DEFAULT ARRAY[1,2,3,4,5,6,7];

UPDATE configuracoes
SET dias_funcionamento = ARRAY[1,2,3,4,5,6,7],
    atualizado_em = NOW()
WHERE id = 1
  AND NOT (7 = ANY(dias_funcionamento));

CREATE TEMP TABLE IF NOT EXISTS servicos_base_padrao (
    nome VARCHAR(100),
    descricao TEXT,
    categoria VARCHAR(60),
    duracao_minutos INTEGER,
    preco NUMERIC(10, 2)
);

TRUNCATE servicos_base_padrao;

INSERT INTO servicos_base_padrao (nome, descricao, categoria, duracao_minutos, preco)
VALUES
    ('Servico rapido', 'Atendimento inicial de curta duracao.', 'Geral', 30, 50.00),
    ('Servico padrao', 'Atendimento principal do negocio.', 'Geral', 60, 100.00),
    ('Servico completo', 'Atendimento completo com mais tempo reservado.', 'Geral', 90, 150.00);

UPDATE servicos s
SET nome = p.nome,
    descricao = p.descricao,
    categoria = p.categoria,
    duracao_minutos = p.duracao_minutos,
    preco = p.preco,
    ativo = TRUE,
    atualizado_em = NOW()
FROM servicos_base_padrao p
WHERE LOWER(s.nome) = LOWER(p.nome);

INSERT INTO servicos (nome, descricao, categoria, duracao_minutos, preco, ativo)
SELECT p.nome, p.descricao, p.categoria, p.duracao_minutos, p.preco, TRUE
FROM servicos_base_padrao p
WHERE NOT EXISTS (
    SELECT 1 FROM servicos s WHERE LOWER(s.nome) = LOWER(p.nome)
);

UPDATE servicos
SET ativo = FALSE,
    atualizado_em = NOW()
WHERE LOWER(nome) NOT IN (
    SELECT LOWER(nome) FROM servicos_base_padrao
);

DROP TABLE IF EXISTS servicos_base_padrao;
`;

async function executarMigracoes() {
    await pool.query(schema);
    console.log('Estrutura do banco verificada.');
}

module.exports = { executarMigracoes };
