import { createServiceClient } from "@/lib/supabase/service";

const perfilLabel: Record<string, string> = {
  admin: "Admin", coordenacao: "Coordenação", coordenador_territorial: "Coord. Territorial",
  equipe_rua: "Equipe de Rua", atendimento: "Atendimento", candidato: "Candidato",
};

const perfilColor: Record<string, { bg: string; color: string }> = {
  admin:                   { bg: "#EBF0F7", color: "#0B1F3A" },
  coordenacao:             { bg: "#EDF2EB", color: "#2D4A2A" },
  coordenador_territorial: { bg: "#EFF3F7", color: "#2A3F5A" },
  equipe_rua:              { bg: "#FBF5E8", color: "#6B4E0A" },
  atendimento:             { bg: "#F3EEF9", color: "#5A3A7A" },
  candidato:               { bg: "#F0EDE8", color: "#7D8CA1" },
};

interface UserRow {
  user_id: string;
  email: string;
  nome: string;
  perfil: string;
  campanha_nome: string;
  campanha_id: string;
  membro_desde: string;
}

export default async function AdminUsuariosPage() {
  const sb = createServiceClient();

  // Busca todos os membros ativos com dados da campanha
  const { data: membros } = await sb
    .from("usuarios_campanhas")
    .select("user_id, perfil, nome_exibicao, created_at, campanha_id, campanhas(nome)")
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  // Busca emails dos usuários via auth.users (service role)
  const userIds = [...new Set((membros ?? []).map((m) => m.user_id))];
  const { data: authUsers } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );

  const rows: UserRow[] = (membros ?? []).map((m) => ({
    user_id: m.user_id,
    email: emailMap.get(m.user_id) ?? "—",
    nome: m.nome_exibicao ?? emailMap.get(m.user_id) ?? "—",
    perfil: m.perfil,
    campanha_nome: (m.campanhas as unknown as { nome: string } | null)?.nome ?? "—",
    campanha_id: m.campanha_id,
    membro_desde: m.created_at,
  }));

  const uniqueUsers = new Set(rows.map((r) => r.user_id)).size;

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      <div className="border-b border-border px-8 py-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Plataforma</p>
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold">Usuários</h1>
          <span className="text-sm text-muted-foreground">{uniqueUsers} contas · {rows.length} vínculos</span>
        </div>
      </div>

      <div className="flex-1 p-8">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-0 text-[10px] uppercase tracking-[0.12em] text-muted-foreground px-5 py-3 border-b border-border bg-muted/30">
            <span>Usuário</span>
            <span>Campanha</span>
            <span className="w-36">Perfil</span>
            <span className="w-28 text-right">Desde</span>
          </div>

          {rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
          ) : (
            <div className="divide-y divide-border/50">
              {rows.map((r, i) => {
                const pc = perfilColor[r.perfil] ?? perfilColor.candidato;
                return (
                  <div key={`${r.user_id}-${r.campanha_id}-${i}`} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-0 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.nome}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.email}</p>
                    </div>
                    <p className="text-sm text-muted-foreground truncate pr-4">{r.campanha_nome}</p>
                    <div className="w-36">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: pc.bg, color: pc.color }}>
                        {perfilLabel[r.perfil] ?? r.perfil}
                      </span>
                    </div>
                    <p className="w-28 text-right text-xs text-muted-foreground">
                      {new Date(r.membro_desde).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
