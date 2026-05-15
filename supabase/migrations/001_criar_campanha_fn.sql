-- Função SECURITY DEFINER para resolver o problema de ovo-e-galinha do RLS:
-- ao inserir uma nova campanha, ela ainda não existe em usuarios_campanhas,
-- então minhas_campanhas() retorna vazio e o INSERT seria bloqueado.
-- Esta função cria campanha + vínculo admin num único tx com privilégio elevado.

CREATE OR REPLACE FUNCTION public.criar_campanha(
  p_nome            text,
  p_candidato_nome  text,
  p_cargo           cargo_tipo,
  p_uf              char(2),
  p_municipio       text    DEFAULT NULL,
  p_partido         text    DEFAULT NULL,
  p_numero_urna     text    DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO campanhas (nome, candidato_nome, cargo, municipio, uf, partido, numero_urna)
  VALUES (p_nome, p_candidato_nome, p_cargo, p_municipio, p_uf, p_partido, p_numero_urna)
  RETURNING id INTO v_id;

  INSERT INTO usuarios_campanhas (user_id, campanha_id, perfil)
  VALUES (auth.uid(), v_id, 'admin');

  RETURN v_id;
END;
$$;
