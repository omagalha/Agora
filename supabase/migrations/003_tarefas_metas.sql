-- ============================================================
-- ÁGORA — Módulo de Tarefas e Metas
-- Idempotente: seguro re-executar após falha parcial
-- ============================================================

-- Cleanup de objetos que podem ter ficado de execução anterior
DROP TABLE IF EXISTS tarefas CASCADE;
DROP TABLE IF EXISTS metas   CASCADE;
DROP TYPE  IF EXISTS tarefa_tipo   CASCADE;
DROP TYPE  IF EXISTS tarefa_status CASCADE;
DROP TYPE  IF EXISTS meta_tipo     CASCADE;

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE tarefa_tipo AS ENUM (
  'visita',
  'ligacao',
  'convite_evento',
  'entrega_material',
  'confirmar_apoiador',
  'outro'
);

CREATE TYPE tarefa_status AS ENUM (
  'pendente',
  'em_andamento',
  'concluida',
  'cancelada'
);

CREATE TYPE meta_tipo AS ENUM (
  'apoiadores',
  'visitas',
  'ligacoes',
  'presencas',
  'contatos',
  'outro'
);

-- ============================================================
-- METAS (criada primeiro — tarefas referencia metas)
-- ============================================================
CREATE TABLE metas (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id     uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  titulo          text NOT NULL,
  descricao       text,
  tipo            meta_tipo NOT NULL DEFAULT 'outro',
  valor_alvo      integer NOT NULL DEFAULT 1,
  valor_atual     integer NOT NULL DEFAULT 0,
  responsavel_id  uuid REFERENCES usuarios_campanhas(id) ON DELETE SET NULL,
  territorio_id   uuid REFERENCES territorios(id) ON DELETE SET NULL,
  prazo           date,
  ativa           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TAREFAS
-- ============================================================
CREATE TABLE tarefas (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id     uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  titulo          text NOT NULL,
  descricao       text,
  tipo            tarefa_tipo NOT NULL DEFAULT 'outro',
  status          tarefa_status NOT NULL DEFAULT 'pendente',
  responsavel_id  uuid REFERENCES usuarios_campanhas(id) ON DELETE SET NULL,
  territorio_id   uuid REFERENCES territorios(id) ON DELETE SET NULL,
  meta_id         uuid REFERENCES metas(id) ON DELETE SET NULL,
  prazo           timestamptz,
  concluida_em    timestamptz,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tarefas_campanha" ON tarefas FOR ALL USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "metas_campanha"   ON metas   FOR ALL USING (campanha_id = ANY(public.minhas_campanhas()));

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_tarefas_campanha     ON tarefas(campanha_id);
CREATE INDEX idx_tarefas_responsavel  ON tarefas(responsavel_id);
CREATE INDEX idx_tarefas_status       ON tarefas(campanha_id, status);
CREATE INDEX idx_tarefas_prazo        ON tarefas(campanha_id, prazo);
CREATE INDEX idx_metas_campanha       ON metas(campanha_id);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
CREATE TRIGGER trg_tarefas_updated
  BEFORE UPDATE ON tarefas FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_metas_updated
  BEFORE UPDATE ON metas FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- GRANTS
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas   TO authenticated;
