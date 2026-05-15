-- ============================================================
-- ÁGORA — Migration 004: RLS Hardening + RPCs Seguros + Audit Completo
-- Aplicar no Supabase SQL Editor. Idempotente via DROP IF EXISTS.
-- ============================================================

-- ============================================================
-- PARTE 1: FUNÇÃO AUXILIAR DE GESTOR (admin ou coordenacao)
-- Usada nas policies como substituta de subconsultas inline,
-- o que reduz o custo de planejamento por query.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_gestor(p_campanha_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_campanhas
    WHERE user_id  = auth.uid()
      AND campanha_id = p_campanha_id
      AND perfil IN ('admin', 'coordenacao')
      AND ativo = true
  );
$$;

-- ============================================================
-- PARTE 2: HARDENING — usuarios_campanhas
--
-- PROBLEMA CRÍTICO: a policy original "FOR ALL USING (user_id = auth.uid())"
-- permite que qualquer membro execute UPDATE na própria linha →
-- basta: UPDATE usuarios_campanhas SET perfil = 'admin' WHERE user_id = auth.uid();
-- ============================================================

DROP POLICY IF EXISTS "usuarios_campanhas_acesso" ON usuarios_campanhas;

-- SELECT: qualquer membro ativo vê todos os membros da mesma campanha
-- (necessário para a aba Equipe listar todos)
CREATE POLICY "uc_select" ON usuarios_campanhas
  FOR SELECT
  USING (campanha_id = ANY(public.minhas_campanhas()));

-- INSERT: bloqueado diretamente — só via SECURITY DEFINER RPCs
-- (criar_campanha e aceitar_convite já usam SECURITY DEFINER e bypassam RLS)
CREATE POLICY "uc_insert_deny" ON usuarios_campanhas
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: somente gestores podem alterar membros de sua campanha,
-- e nunca a própria linha (previne auto-promoção mesmo para gestores)
CREATE POLICY "uc_update_gestor" ON usuarios_campanhas
  FOR UPDATE
  USING (
    campanha_id = ANY(public.minhas_campanhas())
    AND public.is_gestor(campanha_id)
    AND user_id <> auth.uid()
  );

-- DELETE: bloqueado — usar ativo = false
CREATE POLICY "uc_delete_deny" ON usuarios_campanhas
  FOR DELETE
  USING (false);

-- ============================================================
-- PARTE 3: HARDENING — campanhas
--
-- PROBLEMA: "FOR ALL" permite UPDATE por qualquer membro,
-- alterando nome, candidato, cargo, configuracoes etc.
-- ============================================================

DROP POLICY IF EXISTS "campanhas_acesso" ON campanhas;

CREATE POLICY "camp_select" ON campanhas
  FOR SELECT
  USING (id = ANY(public.minhas_campanhas()));

-- INSERT bloqueado: criar_campanha() é SECURITY DEFINER
CREATE POLICY "camp_insert_deny" ON campanhas
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: somente gestores
CREATE POLICY "camp_update_gestor" ON campanhas
  FOR UPDATE
  USING (
    id = ANY(public.minhas_campanhas())
    AND public.is_gestor(id)
  );

-- DELETE bloqueado
CREATE POLICY "camp_delete_deny" ON campanhas
  FOR DELETE
  USING (false);

-- ============================================================
-- PARTE 4: HARDENING — convites
--
-- PROBLEMA: qualquer membro pode criar e cancelar convites.
-- ============================================================

DROP POLICY IF EXISTS "convites_select" ON convites;
DROP POLICY IF EXISTS "convites_insert" ON convites;
DROP POLICY IF EXISTS "convites_update" ON convites;

CREATE POLICY "conv_select" ON convites
  FOR SELECT
  USING (campanha_id = ANY(public.minhas_campanhas()));

CREATE POLICY "conv_insert_gestor" ON convites
  FOR INSERT
  WITH CHECK (
    campanha_id = ANY(public.minhas_campanhas())
    AND public.is_gestor(campanha_id)
  );

CREATE POLICY "conv_update_gestor" ON convites
  FOR UPDATE
  USING (
    campanha_id = ANY(public.minhas_campanhas())
    AND public.is_gestor(campanha_id)
  );

-- ============================================================
-- PARTE 5: HARDENING — pessoas
--
-- PROBLEMA: "FOR ALL" permite DELETE por qualquer membro.
-- A policy coord_territorial era ineficaz (OR com a FOR ALL não restringe).
-- ============================================================

