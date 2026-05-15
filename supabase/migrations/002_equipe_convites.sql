-- ============================================================
-- ÁGORA — Módulo de Equipe e Convites
-- ============================================================

-- Enum de status do convite
CREATE TYPE convite_status AS ENUM ('pendente', 'aceito', 'cancelado', 'expirado');

-- Tabela de convites
CREATE TABLE convites (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id     uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  email           text,
  perfil          perfil_usuario NOT NULL DEFAULT 'equipe_rua',
  token           text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status          convite_status NOT NULL DEFAULT 'pendente',
  convidado_por   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE convites ENABLE ROW LEVEL SECURITY;

-- Membros da campanha gerenciam convites
CREATE POLICY "convites_select" ON convites FOR SELECT USING (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "convites_insert" ON convites FOR INSERT WITH CHECK (campanha_id = ANY(public.minhas_campanhas()));
CREATE POLICY "convites_update" ON convites FOR UPDATE USING (campanha_id = ANY(public.minhas_campanhas()));

GRANT SELECT, INSERT, UPDATE ON public.convites TO authenticated;

-- ============================================================
-- Índice
-- ============================================================
CREATE INDEX idx_convites_campanha ON convites(campanha_id);
CREATE INDEX idx_convites_token    ON convites(token);

-- ============================================================
-- FUNÇÃO: info pública do convite (acessível sem autenticação)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_convite_info(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'campanha_nome',    c.nome,
    'candidato_nome',   c.candidato_nome,
    'cargo',            c.cargo,
    'uf',               c.uf,
    'municipio',        c.municipio,
    'perfil',           conv.perfil,
    'expires_at',       conv.expires_at,
    'status',           conv.status,
    'valido',           (conv.status = 'pendente' AND conv.expires_at > now())
  ) INTO v_result
  FROM convites conv
  JOIN campanhas c ON c.id = conv.campanha_id
  WHERE conv.token = p_token;

  RETURN COALESCE(v_result, jsonb_build_object('error', 'Convite não encontrado'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_convite_info TO anon, authenticated;

-- ============================================================
-- FUNÇÃO: aceitar convite (requer autenticação)
-- ============================================================
CREATE OR REPLACE FUNCTION public.aceitar_convite(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_convite convites%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_nome    text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Não autenticado');
  END IF;

  SELECT * INTO v_convite
  FROM convites
  WHERE token = p_token AND status = 'pendente' AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Convite inválido ou expirado');
  END IF;

  IF EXISTS (
    SELECT 1 FROM usuarios_campanhas
    WHERE user_id = v_user_id AND campanha_id = v_convite.campanha_id AND ativo = true
  ) THEN
    RETURN jsonb_build_object('error', 'Você já é membro desta campanha');
  END IF;

  SELECT COALESCE(raw_user_meta_data->>'nome_exibicao', raw_user_meta_data->>'full_name', email)
  INTO v_nome FROM auth.users WHERE id = v_user_id;

  INSERT INTO usuarios_campanhas(user_id, campanha_id, perfil, nome_exibicao, ativo)
  VALUES (v_user_id, v_convite.campanha_id, v_convite.perfil, v_nome, true)
  ON CONFLICT (user_id, campanha_id) DO UPDATE SET ativo = true, perfil = v_convite.perfil;

  UPDATE convites SET status = 'aceito' WHERE id = v_convite.id;

  RETURN jsonb_build_object('success', true, 'campanha_id', v_convite.campanha_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.aceitar_convite TO authenticated;

-- ============================================================
-- Grants extras
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios_campanhas TO authenticated;
