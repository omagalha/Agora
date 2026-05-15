"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useCampanha } from "@/hooks/use-campanha";
import { createClient } from "@/lib/supabase/client";
import { X, Trash2, Users, ChevronRight } from "lucide-react";

type TeritorioTipo =
  | "estado" | "municipio" | "zona_eleitoral"
  | "bairro" | "distrito" | "comunidade" | "rua";

interface Territorio {
  id: string;
  campanha_id: string;
  nome: string;
  tipo: TeritorioTipo;
  parent_id: string | null;
  meta_contatos: number | null;
  observacoes: string | null;
  total_contatos: number;
  apoiadores: number;
  indecisos: number;
}

const tipoConfig: Record<TeritorioTipo, { label: string; color: string }> = {
  estado:         { label: "Estado",         color: "#0B1F3A" },
  municipio:      { label: "Município",      color: "#33445E" },
  zona_eleitoral: { label: "Zona Eleitoral", color: "#4A6080" },
  bairro:         { label: "Bairro",         color: "#7D8CA1" },
  distrito:       { label: "Distrito",       color: "#7D8CA1" },
  comunidade:     { label: "Comunidade",     color: "#B8C2CC" },
  rua:            { label: "Rua",            color: "#B8C2CC" },
};

const tipoOrdem: TeritorioTipo[] = [
  "estado", "municipio", "zona_eleitoral", "bairro", "distrito", "comunidade", "rua",
];

const fmt = (n: number) => n.toLocaleString("pt-BR");

interface FormState {
  nome: string;
  tipo: TeritorioTipo;
  parent_id: string;
  meta_contatos: string;
  observacoes: string;
}

const emptyForm: FormState = {
  nome: "", tipo: "bairro", parent_id: "", meta_contatos: "", observacoes: "",
};

interface SlideOverProps {
  open: boolean;
  territorio: Territorio | null;
  todos: Territorio[];
  campanhaId: string;
  onClose: () => void;
  onSaved: () => void;
}