DROP POLICY IF EXISTS "pessoas_campanha"           ON pessoas;
DROP POLICY IF EXISTS "pessoas_coord_territorial"  ON pessoas;

CREATE POLICY "pess_select" ON pessoas
  FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));

CREATE POLICY "pess_insert" ON pessoas
  FOR INSERT WITH CHECK (campanha_id = ANY(public.minhas_campanhas()));

CREATE POLICY "pess_update" ON pessoas
  FOR UPDATE USING (campanha_id = ANY(public.minhas_campanhas()));

-- Somente gestores podem apagar contatos
CREATE POLICY "pess_delete_gestor" ON pessoas
  FOR DELETE USING (
    campanha_id = ANY(public.minhas_campanhas())
    AND public.is_gestor(campanha_id)
  );

-- ============================================================
-- PARTE 6: DELETE RESTRITO — demandas, territórios, tarefas,
--          metas, lideranças, interações, agenda
-- ============================================================

-- Demandas
DROP POLICY IF EXISTS "demandas_campanha" ON demandas;
CREATE POLICY "dem_select" ON demandas FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "dem_insert" ON demandas FOR INSERT WITH CHECK (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "dem_update" ON demandas FOR UPDATE USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "dem_delete_gestor" ON demandas FOR DELETE
  USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));

-- Territórios (criar/alterar/apagar exige gestor)
DROP POLICY IF EXISTS "territorios_campanha" ON territorios;
CREATE POLICY "terr_select" ON territorios FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "terr_insert_gestor" ON territorios FOR INSERT
  WITH CHECK (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));
CREATE POLICY "terr_update_gestor" ON territorios FOR UPDATE
  USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));
CREATE POLICY "terr_delete_gestor" ON territorios FOR DELETE
  USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));

-- Tarefas
DROP POLICY IF EXISTS "tarefas_campanha" ON tarefas;
CREATE POLICY "tar_select" ON tarefas FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "tar_insert" ON tarefas FOR INSERT WITH CHECK (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "tar_update" ON tarefas FOR UPDATE USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "tar_delete_gestor" ON tarefas FOR DELETE
  USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));

-- Metas
DROP POLICY IF EXISTS "metas_campanha" ON metas;
CREATE POLICY "meta_select" ON metas FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "meta_insert_gestor" ON metas FOR INSERT
  WITH CHECK (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));
CREATE POLICY "meta_update_gestor" ON metas FOR UPDATE
  USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));
CREATE POLICY "meta_delete_gestor" ON metas FOR DELETE
  USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));

-- Lideranças
DROP POLICY IF EXISTS "liderancas_campanha" ON liderancas;
CREATE POLICY "lid_select" ON liderancas FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "lid_insert" ON liderancas FOR INSERT WITH CHECK (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "lid_update" ON liderancas FOR UPDATE USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "lid_delete_gestor" ON liderancas FOR DELETE
  USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));

-- Interações
DROP POLICY IF EXISTS "interacoes_campanha" ON interacoes;
CREATE POLICY "int_select" ON interacoes FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "int_insert" ON interacoes FOR INSERT WITH CHECK (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "int_update" ON interacoes FOR UPDATE USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "int_delete_gestor" ON interacoes FOR DELETE
  USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));

