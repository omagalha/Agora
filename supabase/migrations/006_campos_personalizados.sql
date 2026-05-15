-- ============================================================
-- AGORA - Migration 006: Campos personalizados por campanha
-- Inspirado em CRMs maduros: definicoes controladas por gestores
-- e valores isolados por tenant via RLS.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campo_personalizado_entidade') THEN
    CREATE TYPE campo_personalizado_entidade AS ENUM (
      'pessoas',
      'demandas',
      'liderancas'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campo_personalizado_tipo') THEN
    CREATE TYPE campo_personalizado_tipo AS ENUM (
      'texto',
      'numero',
      'data',
      'booleano',
      'opcao'
    );
  END IF;
END $$;

ALTER TABLE pessoas
  ADD COLUMN IF NOT EXISTS campos_personalizados jsonb NOT NULL DEFAULT '{}';

ALTER TABLE demandas
  ADD COLUMN IF NOT EXISTS campos_personalizados jsonb NOT NULL DEFAULT '{}';

ALTER TABLE liderancas
  ADD COLUMN IF NOT EXISTS campos_personalizados jsonb NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS campos_personalizados (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id     uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  entidade        campo_personalizado_entidade NOT NULL,
  chave           text NOT NULL,
  rotulo          text NOT NULL,
  tipo            campo_personalizado_tipo NOT NULL DEFAULT 'texto',
  opcoes          text[] NOT NULL DEFAULT '{}',
  obrigatorio     boolean NOT NULL DEFAULT false,
  ativo           boolean NOT NULL DEFAULT true,
  ordem           integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campanha_id, entidade, chave),
  CONSTRAINT campos_personalizados_chave_format
    CHECK (chave ~ '^[a-z][a-z0-9_]{1,39}$'),
  CONSTRAINT campos_personalizados_rotulo_len
    CHECK (length(trim(rotulo)) BETWEEN 2 AND 80)
);

CREATE INDEX IF NOT EXISTS idx_campos_personalizados_campanha
  ON campos_personalizados(campanha_id, entidade, ativo, ordem);

CREATE INDEX IF NOT EXISTS idx_pessoas_campos_personalizados
  ON pessoas USING gin(campos_personalizados);

CREATE INDEX IF NOT EXISTS idx_demandas_campos_personalizados
  ON demandas USING gin(campos_personalizados);

CREATE INDEX IF NOT EXISTS idx_liderancas_campos_personalizados
  ON liderancas USING gin(campos_personalizados);

ALTER TABLE campos_personalizados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cp_select" ON campos_personalizados;
DROP POLICY IF EXISTS "cp_insert_gestor" ON campos_personalizados;
DROP POLICY IF EXISTS "cp_update_gestor" ON campos_personalizados;
DROP POLICY IF EXISTS "cp_delete_gestor" ON campos_personalizados;

CREATE POLICY "cp_select" ON campos_personalizados
  FOR SELECT
  USING (campanha_id = ANY(public.minhas_campanhas()));

CREATE POLICY "cp_insert_gestor" ON campos_personalizados
  FOR INSERT
  WITH CHECK (
    campanha_id = ANY(public.minhas_campanhas())
    AND public.is_gestor(campanha_id)
  );

CREATE POLICY "cp_update_gestor" ON campos_personalizados
  FOR UPDATE
  USING (
    campanha_id = ANY(public.minhas_campanhas())
    AND public.is_gestor(campanha_id)
  )
  WITH CHECK (
    campanha_id = ANY(public.minhas_campanhas())
    AND public.is_gestor(campanha_id)
  );

-- Historico preservado: remocao logica por ativo = false.
CREATE POLICY "cp_delete_gestor" ON campos_personalizados
  FOR DELETE
  USING (false);

DROP TRIGGER IF EXISTS trg_campos_personalizados_updated ON campos_personalizados;
CREATE TRIGGER trg_campos_personalizados_updated
  BEFORE UPDATE ON campos_personalizados
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_audit_campos_personalizados ON campos_personalizados;
CREATE TRIGGER trg_audit_campos_personalizados
  AFTER INSERT OR UPDATE OR DELETE ON campos_personalizados
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();
