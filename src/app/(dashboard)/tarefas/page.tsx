"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useCampanha } from "@/hooks/use-campanha";
import { createClient } from "@/lib/supabase/client";
import { X, Trash2, ChevronRight, AlertCircle, Clock, Target } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────

type TarefaTipo = "visita"|"ligacao"|"convite_evento"|"entrega_material"|"confirmar_apoiador"|"outro";
type TarefaStatus = "pendente"|"em_andamento"|"concluida"|"cancelada";
type MetaTipo = "apoiadores"|"visitas"|"ligacoes"|"presencas"|"contatos"|"outro";

interface Membro { id: string; nome_exibicao: string | null }
interface Territorio { id: string; nome: string }

interface Tarefa {
  id: string; campanha_id: string; titulo: string; descricao: string | null;
  tipo: TarefaTipo; status: TarefaStatus; prazo: string | null; concluida_em: string | null;
  responsavel_id: string | null; territorio_id: string | null; meta_id: string | null;
  created_at: string;
  responsavel?: { nome_exibicao: string | null } | null;
  territorio?: { nome: string } | null;
}

interface Meta {
  id: string; campanha_id: string; titulo: string; descricao: string | null;
  tipo: MetaTipo; valor_alvo: number; valor_atual: number; prazo: string | null;
  ativa: boolean; responsavel_id: string | null; territorio_id: string | null;
  responsavel?: { nome_exibicao: string | null } | null;
  territorio?: { nome: string } | null;
}

// ─── Config ───────────────────────────────────────────────────

const tipoTarefaConfig: Record<TarefaTipo, { label: string; color: string; bg: string }> = {
  visita:              { label: "Visita",              color: "#0B1F3A", bg: "#EBF0F7" },
  ligacao:             { label: "Ligação",             color: "#2A3F5A", bg: "#EFF3F7" },
  convite_evento:      { label: "Convite p/ evento",  color: "#5A3A7A", bg: "#F3EEF9" },
  entrega_material:    { label: "Entrega de material", color: "#6B4E0A", bg: "#FBF5E8" },
  confirmar_apoiador:  { label: "Confirmar apoiador",  color: "#2D4A2A", bg: "#EDF2EB" },
  outro:               { label: "Outro",               color: "#7D8CA1", bg: "#F0EDE8" },
};

const statusConfig: Record<TarefaStatus, { label: string; color: string; bg: string; border: string }> = {
  pendente:     { label: "Pendente",     color: "#7D8CA1", bg: "#F0EDE8", border: "#D8D2C6" },
  em_andamento: { label: "Em andamento", color: "#6B4E0A", bg: "#FBF5E8", border: "#D4B56A" },
  concluida:    { label: "Concluída",    color: "#2D4A2A", bg: "#EDF2EB", border: "#A8C4A0" },
  cancelada:    { label: "Cancelada",    color: "#7A2020", bg: "#F9EEEE", border: "#D4A0A0" },
};

const statusOrdem: TarefaStatus[] = ["pendente","em_andamento","concluida","cancelada"];

const tipoMetaConfig: Record<MetaTipo, { label: string; color: string }> = {
  apoiadores: { label: "Apoiadores",  color: "#0B1F3A" },
  visitas:    { label: "Visitas",     color: "#2A3F5A" },
  ligacoes:   { label: "Ligações",    color: "#33445E" },
  presencas:  { label: "Presenças",   color: "#5A3A7A" },
  contatos:   { label: "Contatos",    color: "#2D4A2A" },
  outro:      { label: "Outro",       color: "#7D8CA1" },
};

const tipoTarefaOrdem: TarefaTipo[] = ["visita","ligacao","convite_evento","entrega_material","confirmar_apoiador","outro"];
const tipoMetaOrdem: MetaTipo[] = ["apoiadores","visitas","ligacoes","presencas","contatos","outro"];

function fmt(n: number) { return n.toLocaleString("pt-BR"); }
function pctNum(atual: number, alvo: number) { return alvo > 0 ? Math.min(100, Math.round((atual / alvo) * 100)) : 0; }

function prazoLabel(iso: string | null): { label: string; urgente: boolean } | null {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0)  return { label: `${Math.abs(diff)}d atrasado`, urgente: true };
  if (diff === 0) return { label: "hoje",    urgente: true };
  if (diff === 1) return { label: "amanhã",  urgente: true };
  if (diff <= 7)  return { label: `${diff}d`, urgente: false };
  return { label: new Date(iso).toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" }), urgente: false };
}

