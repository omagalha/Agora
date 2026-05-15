-- ============================================================
-- ÁGORA — Schema Multi-Tenant
-- Isolamento por campanha_id (tenant_id semântico)
-- Compatível com: vereadores, prefeitos, deputados estaduais/federais
-- ============================================================

-- ============================================================
-- EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- busca fuzzy em nomes

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE cargo_tipo AS ENUM (
  'vereador',
  'prefeito',
  'vice_prefeito',
  'deputado_estadual',
  'deputado_federal',
  'senador',
  'governador'
);

CREATE TYPE perfil_usuario AS ENUM (
  'admin',
  'coordenacao',
  'coordenador_territorial',
  'equipe_rua',
  'atendimento',
  'candidato'
);

CREATE TYPE grau_apoio AS ENUM (
  'apoiador_forte',
  'apoiador_moderado',
  'simpatizante',
  'indeciso',
  'opositor',
  'nao_classificado'
);

CREATE TYPE influencia_nivel AS ENUM (
  'baixa',
  'media',
  'alta'
);

CREATE TYPE territorio_tipo AS ENUM (
  'estado',
  'municipio',
  'zona_eleitoral',
  'bairro',
  'distrito',
  'comunidade',
  'rua'
);

CREATE TYPE demanda_status AS ENUM (
  'registrada',
  'analise',
  'encaminhada',
  'respondida',
  'resolvida'
);

CREATE TYPE interacao_tipo AS ENUM (
  'visita',
  'reuniao',
  'ligacao',
  'whatsapp',
  'evento',
  'retorno'
);

CREATE TYPE lideranca_tipo AS ENUM (
  'comunitario',
  'religioso',
  'esportivo',
  'empresario',
  'juventude',
  'educacao',
  'saude',
  'sindical',
  'outro'
);

CREATE TYPE evento_tipo AS ENUM (
  'caminhada',
  'reuniao',
  'evento',
  'live',
  'visita',
  'agenda_religiosa',
  'agenda_esportiva',
  'entrevista',
  'outro'
);

-- ============================================================
-- CAMPANHAS (tenant raiz)
-- ============================================================
CREATE TABLE campanhas (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            text NOT NULL,
  candidato_nome  text NOT NULL,
  cargo           cargo_tipo NOT NULL,
  municipio       text,
  uf              char(2) NOT NULL,
  partido         text,
  numero_urna     text,
  ativa           boolean NOT NULL DEFAULT true,
  configuracoes   jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- USUÁRIOS ↔ CAMPANHAS (junction multi-campanha)
-- Um usuário pode ser coordenador de várias campanhas
-- ============================================================
CREATE TABLE usuarios_campanhas (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campanha_id     uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  perfil          perfil_usuario NOT NULL DEFAULT 'equipe_rua',
  nome_exibicao   text,
  ativo           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, campanha_id)
);

