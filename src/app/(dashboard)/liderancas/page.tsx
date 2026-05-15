"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useCampanha } from "@/hooks/use-campanha";
import { createClient } from "@/lib/supabase/client";
import { X, Trash2, Search, Phone, MapPin, Users } from "lucide-react";

type LiderancaTipo =
  | "comunitario" | "religioso" | "esportivo" | "empresario"
  | "juventude" | "educacao" | "saude" | "sindical" | "outro";

interface Lideranca {
  id: string;
  campanha_id: string;
  pessoa_id: string;
  tipo: LiderancaTipo;
  descricao: string | null;
  estimativa_votos: number | null;
  pessoa: {
    nome: string;
    telefone: string | null;
    whatsapp: string | null;
    bairro: string | null;
    influencia: string;
    grau_apoio: string;
  };
}

interface PessoaOption {
  id: string;
  nome: string;
  telefone: string | null;
  bairro: string | null;
}

const tipoConfig: Record<LiderancaTipo, { label: string; color: string; bg: string }> = {
  comunitario: { label: "Comunitário",  color: "#0B1F3A", bg: "#EBF0F7" },
  religioso:   { label: "Religioso",   color: "#7A4A0A", bg: "#FDF5EB" },
  esportivo:   { label: "Esportivo",   color: "#1B5E20", bg: "#E8F5E9" },
  empresario:  { label: "Empresário",  color: "#2A3F5A", bg: "#EFF3F7" },
  juventude:   { label: "Juventude",   color: "#5A3A7A", bg: "#F3EEF9" },
  educacao:    { label: "Educação",    color: "#33445E", bg: "#ECF0F5" },
  saude:       { label: "Saúde",       color: "#7A2020", bg: "#F9EEEE" },
  sindical:    { label: "Sindical",    color: "#6B4E0A", bg: "#FBF5E8" },
  outro:       { label: "Outro",       color: "#7D8CA1", bg: "#F0EDE8" },
};

const tipoOrdem: LiderancaTipo[] = [
  "comunitario","religioso","esportivo","empresario",
  "juventude","educacao","saude","sindical","outro",
];

const influenciaLabel: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

interface FormState {
  pessoa_id: string;
  pessoaNome: string;
  tipo: LiderancaTipo;
  descricao: string;
  estimativa_votos: string;
}

const emptyForm: FormState = {
  pessoa_id: "", pessoaNome: "", tipo: "comunitario", descricao: "", estimativa_votos: "",
};

interface SlideOverProps {
  open: boolean;
  lideranca: Lideranca | null;
  campanhaId: string;
  onClose: () => void;
  onSaved: () => void;
}

