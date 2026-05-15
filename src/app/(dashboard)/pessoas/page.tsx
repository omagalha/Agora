"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Phone, MapPin, X, Trash2, ChevronLeft, ChevronRight, Download, Upload, Check, FileText, History, MessageSquare } from "lucide-react";
import { useCampanha } from "@/hooks/use-campanha";
import { createClient } from "@/lib/supabase/client";
import { downloadCsv } from "@/lib/csv";
import type { ApoioGrau, CampoPersonalizado, CampoPersonalizadoValor, CamposPersonalizados, Pessoa, TipoInteracao } from "@/types";

const apoioConfig: Record<ApoioGrau, { label: string; bg: string; text: string; border: string }> = {
  apoiador_forte:    { label: "Apoiador forte",  bg: "#EBF0F7", text: "#0B1F3A", border: "#B8C2CC" },
  apoiador_moderado: { label: "Apoiador",         bg: "#EDF2EB", text: "#2D4A2A", border: "#A8C4A0" },
  simpatizante:      { label: "Simpatizante",     bg: "#EFF3F7", text: "#2A3F5A", border: "#B0C4D8" },
  indeciso:          { label: "Indeciso",         bg: "#FBF5E8", text: "#6B4E0A", border: "#D4B56A" },
  opositor:          { label: "Opositor",         bg: "#F9EEEE", text: "#7A2020", border: "#D4A0A0" },
  nao_classificado:  { label: "Não classificado", bg: "#F0EDE8", text: "#7D8CA1", border: "#D8D2C6" },
};

const influenciaLabel: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
const PAGE_SIZE = 20;

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string | null) {
  if (!value) return "Sem contato";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

interface FormState {
  nome: string;
  telefone: string;
  whatsapp: string;
  bairro: string;
  endereco: string;
  secao_eleitoral: string;
  grau_apoio: ApoioGrau;
  influencia: "baixa" | "media" | "alta";
  categoria: string;
  observacoes: string;
  campos_personalizados: CamposPersonalizados;
}

const emptyForm: FormState = {
  nome: "", telefone: "", whatsapp: "", bairro: "", endereco: "", secao_eleitoral: "",
  grau_apoio: "nao_classificado", influencia: "baixa", categoria: "", observacoes: "",
  campos_personalizados: {},
};

type TimelineKind = "interacao" | "demanda" | "auditoria" | "cadastro";

interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  title: string;
  description: string;
  date: string;
  meta?: string;
  status?: string;
  retornoPendente?: boolean;
}

interface TimelineStats {
  interacoes: number;
  demandasAbertas: number;
  ultimoContato: string | null;
  retornosPendentes: number;
}

const interacaoOptions: { value: TipoInteracao; label: string }[] = [
  { value: "visita", label: "Visita" },
  { value: "reuniao", label: "Reuniao" },
  { value: "ligacao", label: "Ligacao" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "evento", label: "Evento" },
  { value: "retorno", label: "Retorno" },
];

const demandaCategorias = [
  "Saude",
  "Iluminacao",
  "Estrada",
  "Transporte",
  "Seguranca",
  "Agua",
  "Limpeza urbana",
  "Educacao",
  "Outro",
];

interface SlideOverProps {
  open: boolean;
  pessoa: Pessoa | null;
  onClose: () => void;
  onSaved: () => void;
  campanhaId: string;
  customFields: CampoPersonalizado[];
}