-- ============================================================
-- TERRITÓRIOS
-- Hierarquia: estado → município → zona → bairro → comunidade
-- Deputados usam zonas eleitorais; vereadores usam bairros
-- ============================================================
CREATE TABLE territorios (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id     uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  nome            text NOT NULL,
  tipo            territorio_tipo NOT NULL DEFAULT 'bairro',
  parent_id       uuid REFERENCES territorios(id) ON DELETE SET NULL,
  responsavel_id  uuid REFERENCES usuarios_campanhas(id) ON DELETE SET NULL,
  codigo_ibge     text,
  zona_eleitoral  text,
  meta_contatos   integer,
  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PESSOAS (contatos — coração do sistema)
-- ============================================================
CREATE TABLE pessoas (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id           uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  territorio_id         uuid REFERENCES territorios(id) ON DELETE SET NULL,

  -- Dados pessoais
  nome                  text NOT NULL,
  cpf                   text,
  data_nascimento       date,
  foto_url              text,

  -- Contato
  telefone              text,
  whatsapp              text,
  email                 text,

  -- Endereço
  endereco              text,
  bairro                text,
  municipio             text,
  uf                    char(2),
  cep                   text,

  -- Dados eleitorais
  zona_eleitoral        text,
  secao_eleitoral       text,
  titulo_eleitor        text,

  -- Classificação política
  grau_apoio            grau_apoio NOT NULL DEFAULT 'nao_classificado',
  influencia            influencia_nivel NOT NULL DEFAULT 'baixa',
  categoria             text,                -- ex: "líder comunitário", "empresário"
  capacidade_mobilizacao text[],            -- ex: ["igreja", "juventude"]

  -- Gestão
  responsavel_id        uuid REFERENCES usuarios_campanhas(id) ON DELETE SET NULL,
  observacoes           text,
  tags                  text[],

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- LIDERANÇAS (perfil estendido de pessoas com influência)
-- ============================================================
CREATE TABLE liderancas (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id     uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  pessoa_id       uuid NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  tipo            lideranca_tipo NOT NULL DEFAULT 'outro',
  descricao       text,
  estimativa_votos integer,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campanha_id, pessoa_id)
);

-- ============================================================
-- INTERAÇÕES (histórico completo de relacionamento)
-- ============================================================
CREATE TABLE interacoes (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id     uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  pessoa_id       uuid NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  tipo            interacao_tipo NOT NULL,
  descricao       text,
  data_interacao  timestamptz NOT NULL DEFAULT now(),
  retorno_em      timestamptz,
  retorno_feito   boolean DEFAULT false,
  usuario_id      uuid REFERENCES usuarios_campanhas(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- DEMANDAS (reclamações → inteligência territorial)
-- ============================================================
CREATE TABLE demandas (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id     uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  pessoa_id       uuid REFERENCES pessoas(id) ON DELETE SET NULL,
  territorio_id   uuid REFERENCES territorios(id) ON DELETE SET NULL,

  titulo          text NOT NULL,
  descricao       text,
  categoria       text NOT NULL,  -- saúde, iluminação, estrada, etc.
  status          demanda_status NOT NULL DEFAULT 'registrada',

  responsavel_id  uuid REFERENCES usuarios_campanhas(id) ON DELETE SET NULL,
  resolucao       text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- AGENDA
-- ============================================================
CREATE TABLE agenda_eventos (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id     uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  titulo          text NOT NULL,
  tipo            evento_tipo NOT NULL DEFAULT 'outro',
  descricao       text,
  local           text,
  data_inicio     timestamptz NOT NULL,
  data_fim        timestamptz,
  responsavel_id  uuid REFERENCES usuarios_campanhas(id) ON DELETE SET NULL,
  confirmado      boolean DEFAULT false,
  presenca_total  integer,
  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOG (LGPD — rastreabilidade completa)
-- ============================================================
CREATE TABLE audit_log (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campanha_id     uuid REFERENCES campanhas(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tabela          text NOT NULL,
  registro_id     uuid NOT NULL,
  operacao        text NOT NULL CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE')),
  dados_antes     jsonb,
  dados_depois    jsonb,
  ip              text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ÍNDICES (performance para deputados com +100k contatos)
-- ============================================================

-- Pessoas: buscas mais comuns
CREATE INDEX idx_pessoas_campanha      ON pessoas(campanha_id);
CREATE INDEX idx_pessoas_grau_apoio    ON pessoas(campanha_id, grau_apoio);
CREATE INDEX idx_pessoas_territorio    ON pessoas(campanha_id, territorio_id);
CREATE INDEX idx_pessoas_responsavel   ON pessoas(responsavel_id);
CREATE INDEX idx_pessoas_nome_trgm     ON pessoas USING gin(nome gin_trgm_ops);
CREATE INDEX idx_pessoas_whatsapp      ON pessoas(campanha_id, whatsapp) WHERE whatsapp IS NOT NULL;

-- Territórios
CREATE INDEX idx_territorios_campanha  ON territorios(campanha_id);
CREATE INDEX idx_territorios_parent    ON territorios(parent_id);

-- Demandas
CREATE INDEX idx_demandas_campanha     ON demandas(campanha_id);
CREATE INDEX idx_demandas_status       ON demandas(campanha_id, status);
CREATE INDEX idx_demandas_categoria    ON demandas(campanha_id, categoria);
CREATE INDEX idx_demandas_territorio   ON demandas(territorio_id);

-- Interações
CREATE INDEX idx_interacoes_campanha   ON interacoes(campanha_id);
CREATE INDEX idx_interacoes_pessoa     ON interacoes(pessoa_id);
CREATE INDEX idx_interacoes_retorno    ON interacoes(campanha_id, retorno_em) WHERE retorno_feito = false;

-- Agenda
CREATE INDEX idx_agenda_campanha       ON agenda_eventos(campanha_id);
CREATE INDEX idx_agenda_data           ON agenda_eventos(campanha_id, data_inicio);

-- Audit
CREATE INDEX idx_audit_campanha        ON audit_log(campanha_id);
CREATE INDEX idx_audit_tabela          ON audit_log(tabela, registro_id);

-- ============================================================
-- FUNÇÕES AUXILIARES (schema public — auth é reservado no Supabase)
-- ============================================================

-- Retorna array com todas as campanha_ids do usuário autenticado
CREATE OR REPLACE FUNCTION public.minhas_campanhas()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    array_agg(campanha_id),
    '{}'::uuid[]
  )
  FROM usuarios_campanhas
  WHERE user_id = auth.uid()
    AND ativo = true;
$$;

-- Campanha ativa da sessão (setada no middleware após login)
CREATE OR REPLACE FUNCTION public.campanha_atual()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.campanha_id', true), '')::uuid;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- Políticas granulares por operação — ver migration 004 para detalhes.
-- ============================================================

ALTER TABLE campanhas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pessoas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE liderancas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacoes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_eventos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;

-- Função: retorna true se o usuário é admin ou coordenacao na campanha
CREATE OR REPLACE FUNCTION public.is_gestor(p_campanha_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_campanhas
    WHERE user_id = auth.uid() AND campanha_id = p_campanha_id
      AND perfil IN ('admin', 'coordenacao') AND ativo = true
  );
$$;

-- CAMPANHAS: leitura livre por membros; escrita restrita a gestores
CREATE POLICY "camp_select"        ON campanhas FOR SELECT USING (id = ANY(public.minhas_campanhas()));
CREATE POLICY "camp_insert_deny"   ON campanhas FOR INSERT WITH CHECK (false);
CREATE POLICY "camp_update_gestor" ON campanhas FOR UPDATE USING (id = ANY(public.minhas_campanhas()) AND public.is_gestor(id));
CREATE POLICY "camp_delete_deny"   ON campanhas FOR DELETE USING (false);

-- USUARIOS_CAMPANHAS: sem auto-promoção; INSERT/DELETE via RPC
CREATE POLICY "uc_select"        ON usuarios_campanhas FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "uc_insert_deny"   ON usuarios_campanhas FOR INSERT WITH CHECK (false);
CREATE POLICY "uc_update_gestor" ON usuarios_campanhas FOR UPDATE
  USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id) AND user_id <> auth.uid());
CREATE POLICY "uc_delete_deny"   ON usuarios_campanhas FOR DELETE USING (false);

-- TERRITÓRIOS: gestores gerenciam; demais só leem
CREATE POLICY "terr_select"        ON territorios FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "terr_insert_gestor" ON territorios FOR INSERT WITH CHECK (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));
CREATE POLICY "terr_update_gestor" ON territorios FOR UPDATE USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));
CREATE POLICY "terr_delete_gestor" ON territorios FOR DELETE USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));