// ─── SlideOver Tarefa ─────────────────────────────────────────

interface TarefaSlideOverProps {
  open: boolean; tarefa: Tarefa | null; campanhaId: string;
  membros: Membro[]; territorios: Territorio[]; metas: Meta[];
  onClose: () => void; onSaved: () => void;
}

function TarefaSlideOver({ open, tarefa, campanhaId, membros, territorios, metas, onClose, onSaved }: TarefaSlideOverProps) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TarefaTipo>("visita");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<TarefaStatus>("pendente");
  const [responsavelId, setResponsavelId] = useState("");
  const [territorioId, setTerritorioId] = useState("");
  const [metaId, setMetaId] = useState("");
  const [prazo, setPrazo] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (tarefa) {
      setTitulo(tarefa.titulo); setTipo(tarefa.tipo); setDescricao(tarefa.descricao ?? "");
      setStatus(tarefa.status); setResponsavelId(tarefa.responsavel_id ?? "");
      setTerritorioId(tarefa.territorio_id ?? ""); setMetaId(tarefa.meta_id ?? "");
      setPrazo(tarefa.prazo ? new Date(tarefa.prazo).toISOString().slice(0,10) : "");
    } else {
      setTitulo(""); setTipo("visita"); setDescricao(""); setStatus("pendente");
      setResponsavelId(""); setTerritorioId(""); setMetaId(""); setPrazo("");
    }
    setError(null); setConfirmDelete(false);
  }, [tarefa, open]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true); setError(null);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const payload = {
      titulo: titulo.trim(), tipo, descricao: descricao || null, status,
      responsavel_id: responsavelId || null, territorio_id: territorioId || null,
      meta_id: metaId || null,
      prazo: prazo ? new Date(prazo).toISOString() : null,
      concluida_em: status === "concluida" && !tarefa?.concluida_em ? new Date().toISOString() : (tarefa?.concluida_em ?? null),
    };
    const { error: err } = tarefa
      ? await sb.from("tarefas").update(payload).eq("id", tarefa.id)
      : await sb.from("tarefas").insert({ ...payload, campanha_id: campanhaId, created_by: user?.id });
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false); onSaved(); onClose();
  }

  async function handleDelete() {
    if (!tarefa) return;
    setDeleting(true);
    await createClient().from("tarefas").delete().eq("id", tarefa.id);
    setDeleting(false); onSaved(); onClose();
  }

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">{tarefa ? "Editar tarefa" : "Nova tarefa"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <form id="tarefa-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <style>{`.tf-input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;color:hsl(var(--foreground));transition:border-color 0.15s;}.tf-input:focus{border-color:#B58A2C;}`}</style>

          <TF label="Título *"><input required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O que precisa ser feito?" className="tf-input" /></TF>

          <TF label="Tipo">
            <div className="grid grid-cols-2 gap-2">
              {tipoTarefaOrdem.map((t) => {
                const cfg = tipoTarefaConfig[t]; const active = tipo === t;
                return (
                  <button key={t} type="button" onClick={() => setTipo(t)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium text-left transition-all"
                    style={{ backgroundColor: active ? cfg.bg : "hsl(var(--background))", borderColor: active ? cfg.color+"66" : "hsl(var(--border))", color: active ? cfg.color : "hsl(var(--muted-foreground))" }}>
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: active ? cfg.color : "hsl(var(--muted-foreground))" }} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </TF>

          <div className="grid grid-cols-2 gap-3">
            <TF label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as TarefaStatus)} className="tf-input">
                {statusOrdem.map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
              </select>
            </TF>
            <TF label="Prazo">
              <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="tf-input" />
            </TF>
          </div>

          <TF label="Responsável">
            <select value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} className="tf-input">
              <option value="">Sem responsável</option>
              {membros.map((m) => <option key={m.id} value={m.id}>{m.nome_exibicao ?? "Sem nome"}</option>)}
            </select>
          </TF>

          <TF label="Território">
            <select value={territorioId} onChange={(e) => setTerritorioId(e.target.value)} className="tf-input">
              <option value="">Sem território</option>
              {territorios.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </TF>

          <TF label="Vincular à meta">
            <select value={metaId} onChange={(e) => setMetaId(e.target.value)} className="tf-input">
              <option value="">Sem meta</option>
              {metas.map((m) => <option key={m.id} value={m.id}>{m.titulo}</option>)}
            </select>
          </TF>

          <TF label="Descrição">
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes adicionais..." rows={3} className="tf-input resize-none" />
          </TF>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          {tarefa && !confirmDelete && <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" />Excluir</button>}
          {tarefa && confirmDelete && <div className="flex items-center gap-2"><span className="text-xs text-red-500">Confirmar?</span><button type="button" onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 font-medium hover:underline disabled:opacity-50">{deleting?"...":"Sim"}</button><button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:underline">Não</button></div>}
          {!tarefa && <span />}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
            <button type="submit" form="tarefa-form" disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-60" style={{ backgroundColor:"#B58A2C" }}>{saving?"Salvando...":tarefa?"Salvar":"Criar tarefa"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── SlideOver Meta ───────────────────────────────────────────

interface MetaSlideOverProps {
  open: boolean; meta: Meta | null; campanhaId: string;
  membros: Membro[]; territorios: Territorio[];
  onClose: () => void; onSaved: () => void;
}

function MetaSlideOver({ open, meta, campanhaId, membros, territorios, onClose, onSaved }: MetaSlideOverProps) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<MetaTipo>("apoiadores");
  const [descricao, setDescricao] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [valorAtual, setValorAtual] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [territorioId, setTerritorioId] = useState("");
  const [prazo, setPrazo] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (meta) {
      setTitulo(meta.titulo); setTipo(meta.tipo); setDescricao(meta.descricao ?? "");
      setValorAlvo(meta.valor_alvo.toString()); setValorAtual(meta.valor_atual.toString());
      setResponsavelId(meta.responsavel_id ?? ""); setTerritorioId(meta.territorio_id ?? "");
      setPrazo(meta.prazo ?? "");
    } else {
      setTitulo(""); setTipo("apoiadores"); setDescricao(""); setValorAlvo("");
      setValorAtual("0"); setResponsavelId(""); setTerritorioId(""); setPrazo("");
    }
    setError(null); setConfirmDelete(false);
  }, [meta, open]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !valorAlvo) return;
    setSaving(true); setError(null);
    const sb = createClient();
    const payload = {
      titulo: titulo.trim(), tipo, descricao: descricao || null,
      valor_alvo: parseInt(valorAlvo), valor_atual: parseInt(valorAtual || "0"),
      responsavel_id: responsavelId || null, territorio_id: territorioId || null,
      prazo: prazo || null,
    };
    const { error: err } = meta
      ? await sb.from("metas").update(payload).eq("id", meta.id)
      : await sb.from("metas").insert({ ...payload, campanha_id: campanhaId });
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false); onSaved(); onClose();
  }

  async function handleDelete() {
    if (!meta) return;
    setDeleting(true);
    await createClient().from("metas").delete().eq("id", meta.id);
    setDeleting(false); onSaved(); onClose();
  }

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">{meta ? "Editar meta" : "Nova meta"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <form id="meta-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <style>{`.mf-input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;color:hsl(var(--foreground));transition:border-color 0.15s;}.mf-input:focus{border-color:#B58A2C;}`}</style>

          <TF label="Título *"><input required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: 30 apoiadores esta semana" className="mf-input" /></TF>

          <TF label="Tipo">
            <div className="grid grid-cols-3 gap-2">
              {tipoMetaOrdem.map((t) => {
                const cfg = tipoMetaConfig[t]; const active = tipo === t;
                return (
                  <button key={t} type="button" onClick={() => setTipo(t)}
                    className="py-2 px-3 rounded-lg border text-xs font-medium transition-all"
                    style={{ backgroundColor: active ? cfg.color : "hsl(var(--background))", borderColor: active ? cfg.color : "hsl(var(--border))", color: active ? "#fff" : "hsl(var(--muted-foreground))" }}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </TF>

          <div className="grid grid-cols-2 gap-3">
            <TF label="Meta (alvo) *"><input required type="number" min={1} value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} placeholder="100" className="mf-input" /></TF>
            <TF label="Progresso atual"><input type="number" min={0} value={valorAtual} onChange={(e) => setValorAtual(e.target.value)} className="mf-input" /></TF>
          </div>

          <TF label="Prazo"><input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="mf-input" /></TF>

          <TF label="Responsável">
            <select value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} className="mf-input">
              <option value="">Equipe toda</option>
              {membros.map((m) => <option key={m.id} value={m.id}>{m.nome_exibicao ?? "Sem nome"}</option>)}
            </select>
          </TF>

          <TF label="Território">
            <select value={territorioId} onChange={(e) => setTerritorioId(e.target.value)} className="mf-input">
              <option value="">Toda a campanha</option>
              {territorios.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </TF>

          <TF label="Descrição"><textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Contexto da meta..." rows={2} className="mf-input resize-none" /></TF>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          {meta && !confirmDelete && <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" />Excluir</button>}
          {meta && confirmDelete && <div className="flex items-center gap-2"><span className="text-xs text-red-500">Confirmar?</span><button type="button" onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 font-medium hover:underline disabled:opacity-50">{deleting?"...":"Sim"}</button><button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:underline">Não</button></div>}
          {!meta && <span />}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
            <button type="submit" form="meta-form" disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-60" style={{ backgroundColor:"#B58A2C" }}>{saving?"Salvando...":meta?"Salvar":"Criar meta"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

function TF({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</label>{children}</div>;
}

// ─── Page ─────────────────────────────────────────────────────

type Tab = "tarefas" | "metas";

export default function TarefasPage() {
  const { campanhaId } = useCampanha();
  const [tab, setTab] = useState<Tab>("tarefas");

  // Data
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [territorios, setTerritorios] = useState<Territorio[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters (tarefas)
  const [filtroStatus, setFiltroStatus] = useState<TarefaStatus | "todas">("todas");
  const [filtroMembro, setFiltroMembro] = useState("");

  // Slide-overs
  const [tarefaOpen, setTarefaOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<Meta | null>(null);

  const fetchAll = useCallback(async () => {
    if (!campanhaId) return;
    setLoading(true);
    const sb = createClient();
    const [tRes, mRes, membRes, terRes] = await Promise.all([
      sb.from("tarefas").select("*, responsavel:responsavel_id(nome_exibicao), territorio:territorio_id(nome)")
        .eq("campanha_id", campanhaId).order("prazo", { nullsFirst: false }).order("created_at"),
      sb.from("metas").select("*, responsavel:responsavel_id(nome_exibicao), territorio:territorio_id(nome)")
        .eq("campanha_id", campanhaId).eq("ativa", true).order("prazo", { nullsFirst: false }),
      sb.from("usuarios_campanhas").select("id,nome_exibicao").eq("campanha_id", campanhaId).eq("ativo", true),
      sb.from("territorios").select("id,nome").eq("campanha_id", campanhaId).order("nome"),
    ]);
    setTarefas((tRes.data ?? []) as Tarefa[]);
    setMetas((mRes.data ?? []) as Meta[]);
    setMembros((membRes.data ?? []) as Membro[]);
    setTerritorios((terRes.data ?? []) as Territorio[]);
    setLoading(false);
  }, [campanhaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function quickStatus(t: Tarefa, next: TarefaStatus, e: React.MouseEvent) {
    e.stopPropagation();
    const update: Record<string, unknown> = { status: next };
    if (next === "concluida") update.concluida_em = new Date().toISOString();
    await createClient().from("tarefas").update(update).eq("id", t.id);
    fetchAll();
  }

  const tarefasFiltradas = tarefas.filter((t) => {
    if (filtroStatus !== "todas" && t.status !== filtroStatus) return false;
    if (filtroMembro && t.responsavel_id !== filtroMembro) return false;
    return true;
  });

  // KPIs
  const pendentes    = tarefas.filter((t) => t.status === "pendente").length;
  const emAndamento  = tarefas.filter((t) => t.status === "em_andamento").length;
  const concluidas   = tarefas.filter((t) => t.status === "concluida").length;
  const atrasadas    = tarefas.filter((t) => t.prazo && new Date(t.prazo) < new Date() && t.status !== "concluida" && t.status !== "cancelada").length;

  // Ranking membros
  const rankingMap = new Map<string, { nome: string; feitas: number }>();
  for (const t of tarefas.filter((t) => t.status === "concluida" && t.responsavel_id)) {
    const id = t.responsavel_id!;
    const nome = t.responsavel?.nome_exibicao ?? "Sem nome";
    rankingMap.set(id, { nome, feitas: (rankingMap.get(id)?.feitas ?? 0) + 1 });
  }
  const ranking = [...rankingMap.values()].sort((a,b) => b.feitas - a.feitas).slice(0, 3);

  return (
    <>
      <Topbar
        eyebrow="Coordenação operacional"
        title="Tarefas e Metas"
        subtitle={tab === "tarefas"
          ? `${tarefas.length} tarefa${tarefas.length !== 1 ? "s" : ""}`
          : `${metas.length} meta${metas.length !== 1 ? "s" : ""} ativa${metas.length !== 1 ? "s" : ""}`}
        action={tab === "tarefas"
          ? { label: "Nova tarefa", onClick: () => { setSelectedTarefa(null); setTarefaOpen(true); } }
          : { label: "Nova meta",   onClick: () => { setSelectedMeta(null);   setMetaOpen(true);   } }
        }
      />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-4">

          {/* Tabs */}
          <div className="flex rounded-lg border border-border overflow-hidden w-fit text-xs bg-card">
            {([["tarefas","Tarefas"],["metas","Metas"]] as [Tab,string][]).map(([v,l]) => (
              <button key={v} onClick={() => setTab(v)} className="px-4 py-2 font-medium transition-colors"
                style={{ backgroundColor: tab===v ? "#0B1F3A":"transparent", color: tab===v ? "#F4EFE4":"hsl(var(--muted-foreground))" }}>
                {l}
              </button>
            ))}
          </div>

          {/* ── TAREFAS ── */}
          {tab === "tarefas" && (
            <>
              {/* KPIs */}
              {!loading && tarefas.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label:"Pendentes",    value: pendentes,   color: "#7D8CA1" },
                    { label:"Em andamento", value: emAndamento, color: "#D4B56A" },
                    { label:"Concluídas",   value: concluidas,  color: "#2D4A2A" },
                    { label:"Atrasadas",    value: atrasadas,   color: atrasadas > 0 ? "#D4A0A0" : "hsl(var(--muted-foreground))" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">{label}</p>
                      <p className="text-2xl font-light" style={{ fontFamily:"var(--font-display),'Cormorant Garamond',Georgia,serif", color }}>{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Filters */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex rounded-lg border border-border overflow-hidden text-xs bg-card">
                  <button onClick={() => setFiltroStatus("todas")} className="px-3.5 py-2 font-medium transition-colors"
                    style={{ backgroundColor: filtroStatus==="todas" ? "#0B1F3A":"transparent", color: filtroStatus==="todas" ? "#F4EFE4":"hsl(var(--muted-foreground))" }}>
                    Todas
                  </button>
                  {statusOrdem.map((s) => {
                    const cfg = statusConfig[s]; const active = filtroStatus===s;
                    return (
                      <button key={s} onClick={() => setFiltroStatus(s)} className="px-3.5 py-2 font-medium transition-colors"
                        style={{ backgroundColor: active ? cfg.bg:"transparent", color: active ? cfg.color:"hsl(var(--muted-foreground))" }}>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
                <select value={filtroMembro} onChange={(e) => setFiltroMembro(e.target.value)}
                  className="text-xs rounded-lg border border-border bg-card px-3 py-2 outline-none text-muted-foreground focus:border-[#B58A2C] transition-colors">
                  <option value="">Todos os membros</option>
                  {membros.map((m) => <option key={m.id} value={m.id}>{m.nome_exibicao ?? "Sem nome"}</option>)}
                </select>
              </div>

              {/* List */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {loading ? (
                  Array.from({length:4}).map((_,i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/50 animate-pulse">
                      <div className="h-3.5 w-48 rounded bg-muted flex-1"/><div className="h-5 w-20 rounded-full bg-muted"/>
                    </div>
                  ))
                ) : tarefasFiltradas.length === 0 ? (
                  <div className="py-14 text-center">
                    <p className="text-sm text-muted-foreground">{tarefas.length===0 ? "Nenhuma tarefa criada." : "Nenhuma tarefa com esses filtros."}</p>
                    {tarefas.length===0 && <button onClick={() => { setSelectedTarefa(null); setTarefaOpen(true); }} className="mt-3 text-xs font-medium" style={{color:"#B58A2C"}}>Criar primeira tarefa →</button>}
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {tarefasFiltradas.map((t) => {
                      const scfg = statusConfig[t.status];
                      const tcfg = tipoTarefaConfig[t.tipo];
                      const p = prazoLabel(t.prazo);
                      const nextStatus = statusOrdem[statusOrdem.indexOf(t.status)+1] as TarefaStatus | undefined;
                      return (
                        <div key={t.id} onClick={() => { setSelectedTarefa(t); setTarefaOpen(true); }}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F4EFE4]/60 transition-colors cursor-pointer">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.titulo}</p>
                            <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor:tcfg.bg, color:tcfg.color }}>{tcfg.label}</span>
                              {t.responsavel && <span className="text-[10px] text-muted-foreground">{(t.responsavel as {nome_exibicao:string|null}).nome_exibicao ?? "Sem nome"}</span>}
                              {t.territorio && <span className="text-[10px] text-muted-foreground">{(t.territorio as {nome:string}).nome}</span>}
                              {p && (
                                <span className={`flex items-center gap-1 text-[10px] font-medium ${p.urgente ? "text-red-500" : "text-muted-foreground"}`}>
                                  {p.urgente ? <AlertCircle className="h-2.5 w-2.5"/> : <Clock className="h-2.5 w-2.5"/>}
                                  {p.label}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border" style={{ backgroundColor:scfg.bg, color:scfg.color, borderColor:scfg.border }}>
                              {scfg.label}
                            </span>
                            {nextStatus && nextStatus !== "cancelada" && (
                              <button onClick={(e) => quickStatus(t, nextStatus, e)}
                                className="text-[10px] text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5 transition-colors"
                                title={`Avançar para ${statusConfig[nextStatus].label}`}>
                                <ChevronRight className="h-3 w-3"/>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ranking */}
              {ranking.length > 0 && (
                <div className="rounded-xl border border-border bg-card px-5 py-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Mais ativos esta campanha</p>
                  <div className="flex gap-6">
                    {ranking.map((r, idx) => (
                      <div key={r.nome} className="flex items-center gap-2">
                        <span className="text-xs font-semibold w-4" style={{ color:"#B58A2C" }}>#{idx+1}</span>
                        <span className="text-sm font-medium">{r.nome}</span>
                        <span className="text-xs text-muted-foreground">{r.feitas} concluída{r.feitas!==1?"s":""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── METAS ── */}
          {tab === "metas" && (
            loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({length:4}).map((_,i) => <div key={i} className="rounded-xl border border-border bg-card p-5 h-28 animate-pulse"/>)}
              </div>
            ) : metas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
                <Target className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhuma meta criada.</p>
                <button onClick={() => { setSelectedMeta(null); setMetaOpen(true); }} className="mt-3 text-xs font-medium" style={{color:"#B58A2C"}}>Criar primeira meta →</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {metas.map((m) => {
                  const pct = pctNum(m.valor_atual, m.valor_alvo);
                  const cfg = tipoMetaConfig[m.tipo];
                  const p = prazoLabel(m.prazo);
                  const concluida = pct >= 100;
                  return (
                    <div key={m.id} onClick={() => { setSelectedMeta(m); setMetaOpen(true); }}
                      className="rounded-xl border border-border bg-card p-5 cursor-pointer hover:bg-[#F4EFE4]/40 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ backgroundColor:cfg.color+"22", color:cfg.color }}>{cfg.label}</span>
                          <p className="text-sm font-medium mt-1.5 leading-snug">{m.titulo}</p>
                          {(m.responsavel || m.territorio) && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {[(m.responsavel as {nome_exibicao:string|null}|null)?.nome_exibicao, (m.territorio as {nome:string}|null)?.nome].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-light" style={{ fontFamily:"var(--font-display),'Cormorant Garamond',Georgia,serif", color: concluida ? "#2D4A2A" : cfg.color }}>
                            {pct}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">{fmt(m.valor_atual)}/{fmt(m.valor_alvo)}</p>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width:`${pct}%`, backgroundColor: concluida ? "#2D4A2A" : cfg.color }} />
                      </div>
                      {p && (
                        <p className={`text-[10px] mt-2 flex items-center gap-1 ${p.urgente ? "text-red-500" : "text-muted-foreground"}`}>
                          <Clock className="h-2.5 w-2.5"/>{p.label}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </main>

      {campanhaId && (
        <>
          <TarefaSlideOver open={tarefaOpen} tarefa={selectedTarefa} campanhaId={campanhaId}
            membros={membros} territorios={territorios} metas={metas}
            onClose={() => setTarefaOpen(false)} onSaved={fetchAll} />
          <MetaSlideOver open={metaOpen} meta={selectedMeta} campanhaId={campanhaId}
            membros={membros} territorios={territorios}
            onClose={() => setMetaOpen(false)} onSaved={fetchAll} />
        </>
      )}
    </>
  );
}
