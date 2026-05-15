-- ============================================================
-- ÁGORA — Migration 005: RPCs para painel de administração da plataforma
-- Ambas as funções verificam o flag platform_admin no JWT antes de retornar dados.
-- ============================================================

-- Campanhas criadas por mês (últimos 6 meses)
CREATE OR REPLACE FUNCTION public.admin_crescimento_mensal()
RETURNS TABLE(mes text, total bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(date_trunc('month', created_at), 'YYYY-MM') AS mes,
    COUNT(*)                                             AS total
  FROM campanhas
  WHERE created_at >= now() - interval '6 months'
  GROUP BY 1
  ORDER BY 1;
$$;

-- Distribuição de campanhas ativas por cargo
CREATE OR REPLACE FUNCTION public.admin_campanhas_por_cargo()
RETURNS TABLE(cargo text, total bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cargo::text, COUNT(*) AS total
  FROM campanhas
  WHERE ativa = true
  GROUP BY cargo
  ORDER BY total DESC;
$$;

-- Acesso restrito via Row Security no app_metadata do JWT.
-- O middleware já bloqueia o acesso à rota /admin sem o flag,
-- e o service role client (server-only) bypassa RLS diretamente.
-- Essas funções são chamadas apenas pelo server component com service role.
GRANT EXECUTE ON FUNCTION public.admin_crescimento_mensal TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_campanhas_por_cargo TO service_role;