-- Agenda
DROP POLICY IF EXISTS "agenda_campanha" ON agenda_eventos;
CREATE POLICY "age_select" ON agenda_eventos FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "age_insert" ON agenda_eventos FOR INSERT WITH CHECK (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "age_update" ON agenda_eventos FOR UPDATE USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "age_delete_gestor" ON agenda_eventos FOR DELETE
  USING (campanha_id = ANY(public.minhas_campanhas()) AND public.is_gestor(campanha_id));

-- ============================================================
-- PARTE 7: RPC — alterar_perfil_membro
--
-- Regras de negócio que o RLS sozinho não cobre:
--   1. Chamador deve ser gestor da mesma campanha
--   2. Não pode alterar a própria linha
--   3. Coordenação não pode promover para admin (só admin pode)
--   4. Não pode rebaixar o único admin restante
-- ============================================================

CREATE OR REPLACE FUNCTION public.alterar_perfil_membro(
  p_membro_id   uuid,
  p_novo_perfil perfil_usuario
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id     uuid := auth.uid();
  v_caller_perfil text;
  v_membro        usuarios_campanhas%ROWTYPE;
  v_admin_count   integer;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Não autenticado');
  END IF;

  SELECT * INTO v_membro
  FROM usuarios_campanhas
  WHERE id = p_membro_id AND ativo = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Membro não encontrado');
  END IF;

  -- Perfil do chamador na campanha do membro alvo
  SELECT perfil::text INTO v_caller_perfil
  FROM usuarios_campanhas
  WHERE user_id = v_caller_id
    AND campanha_id = v_membro.campanha_id
    AND ativo = true;

  IF v_caller_perfil IS NULL OR v_caller_perfil NOT IN ('admin', 'coordenacao') THEN
    RETURN jsonb_build_object('error', 'Sem permissão para alterar perfis');
  END IF;

  IF v_membro.user_id = v_caller_id THEN
    RETURN jsonb_build_object('error', 'Não é possível alterar o próprio perfil');
  END IF;

  -- Somente admin pode promover outro usuário para admin
  IF p_novo_perfil = 'admin' AND v_caller_perfil <> 'admin' THEN
    RETURN jsonb_build_object('error', 'Somente administradores podem conceder o papel de admin');
  END IF;

  -- Impede rebaixar o último admin da campanha
  IF v_membro.perfil::text = 'admin' AND p_novo_perfil::text <> 'admin' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM usuarios_campanhas
    WHERE campanha_id = v_membro.campanha_id
      AND perfil = 'admin'
      AND ativo = true;

    IF v_admin_count <= 1 THEN
      RETURN jsonb_build_object('error', 'Não é possível rebaixar o único administrador da campanha');
    END IF;
  END IF;

  UPDATE usuarios_campanhas
  SET perfil = p_novo_perfil
  WHERE id = p_membro_id;

  INSERT INTO audit_log(campanha_id, user_id, tabela, registro_id, operacao, dados_antes, dados_depois)
  VALUES (
    v_membro.campanha_id,
    v_caller_id,
    'usuarios_campanhas',
    p_membro_id,
    'UPDATE',
    jsonb_build_object('perfil', v_membro.perfil),
    jsonb_build_object('perfil', p_novo_perfil)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.alterar_perfil_membro TO authenticated;

-- ============================================================
-- PARTE 8: RPC — remover_membro
-- ============================================================

CREATE OR REPLACE FUNCTION public.remover_membro(p_membro_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_perfil text;
  v_membro      usuarios_campanhas%ROWTYPE;
  v_admin_count integer;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Não autenticado');
  END IF;

  SELECT * INTO v_membro
  FROM usuarios_campanhas
  WHERE id = p_membro_id AND ativo = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Membro não encontrado');
  END IF;

  SELECT perfil::text INTO v_caller_perfil
  FROM usuarios_campanhas
  WHERE user_id = v_caller_id
    AND campanha_id = v_membro.campanha_id
    AND ativo = true;

  IF v_caller_perfil IS NULL OR v_caller_perfil NOT IN ('admin', 'coordenacao') THEN
    RETURN jsonb_build_object('error', 'Sem permissão para remover membros');
  END IF;

  IF v_membro.user_id = v_caller_id THEN
    RETURN jsonb_build_object('error', 'Não é possível se remover da campanha');
  END IF;

  -- Impede remover o último admin
  IF v_membro.perfil::text = 'admin' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM usuarios_campanhas
    WHERE campanha_id = v_membro.campanha_id
      AND perfil = 'admin'
      AND ativo = true;

    IF v_admin_count <= 1 THEN
      RETURN jsonb_build_object('error', 'Não é possível remover o único administrador da campanha');
    END IF;
  END IF;

  UPDATE usuarios_campanhas SET ativo = false WHERE id = p_membro_id;

  INSERT INTO audit_log(campanha_id, user_id, tabela, registro_id, operacao, dados_antes, dados_depois)
  VALUES (
    v_membro.campanha_id,
    v_caller_id,
    'usuarios_campanhas',
    p_membro_id,
    'UPDATE',
    jsonb_build_object('ativo', true, 'perfil', v_membro.perfil),
    jsonb_build_object('ativo', false)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.remover_membro TO authenticated;

-- ============================================================
-- PARTE 9: RPC — cancelar_convite
-- ============================================================

CREATE OR REPLACE FUNCTION public.cancelar_convite(p_convite_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_perfil    text;
  v_convite   convites%ROWTYPE;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Não autenticado');
  END IF;

  SELECT * INTO v_convite FROM convites WHERE id = p_convite_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Convite não encontrado');
  END IF;

  SELECT perfil::text INTO v_perfil
  FROM usuarios_campanhas
  WHERE user_id = v_caller_id
    AND campanha_id = v_convite.campanha_id
    AND ativo = true;

  IF v_perfil IS NULL OR v_perfil NOT IN ('admin', 'coordenacao') THEN
    RETURN jsonb_build_object('error', 'Sem permissão para cancelar convites');
  END IF;

  IF v_convite.status <> 'pendente' THEN
    RETURN jsonb_build_object('error', 'Apenas convites pendentes podem ser cancelados');
  END IF;

  UPDATE convites SET status = 'cancelado' WHERE id = p_convite_id;

  INSERT INTO audit_log(campanha_id, user_id, tabela, registro_id, operacao, dados_antes, dados_depois)
  VALUES (
    v_convite.campanha_id,
    v_caller_id,
    'convites',
    p_convite_id,
    'UPDATE',
    jsonb_build_object('status', v_convite.status),
    jsonb_build_object('status', 'cancelado')
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancelar_convite TO authenticated;

-- ============================================================
-- PARTE 10: AUDIT TRIGGERS COMPLETOS
--
-- Substitui a função específica audit_pessoas() por uma genérica
-- que cobre campanhas, usuarios_campanhas, convites e demandas.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old         jsonb;
  v_new         jsonb;
  v_campanha_id uuid;
  v_registro_id uuid;
BEGIN
  v_old := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END;
  v_new := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END;

  -- campanha_id: tenta no registro; para a tabela campanhas usa o id direto
  v_campanha_id := COALESCE(
    (v_new->>'campanha_id')::uuid,
    (v_old->>'campanha_id')::uuid,
    (v_new->>'id')::uuid,  -- tabela campanhas não tem campanha_id
    (v_old->>'id')::uuid
  );

  v_registro_id := COALESCE(
    (v_new->>'id')::uuid,
    (v_old->>'id')::uuid
  );

  INSERT INTO audit_log(campanha_id, user_id, tabela, registro_id, operacao, dados_antes, dados_depois)
  VALUES (v_campanha_id, auth.uid(), TG_TABLE_NAME, v_registro_id, TG_OP, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Remove trigger e função específica antiga de pessoas
DROP TRIGGER IF EXISTS trg_audit_pessoas        ON pessoas;
DROP FUNCTION  IF EXISTS public.audit_pessoas();

-- Recria com fn genérica
CREATE TRIGGER trg_audit_pessoas
  AFTER INSERT OR UPDATE OR DELETE ON pessoas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- Campanhas
DROP TRIGGER IF EXISTS trg_audit_campanhas ON campanhas;
CREATE TRIGGER trg_audit_campanhas
  AFTER INSERT OR UPDATE OR DELETE ON campanhas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- Equipe
DROP TRIGGER IF EXISTS trg_audit_uc ON usuarios_campanhas;
CREATE TRIGGER trg_audit_uc
  AFTER INSERT OR UPDATE OR DELETE ON usuarios_campanhas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- Convites
DROP TRIGGER IF EXISTS trg_audit_convites ON convites;
CREATE TRIGGER trg_audit_convites
  AFTER INSERT OR UPDATE OR DELETE ON convites
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- Demandas
DROP TRIGGER IF EXISTS trg_audit_demandas ON demandas;
CREATE TRIGGER trg_audit_demandas
  AFTER INSERT OR UPDATE OR DELETE ON demandas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- ============================================================
-- PARTE 11: ÍNDICE DE PERFORMANCE NO AUDIT LOG
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_operacao   ON audit_log(campanha_id, operacao, created_at DESC);

-- ============================================================
-- PARTE 12: AUDIT — política de leitura já existe (somente admin)
-- Adiciona política de INSERT para o service role (triggers usam SECURITY DEFINER)
-- ============================================================
DROP POLICY IF EXISTS "audit_admin" ON audit_log;

CREATE POLICY "audit_select_admin" ON audit_log
  FOR SELECT
  USING (
    campanha_id = ANY(public.minhas_campanhas())
    AND EXISTS (
      SELECT 1 FROM usuarios_campanhas
      WHERE user_id = auth.uid()
        AND campanha_id = audit_log.campanha_id
        AND perfil IN ('admin', 'coordenacao')
        AND ativo = true
    )
  );

-- INSERT: bloqueado para clientes — apenas triggers (SECURITY DEFINER) inserem
CREATE POLICY "audit_insert_deny" ON audit_log
  FOR INSERT WITH CHECK (false);
