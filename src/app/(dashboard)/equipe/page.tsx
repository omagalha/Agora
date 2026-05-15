"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useCampanha } from "@/hooks/use-campanha";
import { createClient } from "@/lib/supabase/client";
import { X, Copy, Check, Trash2, UserPlus, Clock, Link2 } from "lucide-react";
import type { PerfilUsuario } from "@/types";

interface Membro {
  id: string;
  user_id: string;
  perfil: PerfilUsuario;
  nome_exibicao: string | null;
  ativo: boolean;
  created_at: string;
  isMe?: boolean;
}

interface Convite {
  id: string;
  email: string | null;
  perfil: PerfilUsuario;
  token: string;
  status: "pendente" | "aceito" | "cancelado" | "expirado";
  expires_at: string;
  created_at: string;
}

const perfilConfig: Record<PerfilUsuario, { label: string; desc: string; color: string; bg: string }> = {
  admin:                   { label: "Administrador",     desc: "Controla tudo",                    color: "#0B1F3A", bg: "#EBF0F7" },
  coordenacao:             { label: "Coordenação",       desc: "Gerencia equipe e regiões",         color: "#2D4A2A", bg: "#EDF2EB" },
  coordenador_territorial: { label: "Coord. Territorial",desc: "Responsável por uma região",        color: "#2A3F5A", bg: "#EFF3F7" },
  equipe_rua:              { label: "Equipe de Rua",     desc: "Acessa tarefas e contatos",         color: "#6B4E0A", bg: "#FBF5E8" },
  atendimento:             { label: "Atendimento",       desc: "Registra demandas",                 color: "#5A3A7A", bg: "#F3EEF9" },
  candidato:               { label: "Candidato",         desc: "Visualiza dados",                   color: "#7D8CA1", bg: "#F0EDE8" },
};

const perfilOrdem: PerfilUsuario[] = [
  "admin","coordenacao","coordenador_territorial","equipe_rua","atendimento","candidato",
];

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function expiresLabel(iso: string) {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: "Expirado", atrasado: true };
  if (diff === 0) return { label: "Expira hoje", atrasado: false };
  if (diff === 1) return { label: "Expira amanhã", atrasado: false };
  return { label: `Expira em ${diff} dias`, atrasado: false };
}

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  campanhaId: string;
}

