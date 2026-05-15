"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useCampanha } from "@/hooks/use-campanha";
import { createClient } from "@/lib/supabase/client";
import { X, Trash2, Search, Phone, Clock, Check, Bell } from "lucide-react";

type InteracaoTipo = "visita" | "reuniao" | "ligacao" | "whatsapp" | "evento" | "retorno";

interface Interacao {
  id: string;
  campanha_id: string;
  pessoa_id: string;
  tipo: InteracaoTipo;
  descricao: string | null;
  data_interacao: string;
  retorno_em: string | null;
  retorno_feito: boolean;
  pessoa: { nome: string; telefone: string | null; bairro: string | null } | null;
}

interface PessoaOption {
  id: string;
  nome: string;
  telefone: string | null;
  bairro: string | null;
}

const tipoConfig: Record<InteracaoTipo, { label: string; icon: string; color: string; bg: string }> = {
  visita:   { label: "Visita",    icon: "🚪", color: "#0B1F3A", bg: "#EBF0F7" },
  reuniao:  { label: "Reunião",   icon: "👥", color: "#2D4A2A", bg: "#EDF2EB" },
  ligacao:  { label: "Ligação",   icon: "📞", color: "#2A3F5A", bg: "#EFF3F7" },
  whatsapp: { label: "WhatsApp",  icon: "💬", color: "#1B5E20", bg: "#E8F5E9" },
  evento:   { label: "Evento",    icon: "🎯", color: "#6B4E0A", bg: "#FBF5E8" },
  retorno:  { label: "Retorno",   icon: "🔁", color: "#7D8CA1", bg: "#F0EDE8" },
};

const tipoOrdem: InteracaoTipo[] = ["visita","reuniao","ligacao","whatsapp","evento","retorno"];