-- PESSOAS: todos leem/escrevem; somente gestores apagam
CREATE POLICY "pess_select"        ON pessoas FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "pess_insert"        ON pessoas FOR INSERT WITH CHECK (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "pess_update"        ON pessoas FOR UPDATE USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "pess_delete_gestor" ON pessoas FOR DELETE USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));

-- LIDERANÇAS
CREATE POLICY "lid_select"        ON liderancas FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "lid_insert"        ON liderancas FOR INSERT WITH CHECK (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "lid_update"        ON liderancas FOR UPDATE USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "lid_delete_gestor" ON liderancas FOR DELETE USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));

-- INTERAÇÕES
CREATE POLICY "int_select"        ON interacoes FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "int_insert"        ON interacoes FOR INSERT WITH CHECK (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "int_update"        ON interacoes FOR UPDATE USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "int_delete_gestor" ON interacoes FOR DELETE USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));

-- DEMANDAS
CREATE POLICY "dem_select"        ON demandas FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "dem_insert"        ON demandas FOR INSERT WITH CHECK (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "dem_update"        ON demandas FOR UPDATE USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "dem_delete_gestor" ON demandas FOR DELETE USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));

-- AGENDA
CREATE POLICY "age_select"        ON agenda_eventos FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "age_insert"        ON agenda_eventos FOR INSERT WITH CHECK (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "age_update"        ON agenda_eventos FOR UPDATE USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "age_delete_gestor" ON agenda_eventos FOR DELETE USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));