function SlideOver({ open, territorio, todos, campanhaId, onClose, onSaved }: SlideOverProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (territorio) {
      setForm({
        nome: territorio.nome,
        tipo: territorio.tipo,
        parent_id: territorio.parent_id ?? "",
        meta_contatos: territorio.meta_contatos?.toString() ?? "",
        observacoes: territorio.observacoes ?? "",
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
    setConfirmDelete(false);
  }, [territorio, open]);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      parent_id: form.parent_id || null,
      meta_contatos: form.meta_contatos ? parseInt(form.meta_contatos) : null,
      observacoes: form.observacoes || null,
    };
    const { error: err } = territorio
      ? await supabase.from("territorios").update(payload).eq("id", territorio.id)
      : await supabase.from("territorios").insert({ ...payload, campanha_id: campanhaId });
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false);
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!territorio) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("territorios").delete().eq("id", territorio.id);
    setDeleting(false);
    onSaved();
    onClose();
  }

  const parentOptions = todos.filter((t) => t.id !== territorio?.id);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">{territorio ? "Editar território" : "Novo território"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form id="territorio-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <style>{`.t-input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;color:hsl(var(--foreground));transition:border-color 0.15s;}.t-input:focus{border-color:#B58A2C;}`}</style>

          <TField label="Nome *">
            <input required value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Nome do território" className="t-input" />
          </TField>

          <TField label="Tipo">
            <select value={form.tipo} onChange={(e) => set("tipo", e.target.value as TeritorioTipo)} className="t-input">
              {tipoOrdem.map((t) => (
                <option key={t} value={t}>{tipoConfig[t].label}</option>
              ))}
            </select>
          </TField>

          <TField label="Território pai (opcional)">
            <select value={form.parent_id} onChange={(e) => set("parent_id", e.target.value)} className="t-input">
              <option value="">Nenhum</option>
              {parentOptions.map((t) => (
                <option key={t.id} value={t.id}>{tipoConfig[t.tipo].label} — {t.nome}</option>
              ))}
            </select>
          </TField>

          <TField label="Meta de contatos">
            <input type="number" min={0} value={form.meta_contatos} onChange={(e) => set("meta_contatos", e.target.value)} placeholder="Número alvo" className="t-input" />
          </TField>

          <TField label="Observações">
            <textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Notas sobre este território..." rows={3} className="t-input resize-none" />
          </TField>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          {territorio && !confirmDelete && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />Excluir
            </button>
          )}
          {territorio && confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500">Confirmar?</span>
              <button type="button" onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 font-medium hover:underline disabled:opacity-50">
                {deleting ? "Excluindo..." : "Sim"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:underline">Não</button>
            </div>
          )}
          {!territorio && <span />}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button type="submit" form="territorio-form" disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-60" style={{ backgroundColor: "#B58A2C" }}>
              {saving ? "Salvando..." : territorio ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function TField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export default function TerritoriosPage() {
  const { campanhaId } = useCampanha();
  const [territorios, setTerritorios] = useState<Territorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideOpen, setSlideOpen] = useState(false);
  const [selected, setSelected] = useState<Territorio | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const fetch = useCallback(async () => {
    if (!campanhaId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("vw_territorio_resumo")
      .select("id,campanha_id,nome,tipo,parent_id,total_contatos,apoiadores,indecisos")
      .eq("campanha_id", campanhaId)
      .order("tipo")
      .order("nome");

    if (data) {
      const supabase2 = createClient();
      const { data: extras } = await supabase2
        .from("territorios")
        .select("id,meta_contatos,observacoes")
        .eq("campanha_id", campanhaId);

      const extMap = new Map((extras ?? []).map((e) => [e.id, e]));
      setTerritorios(
        (data as Territorio[]).map((t) => ({
          ...t,
          meta_contatos: extMap.get(t.id)?.meta_contatos ?? null,
          observacoes: extMap.get(t.id)?.observacoes ?? null,
        }))
      );
    }
    setLoading(false);
  }, [campanhaId]);

  useEffect(() => { fetch(); }, [fetch]);

  function toggleExpand(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openNew() { setSelected(null); setSlideOpen(true); }
  function openEdit(t: Territorio) { setSelected(t); setSlideOpen(true); }

  const raizes = territorios.filter((t) => !t.parent_id);
  const filhos = (parentId: string) => territorios.filter((t) => t.parent_id === parentId);

  function TeritorioRow({ t, depth = 0 }: { t: Territorio; depth?: number }) {
    const children = filhos(t.id);
    const expanded = expandidos.has(t.id);
    const cfg = tipoConfig[t.tipo];
    const pct = t.meta_contatos ? Math.min(100, Math.round((t.total_contatos / t.meta_contatos) * 100)) : null;

    return (
      <>
        <div
          onClick={() => openEdit(t)}
          className="flex items-center gap-3 px-5 py-3 hover:bg-[#F4EFE4]/60 transition-colors cursor-pointer border-b border-border/50 last:border-0"
          style={{ paddingLeft: `${20 + depth * 20}px` }}
        >
          {children.length > 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(t.id); }}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
          ) : (
            <span className="w-3.5 h-3.5 shrink-0" />
          )}

          <span
            className="shrink-0 px-2 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide"
            style={{ backgroundColor: cfg.color + "22", color: cfg.color, border: `1px solid ${cfg.color}44` }}
          >
            {cfg.label}
          </span>

          <span className="flex-1 text-sm font-medium truncate">{t.nome}</span>

          <div className="flex items-center gap-4 shrink-0">
            {pct !== null && (
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#2D4A2A" : "#B58A2C" }} />
                </div>
                <span className="text-[10px] text-muted-foreground w-8">{pct}%</span>
              </div>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground w-16 justify-end">
              <Users className="h-3 w-3" />
              {fmt(t.total_contatos)}
            </span>
            <span className="text-xs w-20 text-right">
              <span className="text-[#2D4A2A]">{fmt(t.apoiadores)}</span>
              <span className="text-muted-foreground"> apo.</span>
            </span>
          </div>
        </div>
        {expanded && children.map((child) => (
          <TeritorioRow key={child.id} t={child} depth={depth + 1} />
        ))}
      </>
    );
  }

  const total = territorios.length;

  return (
    <>
      <Topbar
        eyebrow="Mapa político"
        title="Territórios"
        subtitle={`${total} território${total !== 1 ? "s" : ""} cadastrado${total !== 1 ? "s" : ""}`}
        action={{ label: "Novo território", onClick: openNew }}
      />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-4">

          {loading ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-border/50 animate-pulse">
                  <div className="h-3 w-16 rounded bg-muted" />
                  <div className="h-3 w-40 rounded bg-muted flex-1" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : territorios.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
              <p className="text-sm text-muted-foreground">Nenhum território cadastrado.</p>
              <button onClick={openNew} className="mt-3 text-xs font-medium transition-colors" style={{ color: "#B58A2C" }}>
                Criar primeiro território →
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {(["bairro","municipio","zona_eleitoral"] as TeritorioTipo[]).map((tipo) => {
                  const count = territorios.filter((t) => t.tipo === tipo).length;
                  return (
                    <div key={tipo} className="rounded-xl border border-border bg-card px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">{tipoConfig[tipo].label}s</p>
                      <p className="text-2xl font-light" style={{ fontFamily: "var(--font-display),'Cormorant Garamond',Georgia,serif" }}>{count}</p>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em]">Território</p>
                  <div className="flex items-center gap-12 pr-1">
                    <p className="text-xs text-muted-foreground">Meta</p>
                    <p className="text-xs text-muted-foreground w-16 text-right">Contatos</p>
                    <p className="text-xs text-muted-foreground w-20 text-right">Apoiadores</p>
                  </div>
                </div>
                {raizes.map((t) => (
                  <TeritorioRow key={t.id} t={t} />
                ))}
                {territorios.filter((t) => t.parent_id && !territorios.find((p) => p.id === t.parent_id)).map((t) => (
                  <TeritorioRow key={t.id} t={t} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {campanhaId && (
        <SlideOver
          open={slideOpen}
          territorio={selected}
          todos={territorios}
          campanhaId={campanhaId}
          onClose={() => setSlideOpen(false)}
          onSaved={fetch}
        />
      )}
    </>
  );
}