function SlideOver({ open, onClose, onSaved, campanhaId }: SlideOverProps) {
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<PerfilUsuario>("equipe_rua");
  const [expiry, setExpiry] = useState("7");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) { setEmail(""); setPerfil("equipe_rua"); setExpiry("7"); setError(null); setCreated(null); setCopied(false); }
  }, [open]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const expiresAt = new Date(Date.now() + parseInt(expiry) * 86400000).toISOString();

    const { data, error: err } = await supabase
      .from("convites")
      .insert({ campanha_id: campanhaId, email: email.trim() || null, perfil, expires_at: expiresAt, convidado_por: user?.id })
      .select("token")
      .single();

    if (err) { setError(err.message); setSaving(false); return; }
    setCreated(`${window.location.origin}/convite/${data.token}`);
    setSaving(false);
    onSaved();
  }

  function copyLink() {
    if (!created) return;
    navigator.clipboard.writeText(created);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">Gerar convite</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {created ? (
          <div className="flex-1 flex flex-col px-6 py-8 items-center text-center gap-4">
            <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#EDF2EB" }}>
              <Check className="h-6 w-6" style={{ color: "#2D4A2A" }} />
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Convite gerado!</p>
              <p className="text-xs text-muted-foreground">Compartilhe o link abaixo com a pessoa convidada.</p>
            </div>
            <div className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2.5 flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-xs text-muted-foreground truncate">{created}</span>
              <button onClick={copyLink} className="shrink-0 flex items-center gap-1 text-xs font-medium transition-colors" style={{ color: copied ? "#2D4A2A" : "#B58A2C" }}>
                {copied ? <><Check className="h-3 w-3" />Copiado</> : <><Copy className="h-3 w-3" />Copiar</>}
              </button>
            </div>
            <button onClick={onClose} className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors">Fechar</button>
          </div>
        ) : (
          <>
            <form id="convite-form" onSubmit={handleCreate} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <style>{`.c-input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;color:hsl(var(--foreground));transition:border-color 0.15s;}.c-input:focus{border-color:#B58A2C;}`}</style>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">E-mail (opcional)</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@exemplo.com.br" className="c-input" />
                <p className="text-[10px] text-muted-foreground">Deixe em branco para gerar um link genérico.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Papel de acesso</label>
                <div className="space-y-2">
                  {perfilOrdem.map((p) => {
                    const cfg = perfilConfig[p];
                    const active = perfil === p;
                    return (
                      <button key={p} type="button" onClick={() => setPerfil(p)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all"
                        style={{ backgroundColor: active ? cfg.bg : "hsl(var(--background))", borderColor: active ? cfg.color + "66" : "hsl(var(--border))" }}>
                        <div className="h-2 w-2 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: active ? cfg.color : "hsl(var(--muted-foreground))" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium" style={{ color: active ? cfg.color : "hsl(var(--foreground))" }}>{cfg.label}</p>
                          <p className="text-[10px] text-muted-foreground">{cfg.desc}</p>
                        </div>
                        {active && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: cfg.color }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Validade</label>
                <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className="c-input">
                  <option value="1">1 dia</option>
                  <option value="7">7 dias</option>
                  <option value="30">30 dias</option>
                  <option value="365">1 ano</option>
                </select>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </form>

            <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
              <button type="submit" form="convite-form" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-60" style={{ backgroundColor: "#B58A2C" }}>
                <UserPlus className="h-3.5 w-3.5" />{saving ? "Gerando..." : "Gerar convite"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

type Tab = "membros" | "convites";

export default function EquipePage() {
  const { campanhaId, perfil: meuperfil } = useCampanha();
  const [tab, setTab] = useState<Tab>("membros");
  const [membros, setMembros] = useState<Membro[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideOpen, setSlideOpen] = useState(false);
  const [meUserId, setMeUserId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingPerfil, setEditingPerfil] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setMeUserId(user?.id ?? null));
  }, []);

  const fetch = useCallback(async () => {
    if (!campanhaId) return;
    setLoading(true);
    const sb = createClient();
    const [membRes, convRes] = await Promise.all([
      sb.from("usuarios_campanhas").select("*").eq("campanha_id", campanhaId).eq("ativo", true).order("created_at"),
      sb.from("convites").select("*").eq("campanha_id", campanhaId).order("created_at", { ascending: false }),
    ]);
    setMembros((membRes.data ?? []) as Membro[]);
    setConvites((convRes.data ?? []) as Convite[]);
    setLoading(false);
  }, [campanhaId]);

  useEffect(() => { fetch(); }, [fetch]);

  async function removeMembro(id: string) {
    const sb = createClient();
    const { data } = await sb.rpc("remover_membro", { p_membro_id: id });
    if (data?.error) { alert(data.error); return; }
    fetch();
  }

  async function changePerfil(id: string, perfil: PerfilUsuario) {
    const sb = createClient();
    const { data } = await sb.rpc("alterar_perfil_membro", { p_membro_id: id, p_novo_perfil: perfil });
    if (data?.error) { alert(data.error); setEditingPerfil(null); return; }
    setEditingPerfil(null);
    fetch();
  }

  async function cancelarConvite(id: string) {
    const sb = createClient();
    const { data } = await sb.rpc("cancelar_convite", { p_convite_id: id });
    if (data?.error) { alert(data.error); return; }
    fetch();
  }

  function copyLink(token: string, id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/convite/${token}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const pendentes = convites.filter((c) => c.status === "pendente").length;

  return (
    <>
      <Topbar
        eyebrow="Gestão de acesso"
        title="Equipe"
        subtitle={`${membros.length} membro${membros.length !== 1 ? "s" : ""} ativo${membros.length !== 1 ? "s" : ""}`}
        action={{ label: "Convidar", onClick: () => setSlideOpen(true) }}
      />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        <div className="mx-auto max-w-4xl space-y-4">

          <div className="flex rounded-lg border border-border overflow-hidden w-fit text-xs">
            {([["membros","Membros"], ["convites","Convites"]] as [Tab,string][]).map(([v,l]) => (
              <button key={v} onClick={() => setTab(v)}
                className="px-4 py-2 flex items-center gap-1.5 transition-colors"
                style={{ backgroundColor: tab===v ? "#0B1F3A":"hsl(var(--card))", color: tab===v ? "#F4EFE4":"hsl(var(--muted-foreground))" }}>
                {l}
                {v==="convites" && pendentes > 0 && (
                  <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: tab===v ? "#B58A2C":"#FBF5E8", color: tab===v ? "#fff":"#6B4E0A" }}>{pendentes}</span>
                )}
              </button>
            ))}
          </div>

          {tab === "membros" && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {loading ? (
                Array.from({length:3}).map((_,i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/50 animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-muted"/><div className="flex-1 space-y-1.5"><div className="h-3.5 w-32 rounded bg-muted"/><div className="h-2.5 w-20 rounded bg-muted"/></div><div className="h-5 w-24 rounded-full bg-muted"/>
                  </div>
                ))
              ) : membros.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Nenhum membro encontrado.</div>
              ) : membros.map((m) => {
                const cfg = perfilConfig[m.perfil] ?? perfilConfig.equipe_rua;
                const isMe = m.user_id === meUserId;
                return (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-4 border-b border-border/50 last:border-0">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ backgroundColor:"#EBF0F7",color:"#0B1F3A" }}>
                      {initials(m.nome_exibicao ?? "?")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.nome_exibicao ?? "Sem nome"}{isMe && <span className="ml-1.5 text-[10px] text-muted-foreground">(você)</span>}</p>
                      <p className="text-[10px] text-muted-foreground">Desde {new Date(m.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {editingPerfil === m.id ? (
                        <select
                          autoFocus
                          defaultValue={m.perfil}
                          onChange={(e) => changePerfil(m.id, e.target.value as PerfilUsuario)}
                          onBlur={() => setEditingPerfil(null)}
                          className="text-xs border border-border rounded-lg px-2 py-1 bg-background outline-none focus:border-[#B58A2C]"
                        >
                          {perfilOrdem.map((p) => <option key={p} value={p}>{perfilConfig[p].label}</option>)}
                        </select>
                      ) : (
                        <button
                          onClick={() => !isMe && setEditingPerfil(m.id)}
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors"
                          style={{ backgroundColor:cfg.bg, color:cfg.color, borderColor:cfg.color+"44", cursor: isMe ? "default":"pointer" }}
                          title={isMe ? undefined : "Clique para alterar papel"}
                        >
                          {cfg.label}
                        </button>
                      )}
                      {!isMe && (
                        <button onClick={() => removeMembro(m.id)} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors" title="Remover da equipe">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "convites" && (
            <div className="space-y-3">
              {loading ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground animate-pulse">Carregando...</div>
              ) : convites.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum convite gerado ainda.</p>
                  <button onClick={() => setSlideOpen(true)} className="mt-3 text-xs font-medium" style={{color:"#B58A2C"}}>Gerar primeiro convite →</button>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="divide-y divide-border/50">
                    {convites.map((c) => {
                      const cfg = perfilConfig[c.perfil] ?? perfilConfig.equipe_rua;
                      const exp = expiresLabel(c.expires_at);
                      const isPendente = c.status === "pendente";
                      return (
                        <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                          <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: isPendente ? "#EBF0F7":"hsl(var(--muted))" }}>
                            <UserPlus className="h-4 w-4" style={{ color: isPendente ? "#0B1F3A":"hsl(var(--muted-foreground))" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.email ?? "Link genérico"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor:cfg.bg,color:cfg.color }}>{cfg.label}</span>
                              {isPendente ? (
                                <span className={`flex items-center gap-1 text-[10px] ${exp.atrasado ? "text-red-500" : "text-muted-foreground"}`}>
                                  <Clock className="h-3 w-3" />{exp.label}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground capitalize">{c.status}</span>
                              )}
                            </div>
                          </div>
                          {isPendente && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => copyLink(c.token, c.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors bg-background">
                                {copiedId===c.id ? <><Check className="h-3 w-3 text-green-600"/>Copiado</> : <><Copy className="h-3 w-3"/>Copiar link</>}
                              </button>
                              <button onClick={() => cancelarConvite(c.id)} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors" title="Cancelar convite">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {campanhaId && (
        <SlideOver open={slideOpen} campanhaId={campanhaId} onClose={() => setSlideOpen(false)} onSaved={fetch} />
      )}
    </>
  );
}