function SlideOver({ open, pessoa, onClose, onSaved, campanhaId, customFields }: SlideOverProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelineStats, setTimelineStats] = useState<TimelineStats>({
    interacoes: 0,
    demandasAbertas: 0,
    ultimoContato: null,
    retornosPendentes: 0,
  });
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineVersion, setTimelineVersion] = useState(0);
  const [quickInteraction, setQuickInteraction] = useState({
    tipo: "whatsapp" as TipoInteracao,
    descricao: "",
    retorno_em: "",
  });
  const [quickDemand, setQuickDemand] = useState({
    titulo: "",
    categoria: "Saude",
    descricao: "",
  });
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickDemandSaving, setQuickDemandSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (pessoa) {
      setForm({
        nome: pessoa.nome ?? "",
        telefone: pessoa.telefone ?? "",
        whatsapp: pessoa.whatsapp ?? "",
        bairro: pessoa.bairro ?? "",
        endereco: pessoa.endereco ?? "",
        secao_eleitoral: pessoa.secao_eleitoral ?? "",
        grau_apoio: pessoa.grau_apoio ?? "nao_classificado",
        influencia: pessoa.influencia ?? "baixa",
        categoria: pessoa.categoria ?? "",
        observacoes: pessoa.observacoes ?? "",
        campos_personalizados: pessoa.campos_personalizados ?? {},
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
    setConfirmDelete(false);
    setQuickInteraction({ tipo: "whatsapp", descricao: "", retorno_em: "" });
    setQuickDemand({ titulo: "", categoria: "Saude", descricao: "" });
  }, [pessoa, open]);

  useEffect(() => {
    if (!open || !pessoa) {
      setTimeline([]);
      setTimelineStats({ interacoes: 0, demandasAbertas: 0, ultimoContato: null, retornosPendentes: 0 });
      return;
    }

    let cancelled = false;
    const currentPessoa = pessoa;

    async function loadTimeline() {
      setTimelineLoading(true);
      const supabase = createClient();

      const [interacoesRes, demandasRes, auditRes] = await Promise.all([
        supabase
          .from("interacoes")
          .select("id,tipo,descricao,data_interacao,retorno_em,retorno_feito,created_at")
          .eq("campanha_id", campanhaId)
          .eq("pessoa_id", currentPessoa.id)
          .order("data_interacao", { ascending: false })
          .limit(20),
        supabase
          .from("demandas")
          .select("id,titulo,categoria,status,resolucao,created_at,updated_at")
          .eq("campanha_id", campanhaId)
          .eq("pessoa_id", currentPessoa.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("audit_log")
          .select("id,operacao,dados_antes,dados_depois,created_at")
          .eq("campanha_id", campanhaId)
          .eq("tabela", "pessoas")
          .eq("registro_id", currentPessoa.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (cancelled) return;

      const interacoes = (interacoesRes.data ?? []).map((item) => ({
        id: `interacao-${item.id}`,
        kind: "interacao" as const,
        title: `Interacao: ${item.tipo}`,
        description: item.descricao || "Registro sem descricao.",
        date: item.data_interacao ?? item.created_at,
        retornoPendente: Boolean(item.retorno_em && !item.retorno_feito),
        meta: item.retorno_em
          ? item.retorno_feito ? "Retorno feito" : `Retorno pendente em ${formatDateTime(item.retorno_em)}`
          : undefined,
      }));

      const demandas = (demandasRes.data ?? []).map((item) => ({
        id: `demanda-${item.id}`,
        kind: "demanda" as const,
        title: `Demanda: ${item.titulo}`,
        description: item.resolucao || item.categoria || "Demanda registrada.",
        date: item.created_at,
        meta: item.status,
        status: item.status,
      }));

      const auditoria = (auditRes.data ?? []).map((item) => ({
        id: `audit-${item.id}`,
        kind: "auditoria" as const,
        title: item.operacao === "INSERT" ? "Cadastro criado" : item.operacao === "DELETE" ? "Cadastro removido" : "Cadastro atualizado",
        description: item.operacao === "UPDATE" ? "Alteracao registrada na auditoria." : "Evento registrado na auditoria.",
        date: item.created_at,
      }));

      const cadastro: TimelineEntry = {
        id: "cadastro",
        kind: "cadastro",
        title: "Pessoa cadastrada",
        description: "Registro inicial no banco da campanha.",
        date: currentPessoa.created_at,
      };

      setTimelineStats({
        interacoes: interacoes.length,
        demandasAbertas: demandas.filter((item) => !["resolvida", "respondida"].includes(item.status ?? "")).length,
        ultimoContato: interacoes[0]?.date ?? null,
        retornosPendentes: interacoes.filter((item) => item.retornoPendente).length,
      });
      setTimeline([...interacoes, ...demandas, ...auditoria, cadastro].sort((a, b) => (
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )));
      setTimelineLoading(false);
    }

    loadTimeline();

    return () => {
      cancelled = true;
    };
  }, [open, pessoa, campanhaId, timelineVersion]);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setCustomField(field: CampoPersonalizado, value: CampoPersonalizadoValor) {
    setForm((current) => ({
      ...current,
      campos_personalizados: {
        ...current.campos_personalizados,
        [field.chave]: value,
      },
    }));
  }

  function customValue(field: CampoPersonalizado) {
    const value = form.campos_personalizados[field.chave];
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function renderCustomField(field: CampoPersonalizado) {
    const common = {
      required: field.obrigatorio,
      className: "field-input",
    };

    if (field.tipo === "numero") {
      return (
        <input
          {...common}
          type="number"
          value={customValue(field)}
          onChange={(e) => setCustomField(field, e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    }

    if (field.tipo === "data") {
      return (
        <input
          {...common}
          type="date"
          value={customValue(field)}
          onChange={(e) => setCustomField(field, e.target.value || null)}
        />
      );
    }

    if (field.tipo === "booleano") {
      return (
        <select
          {...common}
          value={customValue(field)}
          onChange={(e) => setCustomField(field, e.target.value === "" ? null : e.target.value === "true")}
        >
          <option value="">Selecione</option>
          <option value="true">Sim</option>
          <option value="false">Nao</option>
        </select>
      );
    }

    if (field.tipo === "opcao") {
      return (
        <select
          {...common}
          value={customValue(field)}
          onChange={(e) => setCustomField(field, e.target.value || null)}
        >
          <option value="">Selecione</option>
          {field.opcoes.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }

    return (
      <input
        {...common}
        value={customValue(field)}
        onChange={(e) => setCustomField(field, e.target.value || null)}
      />
    );
  }

  async function handleQuickInteraction() {
    if (!pessoa || !quickInteraction.descricao.trim()) return;

    setQuickSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.from("interacoes").insert({
      campanha_id: campanhaId,
      pessoa_id: pessoa.id,
      tipo: quickInteraction.tipo,
      descricao: quickInteraction.descricao.trim(),
      retorno_em: quickInteraction.retorno_em ? new Date(quickInteraction.retorno_em).toISOString() : null,
      retorno_feito: false,
    });

    if (err) {
      setError(err.message);
      setQuickSaving(false);
      return;
    }

    setQuickInteraction({ tipo: "whatsapp", descricao: "", retorno_em: "" });
    setTimelineVersion((current) => current + 1);
    setQuickSaving(false);
  }

  async function handleQuickDemand() {
    if (!pessoa || !quickDemand.titulo.trim()) return;

    setQuickDemandSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.from("demandas").insert({
      campanha_id: campanhaId,
      pessoa_id: pessoa.id,
      titulo: quickDemand.titulo.trim(),
      categoria: quickDemand.categoria,
      descricao: quickDemand.descricao.trim() || null,
      status: "registrada",
    });

    if (err) {
      setError(err.message);
      setQuickDemandSaving(false);
      return;
    }

    setQuickDemand({ titulo: "", categoria: "Saude", descricao: "" });
    setTimelineVersion((current) => current + 1);
    setQuickDemandSaving(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      nome: form.nome.trim(),
      telefone: form.telefone || null,
      whatsapp: form.whatsapp || null,
      bairro: form.bairro || null,
      endereco: form.endereco || null,
      secao_eleitoral: form.secao_eleitoral || null,
      grau_apoio: form.grau_apoio,
      influencia: form.influencia,
      categoria: form.categoria || null,
      observacoes: form.observacoes || null,
      campos_personalizados: form.campos_personalizados,
    };

    const { error: err } = pessoa
      ? await supabase.from("pessoas").update(payload).eq("id", pessoa.id)
      : await supabase.from("pessoas").insert({ ...payload, campanha_id: campanhaId });

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!pessoa) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("pessoas").delete().eq("id", pessoa.id);
    setDeleting(false);
    onSaved();
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">{pessoa ? "Editar pessoa" : "Nova pessoa"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form id="pessoa-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Nome *">
            <input
              required
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="Nome completo"
              className="field-input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone">
              <input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(00) 00000-0000" className="field-input" />
            </Field>
            <Field label="WhatsApp">
              <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(00) 00000-0000" className="field-input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Bairro">
              <input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} placeholder="Bairro" className="field-input" />
            </Field>
            <Field label="Endereço">
              <input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} placeholder="Rua, número" className="field-input" />
            </Field>
          </div>

          <Field label="Seção eleitoral">
            <input value={form.secao_eleitoral} onChange={(e) => set("secao_eleitoral", e.target.value)} placeholder="Ex: 0042" className="field-input" />
          </Field>

          <Field label="Grau de apoio">
            <select value={form.grau_apoio} onChange={(e) => set("grau_apoio", e.target.value as ApoioGrau)} className="field-input">
              {Object.entries(apoioConfig).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </Field>

          <Field label="Influência">
            <select value={form.influencia} onChange={(e) => set("influencia", e.target.value as "baixa" | "media" | "alta")} className="field-input">
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </Field>

          <Field label="Categoria">
            <input value={form.categoria} onChange={(e) => set("categoria", e.target.value)} placeholder="Ex: líder comunitário" className="field-input" />
          </Field>

          <Field label="Observações">
            <textarea
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              placeholder="Notas sobre esta pessoa..."
              rows={3}
              className="field-input resize-none"
            />
          </Field>

          {pessoa && (
            <div className="grid grid-cols-4 gap-2 border-t border-border pt-4">
              {[
                { label: "Interacoes", value: timelineStats.interacoes.toString() },
                { label: "Demandas abertas", value: timelineStats.demandasAbertas.toString() },
                { label: "Ultimo contato", value: formatShortDate(timelineStats.ultimoContato) },
                { label: "Retornos", value: timelineStats.retornosPendentes.toString() },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-background px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {customFields.length > 0 && (
            <div className="space-y-4 border-t border-border pt-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Campos personalizados</p>
              {customFields.map((field) => (
                <Field key={field.id} label={`${field.rotulo}${field.obrigatorio ? " *" : ""}`}>
                  {renderCustomField(field)}
                </Field>
              ))}
            </div>
          )}

          {pessoa && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Nova interacao</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo">
                  <select
                    value={quickInteraction.tipo}
                    onChange={(e) => setQuickInteraction((current) => ({ ...current, tipo: e.target.value as TipoInteracao }))}
                    className="field-input"
                  >
                    {interacaoOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Retorno">
                  <input
                    type="datetime-local"
                    value={quickInteraction.retorno_em}
                    onChange={(e) => setQuickInteraction((current) => ({ ...current, retorno_em: e.target.value }))}
                    className="field-input"
                  />
                </Field>
              </div>
              <Field label="Descricao">
                <textarea
                  value={quickInteraction.descricao}
                  onChange={(e) => setQuickInteraction((current) => ({ ...current, descricao: e.target.value }))}
                  placeholder="Ex: Conversa por WhatsApp sobre demanda do bairro..."
                  rows={3}
                  className="field-input resize-none"
                />
              </Field>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleQuickInteraction}
                  disabled={quickSaving || !quickInteraction.descricao.trim()}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-white transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "#0B1F3A" }}
                >
                  {quickSaving ? "Registrando..." : "Registrar interacao"}
                </button>
              </div>
            </div>
          )}

          {pessoa && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Nova demanda</p>
              <div className="grid grid-cols-[1fr_150px] gap-3">
                <Field label="Titulo">
                  <input
                    value={quickDemand.titulo}
                    onChange={(e) => setQuickDemand((current) => ({ ...current, titulo: e.target.value }))}
                    placeholder="Ex: Falta de iluminacao na rua"
                    className="field-input"
                  />
                </Field>
                <Field label="Categoria">
                  <select
                    value={quickDemand.categoria}
                    onChange={(e) => setQuickDemand((current) => ({ ...current, categoria: e.target.value }))}
                    className="field-input"
                  >
                    {demandaCategorias.map((categoria) => (
                      <option key={categoria} value={categoria}>{categoria}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Descricao">
                <textarea
                  value={quickDemand.descricao}
                  onChange={(e) => setQuickDemand((current) => ({ ...current, descricao: e.target.value }))}
                  placeholder="Detalhes da demanda relatada..."
                  rows={3}
                  className="field-input resize-none"
                />
              </Field>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleQuickDemand}
                  disabled={quickDemandSaving || !quickDemand.titulo.trim()}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-white transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "#B58A2C" }}
                >
                  {quickDemandSaving ? "Registrando..." : "Registrar demanda"}
                </button>
              </div>
            </div>
          )}

          {pessoa && <Timeline entries={timeline} loading={timelineLoading} />}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          {pessoa && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </button>
          )}
          {pessoa && confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500">Confirmar exclusão?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-500 font-medium hover:underline disabled:opacity-50"
              >
                {deleting ? "Excluindo..." : "Sim"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:underline">
                Não
              </button>
            </div>
          )}
          {!pessoa && <span />}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              form="pessoa-form"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: "#B58A2C" }}
            >
              {saving ? "Salvando..." : pessoa ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

// ── CSV Import ────────────────────────────────────────────────

function TimelineIcon({ kind }: { kind: TimelineKind }) {
  const className = "h-3.5 w-3.5";
  if (kind === "interacao") return <MessageSquare className={className} />;
  if (kind === "demanda") return <FileText className={className} />;
  return <History className={className} />;
}

function Timeline({ entries, loading }: { entries: TimelineEntry[]; loading: boolean }) {
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Linha do tempo</p>
        {loading && <span className="text-[10px] text-muted-foreground">Carregando...</span>}
      </div>

      {!loading && entries.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
          Nenhum evento registrado para esta pessoa ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="grid grid-cols-[28px_1fr] gap-3 rounded-lg border border-border bg-background px-3 py-3">
              <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#EBF0F7] text-[#0B1F3A]">
                <TimelineIcon kind={entry.kind} />
              </div>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium leading-snug">{entry.title}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatDateTime(entry.date)}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.description}</p>
                {entry.meta && (
                  <span className="mt-2 inline-flex rounded-full bg-[#F4EFE4] px-2 py-0.5 text-[10px] text-[#6B4E0A]">
                    {entry.meta}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const COL: Record<string, string> = {
  "nome": "nome", "telefone": "telefone", "whatsapp": "whatsapp",
  "bairro": "bairro", "endereço": "endereco", "endereco": "endereco",
  "seção eleitoral": "secao_eleitoral", "secao eleitoral": "secao_eleitoral",
  "grau de apoio": "grau_apoio",
  "influência": "influencia", "influencia": "influencia",
  "categoria": "categoria", "observações": "observacoes", "observacoes": "observacoes",
};

const APOIO_MAP: Record<string, ApoioGrau> = {
  "apoiador forte": "apoiador_forte", "apoiador_forte": "apoiador_forte",
  "apoiador moderado": "apoiador_moderado", "apoiador_moderado": "apoiador_moderado",
  "apoiador": "apoiador_moderado",
  "simpatizante": "simpatizante", "indeciso": "indeciso", "opositor": "opositor",
  "não classificado": "nao_classificado", "nao classificado": "nao_classificado",
  "nao_classificado": "nao_classificado", "": "nao_classificado",
};

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return text.includes(",") || text.includes('"') || text.includes("\n")
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

function customFieldValueFromText(field: CampoPersonalizado, raw: string): CampoPersonalizadoValor {
  const value = raw.trim();
  if (!value) return null;

  if (field.tipo === "numero") {
    const number = Number(value.replace(",", "."));
    return Number.isFinite(number) ? number : null;
  }

  if (field.tipo === "booleano") {
    const normalized = normalizeHeader(value);
    if (["sim", "s", "true", "1", "yes"].includes(normalized)) return true;
    if (["nao", "n", "false", "0", "no"].includes(normalized)) return false;
    return null;
  }

  return value;
}

function customFieldDisplayValue(value: CampoPersonalizadoValor | undefined) {
  if (value === true) return "Sim";
  if (value === false) return "Nao";
  return value ?? "";
}

interface ParsedRow {
  nome: string; telefone: string; whatsapp: string; bairro: string;
  endereco: string; secao_eleitoral: string; grau_apoio: ApoioGrau;
  influencia: "baixa" | "media" | "alta"; categoria: string; observacoes: string;
  campos_personalizados: CamposPersonalizados;
  _linha: number; _erro: string | null;
}

function parseCsvText(text: string, customFields: CampoPersonalizado[]): ParsedRow[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  function parseRow(line: string): string[] {
    const fields: string[] = [];
    let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (ch === ',' && !inQ) { fields.push(cur); cur = ""; }
      else cur += ch;
    }
    fields.push(cur);
    return fields.map(f => f.trim());
  }

  const headers = parseRow(lines[0]).map(normalizeHeader);
  const customFieldLookup = new Map<string, CampoPersonalizado>();
  customFields.forEach((field) => {
    customFieldLookup.set(normalizeHeader(field.rotulo), field);
    customFieldLookup.set(normalizeHeader(field.chave), field);
  });

  return lines.slice(1).map((line, idx) => {
    const vals = parseRow(line);
    const get = (key: string) => { const i = headers.indexOf(normalizeHeader(key)); return i >= 0 ? (vals[i] ?? "").trim() : ""; };

    const nome = get("nome");
    const grauRaw = get("grau de apoio").toLowerCase();
    const campos_personalizados: CamposPersonalizados = {};

    headers.forEach((header, headerIndex) => {
      const field = customFieldLookup.get(header);
      if (!field) return;
      campos_personalizados[field.chave] = customFieldValueFromText(field, vals[headerIndex] ?? "");
    });
    const infRaw = (get("influência") || get("influencia")).toLowerCase();

    return {
      nome,
      telefone: get("telefone"),
      whatsapp: get("whatsapp"),
      bairro: get("bairro"),
      endereco: get("endereço") || get("endereco"),
      secao_eleitoral: get("seção eleitoral") || get("secao eleitoral"),
      grau_apoio: APOIO_MAP[grauRaw] ?? "nao_classificado",
      influencia: (["baixa","media","alta"].includes(infRaw) ? infRaw : "baixa") as "baixa"|"media"|"alta",
      categoria: get("categoria"),
      campos_personalizados,
      observacoes: get("observações") || get("observacoes"),
      _linha: idx + 2,
      _erro: nome ? null : "Nome obrigatório",
    };
  });
}

function downloadTemplate() {
  const csv = "﻿Nome,Telefone,WhatsApp,Bairro,Endereço,Seção Eleitoral,Grau de Apoio,Influência,Categoria,Observações\n"
    + "João da Silva,(11) 99999-1234,(11) 99999-1234,Centro,Rua das Flores 10,0042,Apoiador forte,Alta,Líder comunitário,Contato da campanha anterior";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "modelo-importacao-pessoas.csv"; a.click();
  URL.revokeObjectURL(url);
}

function downloadTemplateWithFields(customFields: CampoPersonalizado[]) {
  const fixedHeaders = ["Nome", "Telefone", "WhatsApp", "Bairro", "Endereco", "Secao Eleitoral", "Grau de Apoio", "Influencia", "Categoria", "Observacoes"];
  const fixedSample = ["Joao da Silva", "(11) 99999-1234", "(11) 99999-1234", "Centro", "Rua das Flores 10", "0042", "Apoiador forte", "Alta", "Lider comunitario", "Contato da campanha anterior"];
  const customHeaders = customFields.map((field) => field.rotulo);
  const customSample = customFields.map((field) => {
    if (field.tipo === "numero") return "10";
    if (field.tipo === "data") return "2026-05-13";
    if (field.tipo === "booleano") return "Sim";
    if (field.tipo === "opcao") return field.opcoes[0] ?? "";
    return "";
  });
  const csv = "\uFEFF"
    + [...fixedHeaders, ...customHeaders].map(csvEscape).join(",")
    + "\n"
    + [...fixedSample, ...customSample].map(csvEscape).join(",");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "modelo-importacao-pessoas.csv"; a.click();
  URL.revokeObjectURL(url);
}

interface ImportarModalProps {
  open: boolean; campanhaId: string; customFields: CampoPersonalizado[]; onClose: () => void; onImported: () => void;
}

function ImportarModal({ open, campanhaId, customFields, onClose, onImported }: ImportarModalProps) {
  const [step, setStep] = useState<"upload"|"preview"|"importing"|"done">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importCount, setImportCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setStep("upload"); setRows([]); setFileError(null); }
  }, [open]);

  function handleFile(file: File) {
    setFileError(null);
    if (!file.name.toLowerCase().endsWith(".csv")) { setFileError("Selecione um arquivo .csv"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCsvText(e.target?.result as string, customFields);
      if (parsed.length === 0) { setFileError("Arquivo vazio ou sem linhas de dados."); return; }
      setRows(parsed); setStep("preview");
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleImport() {
    setStep("importing");
    const supabase = createClient();
    const valid = rows.filter(r => !r._erro).map(({ _linha, _erro, ...r }) => ({
      ...r,
      campanha_id: campanhaId,
      telefone: r.telefone || null, whatsapp: r.whatsapp || null,
      bairro: r.bairro || null, endereco: r.endereco || null,
      secao_eleitoral: r.secao_eleitoral || null,
      categoria: r.categoria || null, observacoes: r.observacoes || null,
      campos_personalizados: r.campos_personalizados,
    }));
    for (let i = 0; i < valid.length; i += 100) {
      await supabase.from("pessoas").insert(valid.slice(i, i + 100));
    }
    setImportCount(valid.length);
    setStep("done");
    onImported();
  }

  if (!open) return null;

  const valid = rows.filter(r => !r._erro);
  const invalid = rows.filter(r => r._erro);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={step === "importing" ? undefined : onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">Importar pessoas</h2>
          {step !== "importing" && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {step === "upload" && (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-5 py-4 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Passo 1 — Baixe o modelo</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Use a planilha modelo para garantir que as colunas estejam no formato certo.</p>
              <button onClick={() => downloadTemplateWithFields(customFields)} className="flex items-center gap-1.5 text-xs font-medium mt-1 transition-colors" style={{ color: "#B58A2C" }}>
                <Download className="h-3.5 w-3.5" /> Baixar modelo CSV
              </button>
            </div>

            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-5 py-4 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Passo 2 — Envie seu arquivo</p>
              <p className="text-xs text-muted-foreground">Arquivo .csv com até 5.000 linhas.</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
              <button onClick={() => fileRef.current?.click()}
                className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors bg-background">
                <Upload className="h-3.5 w-3.5" /> Selecionar arquivo
              </button>
              {fileError && <p className="text-xs text-red-500">{fileError}</p>}
            </div>

            <div className="rounded-lg border border-border bg-card px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Colunas aceitas</p>
              <div className="space-y-1.5">
                {[
                  ["Nome", "Obrigatório"],
                  ["Telefone / WhatsApp", "Opcional"],
                  ["Bairro / Endereço", "Opcional"],
                  ["Seção Eleitoral", "Opcional"],
                  ["Grau de Apoio", "Apoiador forte · Apoiador · Simpatizante · Indeciso · Opositor"],
                  ["Influência", "Baixa · Media · Alta"],
                  ["Categoria / Observações", "Opcional"],
                ].map(([col, hint]) => (
                  <div key={col} className="flex items-baseline gap-2">
                    <span className="text-xs font-medium shrink-0 w-36">{col}</span>
                    <span className="text-[10px] text-muted-foreground">{hint}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "preview" && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Válidas", value: valid.length, color: "#2D4A2A" },
                  { label: "Com erro", value: invalid.length, color: invalid.length > 0 ? "#7A2020" : "hsl(var(--muted-foreground))" },
                  { label: "Total", value: rows.length, color: "hsl(var(--foreground))" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">{label}</p>
                    <p className="text-2xl font-light" style={{ fontFamily:"var(--font-display),'Cormorant Garamond',Georgia,serif", color }}>{value}</p>
                  </div>
                ))}
              </div>

              {invalid.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50/50 px-4 py-3 space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-red-500 font-medium mb-1">Linhas com erro — serão ignoradas</p>
                  {invalid.slice(0, 5).map(r => (
                    <p key={r._linha} className="text-xs text-red-600">Linha {r._linha}: {r._erro}</p>
                  ))}
                  {invalid.length > 5 && <p className="text-xs text-red-400">…e mais {invalid.length - 5}</p>}
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                  Prévia — {Math.min(5, valid.length)} de {valid.length} linha{valid.length !== 1 ? "s" : ""} válida{valid.length !== 1 ? "s" : ""}
                </p>
                <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/50">
                  {valid.slice(0, 5).map((r, i) => {
                    const cfg = apoioConfig[r.grau_apoio];
                    return (
                      <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ backgroundColor:"#EBF0F7",color:"#0B1F3A" }}>
                          {r.nome.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">{[r.bairro,r.telefone].filter(Boolean).join(" · ") || "—"}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0 border" style={{ backgroundColor:cfg.bg,color:cfg.text,borderColor:cfg.border }}>{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
                {valid.length > 5 && <p className="text-[10px] text-muted-foreground mt-1.5 pl-1">…e mais {valid.length - 5} pessoas</p>}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
              <button type="button" onClick={() => { setStep("upload"); setRows([]); }}
                className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← Voltar
              </button>
              <button onClick={handleImport} disabled={valid.length === 0}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: "#B58A2C" }}>
                Importar {valid.length} pessoa{valid.length !== 1 ? "s" : ""}
              </button>
            </div>
          </>
        )}

        {step === "importing" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 rounded-full border-2 border-[#B58A2C] border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Importando pessoas...</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor:"#EDF2EB" }}>
              <Check className="h-6 w-6" style={{ color:"#2D4A2A" }} />
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">{importCount} pessoa{importCount !== 1 ? "s" : ""} importada{importCount !== 1 ? "s" : ""}!</p>
              <p className="text-xs text-muted-foreground">Os contatos já aparecem na lista.</p>
            </div>
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-white" style={{ backgroundColor:"#B58A2C" }}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function PessoasPage() {
  const { campanhaId } = useCampanha();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [customFields, setCustomFields] = useState<CampoPersonalizado[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroApoio, setFiltroApoio] = useState("todos");
  const [page, setPage] = useState(0);
  const [slideOpen, setSlideOpen] = useState(false);
  const [selected, setSelected] = useState<Pessoa | null>(null);

  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  async function exportCsv() {
    if (!campanhaId) return;
    setExporting(true);
    const supabase = createClient();
    let q = supabase
      .from("pessoas")
      .select("nome,telefone,whatsapp,bairro,endereco,secao_eleitoral,grau_apoio,influencia,categoria,observacoes,campos_personalizados,created_at")
      .eq("campanha_id", campanhaId)
      .order("nome");
    if (busca.trim()) q = q.or(`nome.ilike.%${busca.trim()}%,bairro.ilike.%${busca.trim()}%,telefone.ilike.%${busca.trim()}%`);
    if (filtroApoio !== "todos") q = q.eq("grau_apoio", filtroApoio);
    const { data } = await q;
    const apoioLabel: Record<string, string> = {
      apoiador_forte: "Apoiador forte", apoiador_moderado: "Apoiador",
      simpatizante: "Simpatizante", indeciso: "Indeciso",
      opositor: "Opositor", nao_classificado: "Não classificado",
    };
    let rows = (data ?? []).map((p) => ({
      "Nome": p.nome,
      "Telefone": p.telefone ?? "",
      "WhatsApp": p.whatsapp ?? "",
      "Bairro": p.bairro ?? "",
      "Endereço": p.endereco ?? "",
      "Seção Eleitoral": p.secao_eleitoral ?? "",
      "Grau de Apoio": apoioLabel[p.grau_apoio] ?? p.grau_apoio,
      "Influência": p.influencia ?? "",
      "Categoria": p.categoria ?? "",
      "Observações": p.observacoes ?? "",
      "Cadastrado em": new Date(p.created_at).toLocaleDateString("pt-BR"),
    }));
    rows = rows.map((row, index) => {
      const pessoa = data?.[index];
      const campos = (pessoa?.campos_personalizados ?? {}) as CamposPersonalizados;
      return {
        ...row,
        ...Object.fromEntries(customFields.map((field) => [
          field.rotulo,
          customFieldDisplayValue(campos[field.chave]),
        ])),
      };
    });
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(rows, `pessoas-${date}.csv`);
    setExporting(false);
  }

  const fetchPessoas = useCallback(async () => {
    if (!campanhaId) return;
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("pessoas")
      .select("*", { count: "exact" })
      .eq("campanha_id", campanhaId)
      .order("nome")
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (busca.trim()) q = q.or(`nome.ilike.%${busca.trim()}%,bairro.ilike.%${busca.trim()}%,telefone.ilike.%${busca.trim()}%`);
    if (filtroApoio !== "todos") q = q.eq("grau_apoio", filtroApoio);

    const { data, count } = await q;
    setPessoas((data ?? []) as Pessoa[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [campanhaId, busca, filtroApoio, page]);

  useEffect(() => { fetchPessoas(); }, [fetchPessoas]);

  useEffect(() => {
    if (!campanhaId) return;
    const supabase = createClient();
    supabase
      .from("campos_personalizados")
      .select("*")
      .eq("campanha_id", campanhaId)
      .eq("entidade", "pessoas")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data }) => setCustomFields((data ?? []) as CampoPersonalizado[]));
  }, [campanhaId]);

  useEffect(() => { setPage(0); }, [busca, filtroApoio]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function openNew() { setSelected(null); setSlideOpen(true); }
  function openEdit(p: Pessoa) { setSelected(p); setSlideOpen(true); }

  return (
    <>
      <style>{`.field-input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;color:hsl(var(--foreground));transition:border-color 0.15s;}.field-input:focus{border-color:#B58A2C;}`}</style>

      <Topbar
        eyebrow="Gestão de contatos"
        title="Pessoas"
        subtitle={`${total.toLocaleString("pt-BR")} pessoa${total !== 1 ? "s" : ""} cadastrada${total !== 1 ? "s" : ""}`}
        action={{ label: "Nova pessoa", onClick: openNew }}
        filter={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-card transition-colors bg-background"
              title="Importar pessoas de um arquivo CSV"
            >
              <Upload className="h-3.5 w-3.5" />
              Importar CSV
            </button>
            <button
              onClick={exportCsv}
              disabled={exporting || total === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-card transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-background"
              title="Exportar lista como CSV"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? "Exportando…" : "Exportar CSV"}
            </button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-4">

          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, bairro ou telefone…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8 h-9 bg-card"
              />
            </div>
            <Select value={filtroApoio} onValueChange={(v) => setFiltroApoio(v ?? "todos")}>
              <SelectTrigger className="h-9 w-44 bg-card">
                <SelectValue placeholder="Grau de apoio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os apoios</SelectItem>
                {Object.entries(apoioConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {loading ? "Carregando..." : `${total.toLocaleString("pt-BR")} resultado${total !== 1 ? "s" : ""}`}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-40 rounded bg-muted" />
                      <div className="h-2.5 w-24 rounded bg-muted" />
                    </div>
                    <div className="h-5 w-24 rounded-full bg-muted" />
                  </div>
                ))
              ) : pessoas.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-muted-foreground">
                    {busca || filtroApoio !== "todos"
                      ? "Nenhuma pessoa encontrada com esses filtros."
                      : "Nenhuma pessoa cadastrada ainda."}
                  </p>
                  {!busca && filtroApoio === "todos" && (
                    <button
                      onClick={openNew}
                      className="mt-3 text-xs font-medium transition-colors"
                      style={{ color: "#B58A2C" }}
                    >
                      Adicionar a primeira pessoa →
                    </button>
                  )}
                </div>
              ) : pessoas.map((pessoa) => {
                const cfg = apoioConfig[pessoa.grau_apoio];
                return (
                  <div
                    key={pessoa.id}
                    onClick={() => openEdit(pessoa)}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F4EFE4]/60 transition-colors cursor-pointer"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs font-semibold" style={{ backgroundColor: "#EBF0F7", color: "#0B1F3A" }}>
                        {initials(pessoa.nome)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{pessoa.nome}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {pessoa.telefone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {pessoa.telefone}
                          </span>
                        )}
                        {pessoa.bairro && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {pessoa.bairro}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                        style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
                      >
                        {cfg.label}
                      </span>
                      {pessoa.influencia && (
                        <Badge variant="secondary" className="text-xs bg-[#EDE8DC] text-[#7D8CA1] border-0">
                          {influenciaLabel[pessoa.influencia]}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-card"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-card"
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {campanhaId && (
        <SlideOver
          open={slideOpen}
          pessoa={selected}
          onClose={() => setSlideOpen(false)}
          onSaved={fetchPessoas}
          campanhaId={campanhaId}
          customFields={customFields}
        />
      )}

      {campanhaId && (
        <ImportarModal
          open={importOpen}
          campanhaId={campanhaId}
          customFields={customFields}
          onClose={() => setImportOpen(false)}
          onImported={fetchPessoas}
        />
      )}
    </>
  );
}