const PAGE_SIZE = 25;

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtRetorno(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const diff = Math.ceil((d.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d atrasado`, atrasado: true };
  if (diff === 0) return { label: "hoje", atrasado: false };
  if (diff === 1) return { label: "amanhã", atrasado: false };
  return { label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), atrasado: false };
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

interface FormState {
  pessoa_id: string;
  pessoaNome: string;
  tipo: InteracaoTipo;
  descricao: string;
  data_interacao: string;
  data_interacao_time: string;
  retorno_em: string;
  retorno_em_time: string;
}

function nowParts() {
  const n = new Date();
  return {
    date: n.toISOString().slice(0, 10),
    time: `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`,
  };
}

function toFormState(i: Interacao | null): FormState {
  const { date, time } = nowParts();
  if (!i) return { pessoa_id:"", pessoaNome:"", tipo:"visita", descricao:"", data_interacao:date, data_interacao_time:time, retorno_em:"", retorno_em_time:"" };
  const ini = new Date(i.data_interacao);
  const ret = i.retorno_em ? new Date(i.retorno_em) : null;
  return {
    pessoa_id: i.pessoa_id,
    pessoaNome: i.pessoa?.nome ?? "",
    tipo: i.tipo,
    descricao: i.descricao ?? "",
    data_interacao: ini.toISOString().slice(0,10),
    data_interacao_time: `${String(ini.getHours()).padStart(2,"0")}:${String(ini.getMinutes()).padStart(2,"0")}`,
    retorno_em: ret ? ret.toISOString().slice(0,10) : "",
    retorno_em_time: ret ? `${String(ret.getHours()).padStart(2,"0")}:${String(ret.getMinutes()).padStart(2,"0")}` : "",
  };
}

interface SlideOverProps {
  open: boolean;
  interacao: Interacao | null;
  campanhaId: string;
  onClose: () => void;
  onSaved: () => void;
}

function SlideOver({ open, interacao, campanhaId, onClose, onSaved }: SlideOverProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(null));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pessoaSearch, setPessoaSearch] = useState("");
  const [pessoaOptions, setPessoaOptions] = useState<PessoaOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setForm(toFormState(interacao));
    setPessoaSearch(interacao?.pessoa?.nome ?? "");
    setError(null);
    setConfirmDelete(false);
    setPessoaOptions([]);
    setShowDropdown(false);
  }, [interacao, open]);

  useEffect(() => {
    if (!pessoaSearch.trim() || pessoaSearch === form.pessoaNome) { setPessoaOptions([]); setShowDropdown(false); return; }
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.from("pessoas").select("id,nome,telefone,bairro").eq("campanha_id", campanhaId).ilike("nome", `%${pessoaSearch.trim()}%`).limit(8);
      setPessoaOptions((data ?? []) as PessoaOption[]);
      setShowDropdown(true);
    }, 250);
    return () => clearTimeout(t);
  }, [pessoaSearch, campanhaId, form.pessoaNome]);

  function selectPessoa(p: PessoaOption) {
    setForm((f) => ({ ...f, pessoa_id: p.id, pessoaNome: p.nome }));
    setPessoaSearch(p.nome);
    setShowDropdown(false);
  }

  function set(field: keyof FormState, value: string) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.pessoa_id) { setError("Selecione uma pessoa."); return; }
    setSaving(true); setError(null);
    const supabase = createClient();
    const data_interacao = new Date(`${form.data_interacao}T${form.data_interacao_time || "00:00"}`).toISOString();
    const retorno_em = form.retorno_em ? new Date(`${form.retorno_em}T${form.retorno_em_time || "09:00"}`).toISOString() : null;
    const payload = { tipo: form.tipo, descricao: form.descricao || null, data_interacao, retorno_em };
    const { error: err } = interacao
      ? await supabase.from("interacoes").update(payload).eq("id", interacao.id)
      : await supabase.from("interacoes").insert({ ...payload, campanha_id: campanhaId, pessoa_id: form.pessoa_id });
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false); onSaved(); onClose();
  }

  async function handleDelete() {
    if (!interacao) return;
    setDeleting(true);
    await createClient().from("interacoes").delete().eq("id", interacao.id);
    setDeleting(false); onSaved(); onClose();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">{interacao ? "Editar interação" : "Registrar interação"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <form id="int-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <style>{`.i-input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;color:hsl(var(--foreground));transition:border-color 0.15s;}.i-input:focus{border-color:#B58A2C;}`}</style>

          <IField label="Pessoa *">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={pessoaSearch}
                onChange={(e) => { setPessoaSearch(e.target.value); if (e.target.value !== form.pessoaNome) set("pessoa_id",""); }}
                placeholder="Buscar pelo nome..."
                disabled={!!interacao}
                className="i-input pl-8"
                autoComplete="off"
              />
              {showDropdown && pessoaOptions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                  {pessoaOptions.map((p) => (
                    <button key={p.id} type="button" onClick={() => selectPessoa(p)} className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-[#F4EFE4]/60 text-left">
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ backgroundColor:"#EBF0F7",color:"#0B1F3A" }}>{initials(p.nome)}</div>
                      <div><p className="text-sm font-medium">{p.nome}</p>{p.bairro && <p className="text-xs text-muted-foreground">{p.bairro}</p>}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </IField>

          <IField label="Tipo">
            <div className="grid grid-cols-3 gap-2">
              {tipoOrdem.map((t) => {
                const cfg = tipoConfig[t];
                const active = form.tipo === t;
                return (
                  <button key={t} type="button" onClick={() => set("tipo",t)}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-all"
                    style={{ backgroundColor: active ? cfg.bg : "hsl(var(--background))", borderColor: active ? cfg.color : "hsl(var(--border))", color: active ? cfg.color : "hsl(var(--muted-foreground))" }}>
                    <span>{cfg.icon}</span>{cfg.label}
                  </button>
                );
              })}
            </div>
          </IField>

          <div className="grid grid-cols-2 gap-3">
            <IField label="Data"><input type="date" value={form.data_interacao} onChange={(e) => set("data_interacao",e.target.value)} className="i-input" /></IField>
            <IField label="Hora"><input type="time" value={form.data_interacao_time} onChange={(e) => set("data_interacao_time",e.target.value)} className="i-input" /></IField>
          </div>

          <IField label="Descrição">
            <textarea value={form.descricao} onChange={(e) => set("descricao",e.target.value)} placeholder="O que foi conversado..." rows={3} className="i-input resize-none" />
          </IField>

          <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5"><Bell className="h-3 w-3" />Agendar retorno (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <IField label="Data"><input type="date" value={form.retorno_em} onChange={(e) => set("retorno_em",e.target.value)} className="i-input" /></IField>
              <IField label="Hora"><input type="time" value={form.retorno_em_time} onChange={(e) => set("retorno_em_time",e.target.value)} className="i-input" /></IField>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          {interacao && !confirmDelete && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" />Excluir</button>
          )}
          {interacao && confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500">Confirmar?</span>
              <button type="button" onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 font-medium hover:underline disabled:opacity-50">{deleting ? "..." : "Sim"}</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:underline">Não</button>
            </div>
          )}
          {!interacao && <span />}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
            <button type="submit" form="int-form" disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-60" style={{ backgroundColor:"#B58A2C" }}>
              {saving ? "Salvando..." : interacao ? "Salvar" : "Registrar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function IField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</label>{children}</div>;
}

type TabFiltro = "todas" | "retorno_pendente";

export default function InteracoesPage() {
  const { campanhaId } = useCampanha();
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFiltro>("todas");
  const [filtroTipo, setFiltroTipo] = useState<InteracaoTipo | "todos">("todos");
  const [page, setPage] = useState(0);
  const [slideOpen, setSlideOpen] = useState(false);
  const [selected, setSelected] = useState<Interacao | null>(null);
  const [pendentes, setPendentes] = useState(0);

  const fetch = useCallback(async () => {
    if (!campanhaId) return;
    setLoading(true);
    const supabase = createClient();

    const [pendResult, listResult] = await Promise.all([
      supabase.from("interacoes").select("id",{count:"exact",head:true}).eq("campanha_id",campanhaId).eq("retorno_feito",false).not("retorno_em","is",null),
      (() => {
        let q = supabase.from("interacoes")
          .select("*, pessoa:pessoa_id(nome,telefone,bairro)", { count:"exact" })
          .eq("campanha_id", campanhaId)
          .order("data_interacao", { ascending: false })
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
        if (tab === "retorno_pendente") { q = q.eq("retorno_feito", false); q = q.not("retorno_em","is",null); }
        if (filtroTipo !== "todos") q = q.eq("tipo", filtroTipo);
        return q;
      })(),
    ]);

    setPendentes(pendResult.count ?? 0);
    setInteracoes((listResult.data ?? []) as Interacao[]);
    setTotal(listResult.count ?? 0);
    setLoading(false);
  }, [campanhaId, tab, filtroTipo, page]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(0); }, [tab, filtroTipo]);

  async function marcarRetorno(i: Interacao, e: React.MouseEvent) {
    e.stopPropagation();
    await createClient().from("interacoes").update({ retorno_feito: true }).eq("id", i.id);
    fetch();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Topbar
        eyebrow="Histórico de relacionamento"
        title="Interações"
        subtitle={`${total.toLocaleString("pt-BR")} interaç${total !== 1 ? "ões" : "ão"}`}
        action={{ label: "Registrar", onClick: () => { setSelected(null); setSlideOpen(true); } }}
      />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-4">

          <div className="flex items-center justify-between gap-3">
            <div className="flex rounded-lg border border-border overflow-hidden text-xs bg-card">
              {([["todas","Todas"], ["retorno_pendente","Retorno pendente"]] as [TabFiltro, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setTab(v)}
                  className="px-3.5 py-2 flex items-center gap-1.5 transition-colors font-medium"
                  style={{ backgroundColor: tab===v ? "#0B1F3A" : "transparent", color: tab===v ? "#F4EFE4" : "hsl(var(--muted-foreground))" }}>
                  {l}
                  {v === "retorno_pendente" && pendentes > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: tab===v ? "#B58A2C" : "hsl(var(--muted))", color: tab===v ? "#fff" : "hsl(var(--foreground))" }}>{pendentes}</span>
                  )}
                </button>
              ))}
            </div>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as InteracaoTipo | "todos")}
              className="text-xs rounded-lg border border-border bg-card px-3 py-2 outline-none text-muted-foreground focus:border-[#B58A2C] transition-colors"
            >
              <option value="todos">Todos os tipos</option>
              {tipoOrdem.map((t) => (
                <option key={t} value={t}>{tipoConfig[t].label}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              Array.from({length:5}).map((_,i) => (
                <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-border/50 animate-pulse">
                  <div className="h-9 w-9 rounded-full bg-muted shrink-0"/>
                  <div className="flex-1 space-y-2"><div className="h-3.5 w-40 rounded bg-muted"/><div className="h-2.5 w-56 rounded bg-muted"/></div>
                  <div className="h-5 w-16 rounded-full bg-muted"/>
                </div>
              ))
            ) : interacoes.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">{tab==="retorno_pendente" ? "Nenhum retorno pendente." : "Nenhuma interação registrada."}</p>
                {tab==="todas" && <button onClick={() => { setSelected(null); setSlideOpen(true); }} className="mt-3 text-xs font-medium" style={{color:"#B58A2C"}}>Registrar primeira interação →</button>}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {interacoes.map((i) => {
                  const cfg = tipoConfig[i.tipo];
                  const ret = i.retorno_em && !i.retorno_feito ? fmtRetorno(i.retorno_em) : null;
                  return (
                    <div key={i.id} onClick={() => { setSelected(i); setSlideOpen(true); }}
                      className="flex items-start gap-4 px-5 py-4 hover:bg-[#F4EFE4]/60 transition-colors cursor-pointer">
                      <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5" style={{backgroundColor:"#EBF0F7",color:"#0B1F3A"}}>
                        {initials(i.pessoa?.nome ?? "?")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{i.pessoa?.nome ?? "—"}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{backgroundColor:cfg.bg,color:cfg.color}}>{cfg.icon} {cfg.label}</span>
                          {i.retorno_feito && <span className="flex items-center gap-1 text-[10px] font-medium" style={{color:"#2D4A2A"}}><Check className="h-2.5 w-2.5"/>Retorno feito</span>}
                          {ret && <span className={`flex items-center gap-1 text-[10px] font-medium ${ret.atrasado ? "text-red-500" : "text-[#6B4E0A]"}`}><Bell className="h-2.5 w-2.5"/>Retorno: {ret.label}</span>}
                        </div>
                        {i.descricao && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{i.descricao}</p>}
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"><Clock className="h-3 w-3"/>{fmtData(i.data_interacao)}</p>
                      </div>
                      {ret && (
                        <button onClick={(e) => marcarRetorno(i, e)}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors hover:bg-[#EDF2EB]"
                          style={{borderColor:"#A8C4A0",color:"#2D4A2A"}}>
                          <Check className="h-3 w-3"/>Feito
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Página {page+1} de {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(0,p-1))} disabled={page===0} className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 bg-card">← Anterior</button>
                <button onClick={() => setPage((p) => Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1} className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 bg-card">Próxima →</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {campanhaId && (
        <SlideOver open={slideOpen} interacao={selected} campanhaId={campanhaId} onClose={() => setSlideOpen(false)} onSaved={fetch} />
      )}
    </>
  );
}