function SlideOver({ open, lideranca, campanhaId, onClose, onSaved }: SlideOverProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pessoaSearch, setPessoaSearch] = useState("");
  const [pessoaOptions, setPessoaOptions] = useState<PessoaOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lideranca) {
      setForm({
        pessoa_id: lideranca.pessoa_id,
        pessoaNome: lideranca.pessoa.nome,
        tipo: lideranca.tipo,
        descricao: lideranca.descricao ?? "",
        estimativa_votos: lideranca.estimativa_votos?.toString() ?? "",
      });
      setPessoaSearch(lideranca.pessoa.nome);
    } else {
      setForm(emptyForm);
      setPessoaSearch("");
    }
    setError(null);
    setConfirmDelete(false);
    setPessoaOptions([]);
    setShowDropdown(false);
  }, [lideranca, open]);

  useEffect(() => {
    if (!pessoaSearch.trim() || pessoaSearch === form.pessoaNome) {
      setPessoaOptions([]);
      setShowDropdown(false);
      return;
    }
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("pessoas")
        .select("id,nome,telefone,bairro")
        .eq("campanha_id", campanhaId)
        .ilike("nome", `%${pessoaSearch.trim()}%`)
        .limit(8);
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

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.pessoa_id) { setError("Selecione uma pessoa."); return; }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      tipo: form.tipo,
      descricao: form.descricao || null,
      estimativa_votos: form.estimativa_votos ? parseInt(form.estimativa_votos) : null,
    };
    const { error: err } = lideranca
      ? await supabase.from("liderancas").update(payload).eq("id", lideranca.id)
      : await supabase.from("liderancas").insert({ ...payload, campanha_id: campanhaId, pessoa_id: form.pessoa_id });
    if (err) {
      setError(err.code === "23505" ? "Essa pessoa já é uma liderança nesta campanha." : err.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!lideranca) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("liderancas").delete().eq("id", lideranca.id);
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
          <h2 className="text-sm font-semibold">{lideranca ? "Editar liderança" : "Nova liderança"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form id="lideranca-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <style>{`.l-input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;color:hsl(var(--foreground));transition:border-color 0.15s;}.l-input:focus{border-color:#B58A2C;}`}</style>

          <LField label="Pessoa *">
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchRef}
                  value={pessoaSearch}
                  onChange={(e) => { setPessoaSearch(e.target.value); if (e.target.value !== form.pessoaNome) set("pessoa_id", ""); }}
                  placeholder={lideranca ? lideranca.pessoa.nome : "Buscar pelo nome..."}
                  disabled={!!lideranca}
                  className="l-input pl-8"
                  autoComplete="off"
                />
              </div>
              {showDropdown && pessoaOptions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                  {pessoaOptions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPessoa(p)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-[#F4EFE4]/60 transition-colors text-left"
                    >
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ backgroundColor: "#EBF0F7", color: "#0B1F3A" }}>
                        {initials(p.nome)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.nome}</p>
                        {(p.telefone || p.bairro) && (
                          <p className="text-xs text-muted-foreground">{[p.bairro, p.telefone].filter(Boolean).join(" · ")}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && pessoaOptions.length === 0 && pessoaSearch.length > 1 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Nenhuma pessoa encontrada.</p>
                </div>
              )}
            </div>
          </LField>

          <LField label="Tipo de liderança">
            <select value={form.tipo} onChange={(e) => set("tipo", e.target.value as LiderancaTipo)} className="l-input">
              {tipoOrdem.map((t) => <option key={t} value={t}>{tipoConfig[t].label}</option>)}
            </select>
          </LField>

          <LField label="Estimativa de votos">
            <input type="number" min={0} value={form.estimativa_votos} onChange={(e) => set("estimativa_votos", e.target.value)} placeholder="Quantos votos pode mobilizar" className="l-input" />
          </LField>

          <LField label="Descrição">
            <textarea value={form.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Contexto sobre esta liderança..." rows={3} className="l-input resize-none" />
          </LField>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          {lideranca && !confirmDelete && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />Excluir
            </button>
          )}
          {lideranca && confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500">Confirmar?</span>
              <button type="button" onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 font-medium hover:underline disabled:opacity-50">
                {deleting ? "Excluindo..." : "Sim"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:underline">Não</button>
            </div>
          )}
          {!lideranca && <span />}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button type="submit" form="lideranca-form" disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-60" style={{ backgroundColor: "#B58A2C" }}>
              {saving ? "Salvando..." : lideranca ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function LField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export default function LiderancasPage() {
  const { campanhaId } = useCampanha();
  const [liderancas, setLiderancas] = useState<Lideranca[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<LiderancaTipo | "todos">("todos");
  const [slideOpen, setSlideOpen] = useState(false);
  const [selected, setSelected] = useState<Lideranca | null>(null);

  const fetch = useCallback(async () => {
    if (!campanhaId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("liderancas")
      .select("*, pessoa:pessoa_id(nome,telefone,whatsapp,bairro,influencia,grau_apoio)")
      .eq("campanha_id", campanhaId)
      .order("estimativa_votos", { ascending: false, nullsFirst: false });
    setLiderancas((data ?? []) as Lideranca[]);
    setLoading(false);
  }, [campanhaId]);

  useEffect(() => { fetch(); }, [fetch]);

  function openNew() { setSelected(null); setSlideOpen(true); }
  function openEdit(l: Lideranca) { setSelected(l); setSlideOpen(true); }

  const filtradas = filtroTipo === "todos"
    ? liderancas
    : liderancas.filter((l) => l.tipo === filtroTipo);

  const totalVotos = liderancas.reduce((s, l) => s + (l.estimativa_votos ?? 0), 0);
  const porTipo = tipoOrdem.map((t) => ({ tipo: t, count: liderancas.filter((l) => l.tipo === t).length })).filter((x) => x.count > 0);

  return (
    <>
      <Topbar
        eyebrow="Rede de influência"
        title="Lideranças"
        subtitle={`${liderancas.length} liderança${liderancas.length !== 1 ? "s" : ""} · ${fmt(totalVotos)} votos estimados`}
        action={{ label: "Nova liderança", onClick: openNew }}
      />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-4">

          {!loading && liderancas.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Total</p>
                <p className="text-2xl font-light" style={{ fontFamily: "var(--font-display),'Cormorant Garamond',Georgia,serif" }}>{liderancas.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Votos estimados</p>
                <p className="text-2xl font-light" style={{ fontFamily: "var(--font-display),'Cormorant Garamond',Georgia,serif" }}>{fmt(totalVotos)}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Por tipo</p>
                <div className="flex flex-wrap gap-1.5">
                  {porTipo.map(({ tipo, count }) => {
                    const cfg = tipoConfig[tipo];
                    return (
                      <span key={tipo} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                        {cfg.label} {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroTipo("todos")}
              className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
              style={{
                backgroundColor: filtroTipo === "todos" ? "#0B1F3A" : "hsl(var(--card))",
                color: filtroTipo === "todos" ? "#F4EFE4" : "hsl(var(--muted-foreground))",
                borderColor: filtroTipo === "todos" ? "#0B1F3A" : "hsl(var(--border))",
              }}
            >
              Todos
            </button>
            {tipoOrdem.filter((t) => liderancas.some((l) => l.tipo === t)).map((tipo) => {
              const cfg = tipoConfig[tipo];
              const active = filtroTipo === tipo;
              return (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={{
                    backgroundColor: active ? cfg.color : "hsl(var(--card))",
                    color: active ? "#fff" : "hsl(var(--muted-foreground))",
                    borderColor: active ? cfg.color : "hsl(var(--border))",
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/50 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-40 rounded bg-muted" />
                    <div className="h-2.5 w-24 rounded bg-muted" />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-muted" />
                </div>
              ))
            ) : filtradas.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  {liderancas.length === 0 ? "Nenhuma liderança cadastrada." : "Nenhuma liderança com esse tipo."}
                </p>
                {liderancas.length === 0 && (
                  <button onClick={openNew} className="mt-3 text-xs font-medium" style={{ color: "#B58A2C" }}>
                    Adicionar primeira liderança →
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filtradas.map((l) => {
                  const cfg = tipoConfig[l.tipo];
                  return (
                    <div
                      key={l.id}
                      onClick={() => openEdit(l)}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-[#F4EFE4]/60 transition-colors cursor-pointer"
                    >
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                        style={{ backgroundColor: "#EBF0F7", color: "#0B1F3A" }}
                      >
                        {initials(l.pessoa.nome)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{l.pessoa.nome}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {l.pessoa.telefone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />{l.pessoa.telefone}
                            </span>
                          )}
                          {l.pessoa.bairro && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />{l.pessoa.bairro}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {l.estimativa_votos != null && (
                          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {fmt(l.estimativa_votos)}
                          </span>
                        )}
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                          style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color + "44" }}
                        >
                          {cfg.label}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{ backgroundColor: "#EBF0F7", color: "#0B1F3A" }}
                        >
                          {influenciaLabel[l.pessoa.influencia] ?? l.pessoa.influencia}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {campanhaId && (
        <SlideOver
          open={slideOpen}
          lideranca={selected}
          campanhaId={campanhaId}
          onClose={() => setSlideOpen(false)}
          onSaved={fetch}
        />
      )}
    </>
  );
}
