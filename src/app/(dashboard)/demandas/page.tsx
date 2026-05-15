"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useCampanha } from "@/hooks/use-campanha";
import { createClient } from "@/lib/supabase/client";
import { X, Trash2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import type { StatusDemanda } from "@/types";

interface Demanda {
  id: string;
  campanha_id: string;
  titulo: string;
  descricao: string | null;
  categoria: string;
  status: StatusDemanda;
  territorio_id: string | null;
  resolucao: string | null;
  created_at: string;
  updated_at: string;
  territorio?: { nome: string } | null;
}

interface Territorio {
  id: string;
  nome: string;
  tipo: string;
}

const statusConfig: Record<StatusDemanda, { label: string; bg: string; text: string; border: string }> = {
  registrada: { label: "Registrada", bg: "#EBF0F7", text: "#0B1F3A", border: "#B8C2CC" },
  analise:    { label: "Em análise", bg: "#FBF5E8", text: "#6B4E0A", border: "#D4B56A" },
  encaminhada:{ label: "Encaminhada",bg: "#EFF3F7", text: "#2A3F5A", border: "#B0C4D8" },
  respondida: { label: "Respondida", bg: "#EDF2EB", text: "#2D4A2A", border: "#A8C4A0" },
  resolvida:  { label: "Resolvida",  bg: "#E8F5E9", text: "#1B5E20", border: "#81C784" },
};

const statusOrdem: StatusDemanda[] = ["registrada", "analise", "encaminhada", "respondida", "resolvida"];

const categorias = [
  "Saúde", "Educação", "Iluminação", "Asfalto / Vias",
  "Segurança", "Saneamento", "Habitação", "Assistência social",
  "Esporte e lazer", "Meio ambiente", "Outro",
];

const PAGE_SIZE = 20;

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface FormState {
  titulo: string;
  descricao: string;
  categoria: string;
  categoriaCustom: string;
  status: StatusDemanda;
  territorio_id: string;
  resolucao: string;
}

const emptyForm: FormState = {
  titulo: "", descricao: "", categoria: "Outro", categoriaCustom: "",
  status: "registrada", territorio_id: "", resolucao: "",
};

interface SlideOverProps {
  open: boolean;
  demanda: Demanda | null;
  territorios: Territorio[];
  campanhaId: string;
  onClose: () => void;
  onSaved: () => void;
}

function SlideOver({ open, demanda, territorios, campanhaId, onClose, onSaved }: SlideOverProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (demanda) {
      const isCustom = !categorias.includes(demanda.categoria);
      setForm({
        titulo: demanda.titulo,
        descricao: demanda.descricao ?? "",
        categoria: isCustom ? "Outro" : demanda.categoria,
        categoriaCustom: isCustom ? demanda.categoria : "",
        status: demanda.status,
        territorio_id: demanda.territorio_id ?? "",
        resolucao: demanda.resolucao ?? "",
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
    setConfirmDelete(false);
  }, [demanda, open]);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const categoriaFinal = form.categoria === "Outro" && form.categoriaCustom.trim()
      ? form.categoriaCustom.trim()
      : form.categoria;
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao || null,
      categoria: categoriaFinal,
      status: form.status,
      territorio_id: form.territorio_id || null,
      resolucao: form.resolucao || null,
    };
    const { error: err } = demanda
      ? await supabase.from("demandas").update(payload).eq("id", demanda.id)
      : await supabase.from("demandas").insert({ ...payload, campanha_id: campanhaId });
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false);
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!demanda) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("demandas").delete().eq("id", demanda.id);
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
          <h2 className="text-sm font-semibold">{demanda ? "Editar demanda" : "Nova demanda"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form id="demanda-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <style>{`.d-input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;color:hsl(var(--foreground));transition:border-color 0.15s;}.d-input:focus{border-color:#B58A2C;}`}</style>

          <DField label="Título *">
            <input required value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Descreva a demanda brevemente" className="d-input" />
          </DField>

          <DField label="Descrição">
            <textarea value={form.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Detalhes adicionais..." rows={3} className="d-input resize-none" />
          </DField>

          <div className="grid grid-cols-2 gap-3">
            <DField label="Categoria">
              <select value={form.categoria} onChange={(e) => set("categoria", e.target.value)} className="d-input">
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </DField>
            {form.categoria === "Outro" && (
              <DField label="Especificar">
                <input value={form.categoriaCustom} onChange={(e) => set("categoriaCustom", e.target.value)} placeholder="Qual categoria?" className="d-input" />
              </DField>
            )}
          </div>

          <DField label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value as StatusDemanda)} className="d-input">
              {statusOrdem.map((s) => (
                <option key={s} value={s}>{statusConfig[s].label}</option>
              ))}
            </select>
          </DField>

          <DField label="Território (opcional)">
            <select value={form.territorio_id} onChange={(e) => set("territorio_id", e.target.value)} className="d-input">
              <option value="">Sem território</option>
              {territorios.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </DField>

          {(form.status === "respondida" || form.status === "resolvida") && (
            <DField label="Resolução / Resposta">
              <textarea value={form.resolucao} onChange={(e) => set("resolucao", e.target.value)} placeholder="Como foi resolvida ou respondida..." rows={3} className="d-input resize-none" />
            </DField>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          {demanda && !confirmDelete && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />Excluir
            </button>
          )}
          {demanda && confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500">Confirmar?</span>
              <button type="button" onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 font-medium hover:underline disabled:opacity-50">
                {deleting ? "Excluindo..." : "Sim"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:underline">Não</button>
            </div>
          )}
          {!demanda && <span />}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button type="submit" form="demanda-form" disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-60" style={{ backgroundColor: "#B58A2C" }}>
              {saving ? "Salvando..." : demanda ? "Salvar" : "Registrar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function DField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export default function DemandasPage() {
  const { campanhaId } = useCampanha();
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [territorios, setTerritorios] = useState<Territorio[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<StatusDemanda | "todos">("todos");
  const [page, setPage] = useState(0);
  const [slideOpen, setSlideOpen] = useState(false);
  const [selected, setSelected] = useState<Demanda | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    if (!campanhaId) return;
    setExporting(true);
    const supabase = createClient();
    let q = supabase
      .from("demandas")
      .select("titulo,categoria,status,descricao,resolucao,created_at,territorio:territorio_id(nome)")
      .eq("campanha_id", campanhaId)
      .order("created_at", { ascending: false });
    if (filtroStatus !== "todos") q = q.eq("status", filtroStatus);
    const { data } = await q;
    const statusLabel: Record<string, string> = {
      registrada: "Registrada", analise: "Em análise", encaminhada: "Encaminhada",
      respondida: "Respondida", resolvida: "Resolvida",
    };
    const rows = (data ?? []).map((d) => ({
      "Título": d.titulo,
      "Categoria": d.categoria,
      "Status": statusLabel[d.status] ?? d.status,
      "Território": (d.territorio as unknown as { nome: string } | null)?.nome ?? "",
      "Descrição": d.descricao ?? "",
      "Resolução": d.resolucao ?? "",
      "Registrada em": new Date(d.created_at).toLocaleDateString("pt-BR"),
    }));
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(rows, `demandas-${date}.csv`);
    setExporting(false);
  }

  const fetchTerritorios = useCallback(async () => {
    if (!campanhaId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("territorios")
      .select("id,nome,tipo")
      .eq("campanha_id", campanhaId)
      .order("nome");
    setTerritorios((data ?? []) as Territorio[]);
  }, [campanhaId]);

  const fetchDemandas = useCallback(async () => {
    if (!campanhaId) return;
    setLoading(true);
    const supabase = createClient();

    const [countsResult, listResult] = await Promise.all([
      supabase
        .from("demandas")
        .select("status")
        .eq("campanha_id", campanhaId),
      (() => {
        let q = supabase
          .from("demandas")
          .select("*, territorio:territorio_id(nome)", { count: "exact" })
          .eq("campanha_id", campanhaId)
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
        if (filtroStatus !== "todos") q = q.eq("status", filtroStatus);
        return q;
      })(),
    ]);

    const rawCounts: Record<string, number> = { todos: 0 };
    for (const row of countsResult.data ?? []) {
      rawCounts[row.status] = (rawCounts[row.status] ?? 0) + 1;
      rawCounts.todos = (rawCounts.todos ?? 0) + 1;
    }
    setCounts(rawCounts);
    setDemandas((listResult.data ?? []) as Demanda[]);
    setTotal(listResult.count ?? 0);
    setLoading(false);
  }, [campanhaId, filtroStatus, page]);

  useEffect(() => { fetchTerritorios(); }, [fetchTerritorios]);
  useEffect(() => { fetchDemandas(); }, [fetchDemandas]);
  useEffect(() => { setPage(0); }, [filtroStatus]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function openNew() { setSelected(null); setSlideOpen(true); }
  function openEdit(d: Demanda) { setSelected(d); setSlideOpen(true); }

  async function quickStatus(demanda: Demanda, next: StatusDemanda) {
    const supabase = createClient();
    await supabase.from("demandas").update({ status: next }).eq("id", demanda.id);
    fetchDemandas();
  }

  const allFilters: Array<{ value: StatusDemanda | "todos"; label: string }> = [
    { value: "todos", label: "Todas" },
    ...statusOrdem.map((s) => ({ value: s, label: statusConfig[s].label })),
  ];

  return (
    <>
      <Topbar
        eyebrow="Inteligência territorial"
        title="Demandas"
        subtitle={`${(counts.todos ?? 0).toLocaleString("pt-BR")} demanda${(counts.todos ?? 0) !== 1 ? "s" : ""} registrada${(counts.todos ?? 0) !== 1 ? "s" : ""}`}
        action={{ label: "Nova demanda", onClick: openNew }}
        filter={
          <button
            onClick={exportCsv}
            disabled={exporting || (counts.todos ?? 0) === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-card transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-background"
            title="Exportar demandas como CSV"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Exportando…" : "Exportar CSV"}
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-4">

          <div className="flex flex-wrap gap-2">
            {allFilters.map(({ value, label }) => {
              const active = filtroStatus === value;
              const count = counts[value] ?? 0;
              return (
                <button
                  key={value}
                  onClick={() => setFiltroStatus(value)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={{
                    backgroundColor: active ? "#0B1F3A" : "hsl(var(--card))",
                    color: active ? "#F4EFE4" : "hsl(var(--muted-foreground))",
                    borderColor: active ? "#0B1F3A" : "hsl(var(--border))",
                  }}
                >
                  {label}
                  {count > 0 && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: active ? "#B58A2C" : "hsl(var(--muted))", color: active ? "#fff" : "hsl(var(--foreground))" }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-border/50 animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-56 rounded bg-muted" />
                    <div className="h-2.5 w-32 rounded bg-muted" />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-muted" />
                </div>
              ))
            ) : demandas.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  {filtroStatus !== "todos" ? "Nenhuma demanda com esse status." : "Nenhuma demanda registrada."}
                </p>
                {filtroStatus === "todos" && (
                  <button onClick={openNew} className="mt-3 text-xs font-medium" style={{ color: "#B58A2C" }}>
                    Registrar primeira demanda →
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {demandas.map((d) => {
                  const scfg = statusConfig[d.status];
                  const nextStatus = statusOrdem[statusOrdem.indexOf(d.status) + 1];
                  return (
                    <div
                      key={d.id}
                      onClick={() => openEdit(d)}
                      className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-[#F4EFE4]/60 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{d.titulo}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide"
                            style={{ backgroundColor: "#0B1F3A1A", color: "#0B1F3A" }}
                          >
                            {d.categoria}
                          </span>
                          {d.territorio && (
                            <span className="text-xs text-muted-foreground truncate">{(d.territorio as { nome: string }).nome}</span>
                          )}
                          <span className="text-xs text-muted-foreground">{dateLabel(d.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 mt-0.5">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                          style={{ backgroundColor: scfg.bg, color: scfg.text, borderColor: scfg.border }}
                        >
                          {scfg.label}
                        </span>
                        {nextStatus && (
                          <button
                            onClick={(e) => { e.stopPropagation(); quickStatus(d, nextStatus); }}
                            className="text-[10px] text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5 transition-colors"
                            title={`Avançar para ${statusConfig[nextStatus].label}`}
                          >
                            →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 bg-card"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 bg-card"
                >
                  Próxima<ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {campanhaId && (
        <SlideOver
          open={slideOpen}
          demanda={selected}
          territorios={territorios}
          campanhaId={campanhaId}
          onClose={() => setSlideOpen(false)}
          onSaved={fetchDemandas}
        />
      )}
    </>
  );
}