-- CONVITES: gestores criam e cancelam
CREATE POLICY "conv_select"        ON convites FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "conv_insert_gestor" ON convites FOR INSERT WITH CHECK (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));
CREATE POLICY "conv_update_gestor" ON convites FOR UPDATE USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));

-- AUDIT: somente admin/coordenacao lêem; INSERT apenas via triggers (SECURITY DEFINER)
CREATE POLICY "audit_select_admin" ON audit_log FOR SELECT
  USING (campanha_id = ANY(public.minhas_campanhas()) AND EXISTS (
    SELECT 1 FROM usuarios_campanhas WHERE user_id = auth.uid()
      AND campanha_id = audit_log.campanha_id AND perfil IN ('admin','coordenacao') AND ativo = true
  ));
CREATE POLICY "audit_insert_deny" ON audit_log FOR INSERT WITH CHECK (false);

-- AUDIT: somente admins leem
CREATE POLICY "audit_admin" ON audit_log
  FOR SELECT USING (
    campanha_id = ANY(public.minhas_campanhas())
    AND EXISTS (
      SELECT 1 FROM usuarios_campanhas uc
      WHERE uc.user_id = auth.uid()
        AND uc.campanha_id = audit_log.campanha_id
        AND uc.perfil = 'admin'
    )
  );

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_campanhas_updated
  BEFORE UPDATE ON campanhas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pessoas_updated
  BEFORE UPDATE ON pessoas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_demandas_updated
  BEFORE UPDATE ON demandas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_liderancas_updated
  BEFORE UPDATE ON liderancas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER: audit log genérico (LGPD)
-- Cobre pessoas, campanhas, usuarios_campanhas, convites, demandas
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old jsonb; v_new jsonb; v_campanha_id uuid; v_registro_id uuid;
BEGIN
  v_old := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END;
  v_new := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END;
  v_campanha_id := COALESCE(
    (v_new->>'campanha_id')::uuid, (v_old->>'campanha_id')::uuid,
    (v_new->>'id')::uuid, (v_old->>'id')::uuid
  );
  v_registro_id := COALESCE((v_new->>'id')::uuid, (v_old->>'id')::uuid);
  INSERT INTO audit_log(campanha_id, user_id, tabela, registro_id, operacao, dados_antes, dados_depois)
  VALUES (v_campanha_id, auth.uid(), TG_TABLE_NAME, v_registro_id, TG_OP, v_old, v_new);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_pessoas
  AFTER INSERT OR UPDATE OR DELETE ON pessoas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

CREATE TRIGGER trg_audit_campanhas
  AFTER INSERT OR UPDATE OR DELETE ON campanhas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

CREATE TRIGGER trg_audit_uc
  AFTER INSERT OR UPDATE OR DELETE ON usuarios_campanhas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

CREATE TRIGGER trg_audit_convites
  AFTER INSERT OR UPDATE OR DELETE ON convites
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

CREATE TRIGGER trg_audit_demandas
  AFTER INSERT OR UPDATE OR DELETE ON demandas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- Resumo por território (base para o mapa)
CREATE OR REPLACE VIEW vw_territorio_resumo
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.campanha_id,
  t.nome,
  t.tipo,
  t.parent_id,
  COUNT(p.id)                                          AS total_contatos,
  COUNT(p.id) FILTER (WHERE p.grau_apoio IN ('apoiador_forte','apoiador_moderado')) AS apoiadores,
  COUNT(p.id) FILTER (WHERE p.grau_apoio = 'indeciso') AS indecisos,
  COUNT(p.id) FILTER (WHERE p.grau_apoio = 'opositor') AS opositores,
  COUNT(l.id)                                          AS liderancas
FROM territorios t
LEFT JOIN pessoas p ON p.territorio_id = t.id AND p.campanha_id = t.campanha_id
LEFT JOIN liderancas l ON l.pessoa_id = p.id
GROUP BY t.id, t.campanha_id, t.nome, t.tipo, t.parent_id;

-- Top demandas por categoria
CREATE OR REPLACE VIEW vw_demandas_categoria
WITH (security_invoker = true) AS
SELECT
  campanha_id,
  territorio_id,
  categoria,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'resolvida') AS resolvidas
FROM demandas
GROUP BY campanha_id, territorio_id, categoria;
