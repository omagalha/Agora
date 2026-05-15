"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { Building2, Users, UserCheck, Power } from "lucide-react";

const cargoLabel: Record<string, string> = {
  vereador: "Vereador(a)", prefeito: "Prefeito(a)", vice_prefeito: "Vice-Prefeito(a)",
  deputado_estadual: "Dep. Estadual", deputado_federal: "Dep. Federal",
  senador: "Senador(a)", governador: "Governador(a)",
};

async function toggleAtiva(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const ativa = formData.get("ativa") === "true";
  const sb = createServiceClient();
  await sb.from("campanhas").update({ ativa: !ativa }).eq("id", id);
  revalidatePath("/admin/campanhas");
}

interface CampanhaRow {
  id: string;
  nome: string;
  candidato_nome: string;
  cargo: string;
  uf: string;
  municipio: string | null;
  ativa: boolean;
  created_at: string;
  membros: number;
  contatos: number;
}

export default async function AdminCampanhasPage() {
  const sb = createServiceClient();

  const { data: campanhas } = await sb
    .from("campanhas")
    .select("id, nome, candidato_nome, cargo, uf, municipio, ativa, created_at")
    .order("created_at", { ascending: false });

  // Busca contagem de membros e contatos para cada campanha
  const rows: CampanhaRow[] = await Promise.all(
    (campanhas ?? []).map(async (c) => {
      const [membrosRes, contatosRes] = await Promise.all([
        sb.from("usuarios_campanhas").select("id", { count: "exact" }).eq("campanha_id", c.id).eq("ativo", true),
        sb.from("pessoas").select("id", { count: "exact" }).eq("campanha_id", c.id),
      ]);
      return { ...c, membros: membrosRes.count ?? 0, contatos: contatosRes.count ?? 0 };
    })
  );

  const ativas = rows.filter((r) => r.ativa).length;
  const suspensas = rows.filter((r) => !r.ativa).length;

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      <div className="border-b border-border px-8 py-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Plataforma</p>
        <h1 className="text-xl font-semibold">Campanhas</h1>
      </div>

      <div className="flex-1 p-8 space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: rows.length, color: "#EBF0F7", textColor: "#0B1F3A" },
            { label: "Ativas", value: ativas, color: "#EDF2EB", textColor: "#2D4A2A" },
            { label: "Suspensas", value: suspensas, color: "#FEF2F2", textColor: "#991B1B" },
          ].map(({ label, value, color, textColor }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center text-base font-bold" style={{ backgroundColor: color, color: textColor }}>
                {value}
              </div>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 text-[10px] uppercase tracking-[0.12em] text-muted-foreground px-5 py-3 border-b border-border bg-muted/30">
            <span>Campanha</span>
            <span className="w-24 text-center">Membros</span>
            <span className="w-24 text-center">Contatos</span>
            <span className="w-20 text-center">Status</span>
            <span className="w-24 text-center">Ação</span>
          </div>

          {rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma campanha cadastrada.</div>
          ) : (
            <div className="divide-y divide-border/50">
              {rows.map((c) => (
                <div key={c.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-0 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{c.candidato_nome}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {cargoLabel[c.cargo] ?? c.cargo} · {c.municipio ? `${c.municipio}/` : ""}{c.uf}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {c.nome} · desde {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="w-24 flex justify-center items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> {c.membros}
                  </div>

                  <div className="w-24 flex justify-center items-center gap-1.5 text-xs text-muted-foreground">
                    <UserCheck className="h-3 w-3" /> {c.contatos}
                  </div>

                  <div className="w-20 flex justify-center">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        backgroundColor: c.ativa ? "#EDF2EB" : "#FEF2F2",
                        color: c.ativa ? "#2D4A2A" : "#991B1B",
                      }}
                    >
                      {c.ativa ? "Ativa" : "Suspensa"}
                    </span>
                  </div>

                  <div className="w-24 flex justify-center">
                    <form action={toggleAtiva}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="ativa" value={String(c.ativa)} />
                      <button
                        type="submit"
                        title={c.ativa ? "Suspender campanha" : "Reativar campanha"}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs transition-colors hover:bg-muted"
                        style={{ color: c.ativa ? "#991B1B" : "#2D4A2A" }}
                      >
                        <Power className="h-3 w-3" />
                        {c.ativa ? "Suspender" : "Reativar"}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
