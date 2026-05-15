"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useCampanha } from "@/hooks/use-campanha";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, X, Trash2, MapPin, Clock, Check } from "lucide-react";

type EventoTipo =
  | "caminhada" | "reuniao" | "evento" | "live"
  | "visita" | "agenda_religiosa" | "agenda_esportiva"
  | "entrevista" | "outro";

interface Evento {
  id: string;
  campanha_id: string;
  titulo: string;
  tipo: EventoTipo;
  descricao: string | null;
  local: string | null;
  data_inicio: string;
  data_fim: string | null;
  confirmado: boolean;
  presenca_total: number | null;
  observacoes: string | null;
}

const tipoConfig: Record<EventoTipo, { label: string; color: string; bg: string }> = {
  caminhada:        { label: "Caminhada",      color: "#0B1F3A", bg: "#EBF0F7" },
  reuniao:          { label: "Reunião",         color: "#2D4A2A", bg: "#EDF2EB" },
  evento:           { label: "Evento",          color: "#6B4E0A", bg: "#FBF5E8" },
  live:             { label: "Live",            color: "#5A3A7A", bg: "#F3EEF9" },
  visita:           { label: "Visita",          color: "#2A3F5A", bg: "#EFF3F7" },
  agenda_religiosa: { label: "Religioso",       color: "#7A4A0A", bg: "#FDF5EB" },
  agenda_esportiva: { label: "Esportivo",       color: "#1B5E20", bg: "#E8F5E9" },
  entrevista:       { label: "Entrevista",      color: "#7A2020", bg: "#F9EEEE" },
  outro:            { label: "Outro",           color: "#7D8CA1", bg: "#F0EDE8" },
};

const tipoOrdem: EventoTipo[] = [
  "caminhada","reuniao","evento","live","visita",
  "agenda_religiosa","agenda_esportiva","entrevista","outro",
];

const meses = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const diasSemana = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDiaSemana(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "long" });
}

function fmtDia(iso: string) {
  return new Date(iso).getDate();
}

function isoDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface FormState {
  titulo: string;
  tipo: EventoTipo;
  descricao: string;
  local: string;
  data_inicio_date: string;
  data_inicio_time: string;
  data_fim_date: string;
  data_fim_time: string;
  confirmado: boolean;
  presenca_total: string;
  observacoes: string;
}

function toFormState(e: Evento | null, defaultDate: string): FormState {
  if (!e) {
    return {
      titulo: "", tipo: "reuniao", descricao: "", local: "",
      data_inicio_date: defaultDate, data_inicio_time: "09:00",
      data_fim_date: "", data_fim_time: "",
      confirmado: false, presenca_total: "", observacoes: "",
    };
  }
  const ini = new Date(e.data_inicio);
  const fim = e.data_fim ? new Date(e.data_fim) : null;
  return {
    titulo: e.titulo,
    tipo: e.tipo,
    descricao: e.descricao ?? "",
    local: e.local ?? "",
    data_inicio_date: ini.toISOString().slice(0, 10),
    data_inicio_time: `${String(ini.getHours()).padStart(2,"0")}:${String(ini.getMinutes()).padStart(2,"0")}`,
    data_fim_date: fim ? fim.toISOString().slice(0, 10) : "",
    data_fim_time: fim ? `${String(fim.getHours()).padStart(2,"0")}:${String(fim.getMinutes()).padStart(2,"0")}` : "",
    confirmado: e.confirmado,
    presenca_total: e.presenca_total?.toString() ?? "",
    observacoes: e.observacoes ?? "",
  };
}

interface SlideOverProps {
  open: boolean;
  evento: Evento | null;
  defaultDate: string;
  campanhaId: string;
  onClose: () => void;
  onSaved: () => void;
}

function SlideOver({ open, evento, defaultDate, campanhaId, onClose, onSaved }: SlideOverProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(null, defaultDate));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setForm(toFormState(evento, defaultDate));
    setError(null);
    setConfirmDelete(false);
  }, [evento, open, defaultDate]);

  function set(field: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.data_inicio_date) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const data_inicio = new Date(`${form.data_inicio_date}T${form.data_inicio_time || "00:00"}`).toISOString();
    const data_fim = form.data_fim_date
      ? new Date(`${form.data_fim_date}T${form.data_fim_time || "23:59"}`).toISOString()
      : null;

    const payload = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      descricao: form.descricao || null,
      local: form.local || null,
      data_inicio,
      data_fim,
      confirmado: form.confirmado,
      presenca_total: form.presenca_total ? parseInt(form.presenca_total) : null,
      observacoes: form.observacoes || null,
    };

    const { error: err } = evento
      ? await supabase.from("agenda_eventos").update(payload).eq("id", evento.id)
      : await supabase.from("agenda_eventos").insert({ ...payload, campanha_id: campanhaId });

    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false);
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!evento) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("agenda_eventos").delete().eq("id", evento.id);
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
          <h2 className="text-sm font-semibold">{evento ? "Editar evento" : "Novo evento"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form id="agenda-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <style>{`.a-input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;color:hsl(var(--foreground));transition:border-color 0.15s;}.a-input:focus{border-color:#B58A2C;}`}</style>

          <AField label="Título *">
            <input required value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Nome do evento" className="a-input" />
          </AField>

          <AField label="Tipo">
            <select value={form.tipo} onChange={(e) => set("tipo", e.target.value as EventoTipo)} className="a-input">
              {tipoOrdem.map((t) => <option key={t} value={t}>{tipoConfig[t].label}</option>)}
            </select>
          </AField>

          <AField label="Local">
            <input value={form.local} onChange={(e) => set("local", e.target.value)} placeholder="Endereço ou nome do local" className="a-input" />
          </AField>

          <div className="grid grid-cols-2 gap-3">
            <AField label="Data de início *">
              <input required type="date" value={form.data_inicio_date} onChange={(e) => set("data_inicio_date", e.target.value)} className="a-input" />
            </AField>
            <AField label="Horário">
              <input type="time" value={form.data_inicio_time} onChange={(e) => set("data_inicio_time", e.target.value)} className="a-input" />
            </AField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AField label="Data de fim">
              <input type="date" value={form.data_fim_date} onChange={(e) => set("data_fim_date", e.target.value)} className="a-input" />
            </AField>
            <AField label="Horário fim">
              <input type="time" value={form.data_fim_time} onChange={(e) => set("data_fim_time", e.target.value)} className="a-input" />
            </AField>
          </div>

          <AField label="Descrição">
            <textarea value={form.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Detalhes do evento..." rows={3} className="a-input resize-none" />
          </AField>

          <AField label="Presença esperada">
            <input type="number" min={0} value={form.presenca_total} onChange={(e) => set("presenca_total", e.target.value)} placeholder="Número de pessoas" className="a-input" />
          </AField>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set("confirmado", !form.confirmado)}
              className="h-4 w-4 rounded border flex items-center justify-center transition-colors"
              style={{ backgroundColor: form.confirmado ? "#B58A2C" : "transparent", borderColor: form.confirmado ? "#B58A2C" : "hsl(var(--border))" }}
            >
              {form.confirmado && <Check className="h-2.5 w-2.5 text-white" />}
            </div>
            <span className="text-sm text-foreground">Evento confirmado</span>
          </label>

          <AField label="Observações">
            <textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Notas internas..." rows={2} className="a-input resize-none" />
          </AField>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          {evento && !confirmDelete && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />Excluir
            </button>
          )}
          {evento && confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500">Confirmar?</span>
              <button type="button" onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 font-medium hover:underline disabled:opacity-50">
                {deleting ? "Excluindo..." : "Sim"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:underline">Não</button>
            </div>
          )}
          {!evento && <span />}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button type="submit" form="agenda-form" disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-60" style={{ backgroundColor: "#B58A2C" }}>
              {saving ? "Salvando..." : evento ? "Salvar" : "Criar evento"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function AField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export default function AgendaPage() {
  const { campanhaId } = useCampanha();
  const today = new Date();
  const [ano, setAno] = useState(today.getFullYear());
  const [mes, setMes] = useState(today.getMonth());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideOpen, setSlideOpen] = useState(false);
  const [selected, setSelected] = useState<Evento | null>(null);
  const [clickedDate, setClickedDate] = useState("");
  const [viewMode, setViewMode] = useState<"calendario" | "lista">("calendario");

  const fetchEventos = useCallback(async () => {
    if (!campanhaId) return;
    setLoading(true);
    const supabase = createClient();
    const inicio = new Date(ano, mes, 1).toISOString();
    const fim = new Date(ano, mes + 1, 0, 23, 59, 59).toISOString();
    const { data } = await supabase
      .from("agenda_eventos")
      .select("*")
      .eq("campanha_id", campanhaId)
      .gte("data_inicio", inicio)
      .lte("data_inicio", fim)
      .order("data_inicio");
    setEventos((data ?? []) as Evento[]);
    setLoading(false);
  }, [campanhaId, ano, mes]);

  useEffect(() => { fetchEventos(); }, [fetchEventos]);

  function prevMes() {
    if (mes === 0) { setAno((a) => a - 1); setMes(11); }
    else setMes((m) => m - 1);
  }
  function nextMes() {
    if (mes === 11) { setAno((a) => a + 1); setMes(0); }
    else setMes((m) => m + 1);
  }

  function openNew(date?: string) {
    setSelected(null);
    setClickedDate(date ?? today.toISOString().slice(0, 10));
    setSlideOpen(true);
  }
  function openEdit(e: Evento) { setSelected(e); setClickedDate(""); setSlideOpen(true); }

  async function toggleConfirmado(e: Evento, ev: React.MouseEvent) {
    ev.stopPropagation();
    const supabase = createClient();
    await supabase.from("agenda_eventos").update({ confirmado: !e.confirmado }).eq("id", e.id);
    fetchEventos();
  }

  const eventosPorDia = new Map<string, Evento[]>();
  for (const ev of eventos) {
    const key = isoDateKey(ev.data_inicio);
    if (!eventosPorDia.has(key)) eventosPorDia.set(key, []);
    eventosPorDia.get(key)!.push(ev);
  }

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const totalCelulas = Math.ceil((primeiroDia + diasNoMes) / 7) * 7;

  const isHoje = (d: number) => d === today.getDate() && mes === today.getMonth() && ano === today.getFullYear();

  return (
    <>
      <Topbar
        eyebrow="Planejamento"
        title="Agenda"
        subtitle={`${eventos.length} evento${eventos.length !== 1 ? "s" : ""} em ${meses[mes]}`}
        action={{ label: "Novo evento", onClick: () => openNew() }}
        filter={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-1 py-1">
              <button onClick={prevMes} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm font-light px-2 min-w-32 text-center select-none" style={{ fontFamily: "var(--font-display),'Cormorant Garamond',Georgia,serif" }}>
                {meses[mes]} {ano}
              </span>
              <button onClick={nextMes} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => { setAno(today.getFullYear()); setMes(today.getMonth()); }}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors bg-card"
            >
              Hoje
            </button>
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              <button onClick={() => setViewMode("calendario")} className="px-3 py-1.5 transition-colors"
                style={{ backgroundColor: viewMode === "calendario" ? "#0B1F3A" : "hsl(var(--card))", color: viewMode === "calendario" ? "#F4EFE4" : "hsl(var(--muted-foreground))" }}>
                Calendário
              </button>
              <button onClick={() => setViewMode("lista")} className="px-3 py-1.5 transition-colors"
                style={{ backgroundColor: viewMode === "lista" ? "#0B1F3A" : "hsl(var(--card))", color: viewMode === "lista" ? "#F4EFE4" : "hsl(var(--muted-foreground))" }}>
                Lista
              </button>
            </div>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-4">

          {viewMode === "calendario" ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-7 border-b border-border">
                {diasSemana.map((d) => (
                  <div key={d} className="py-2.5 text-center text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-medium">
                    {d}
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="py-20 text-center text-sm text-muted-foreground">Carregando...</div>
              ) : (
                <div className="grid grid-cols-7">
                  {Array.from({ length: totalCelulas }).map((_, i) => {
                    const dia = i - primeiroDia + 1;
                    const valido = dia >= 1 && dia <= diasNoMes;
                    if (!valido) return (
                      <div key={i} className="min-h-[80px] border-b border-r border-border/40 bg-muted/20" />
                    );
                    const dateKey = `${ano}-${String(mes + 1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
                    const evsDia = eventosPorDia.get(dateKey) ?? [];
                    const hoje = isHoje(dia);
                    return (
                      <div
                        key={i}
                        onClick={() => openNew(dateKey)}
                        className="min-h-[80px] border-b border-r border-border/40 p-1.5 cursor-pointer hover:bg-[#F4EFE4]/40 transition-colors"
                      >
                        <div className="flex justify-end mb-1">
                          <span
                            className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium"
                            style={{
                              backgroundColor: hoje ? "#B58A2C" : "transparent",
                              color: hoje ? "#fff" : "hsl(var(--foreground))",
                            }}
                          >
                            {dia}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {evsDia.slice(0, 3).map((ev) => {
                            const cfg = tipoConfig[ev.tipo];
                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                                className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium cursor-pointer hover:opacity-80"
                                style={{ backgroundColor: cfg.bg, color: cfg.color }}
                              >
                                {ev.titulo}
                              </div>
                            );
                          })}
                          {evsDia.length > 3 && (
                            <p className="text-[9px] text-muted-foreground pl-1">+{evsDia.length - 3} mais</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {loading ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Carregando...</div>
              ) : eventos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum evento em {meses[mes]}.</p>
                  <button onClick={() => openNew()} className="mt-3 text-xs font-medium" style={{ color: "#B58A2C" }}>
                    Criar primeiro evento →
                  </button>
                </div>
              ) : (
                (() => {
                  const grupos = new Map<string, Evento[]>();
                  for (const ev of eventos) {
                    const key = isoDateKey(ev.data_inicio);
                    if (!grupos.has(key)) grupos.set(key, []);
                    grupos.get(key)!.push(ev);
                  }
                  return Array.from(grupos.entries()).map(([dateKey, evs]) => {
                    const [y, m, d] = dateKey.split("-").map(Number);
                    const dateObj = new Date(y, m - 1, d);
                    const diaStr = String(d).padStart(2, "0");
                    const semana = fmtDiaSemana(dateObj.toISOString());
                    const hoje = d === today.getDate() && m - 1 === today.getMonth() && y === today.getFullYear();
                    return (
                      <div key={dateKey}>
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                            style={{ backgroundColor: hoje ? "#B58A2C" : "#EBF0F7", color: hoje ? "#fff" : "#0B1F3A" }}
                          >
                            {diaStr}
                          </div>
                          <span className="text-xs font-medium capitalize text-muted-foreground">{semana}</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className="ml-11 space-y-2">
                          {evs.map((ev) => {
                            const cfg = tipoConfig[ev.tipo];
                            return (
                              <div
                                key={ev.id}
                                onClick={() => openEdit(ev)}
                                className="rounded-xl border border-border bg-card px-4 py-3 cursor-pointer hover:bg-[#F4EFE4]/60 transition-colors flex items-start justify-between gap-4"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className="px-2 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide"
                                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                                    >
                                      {cfg.label}
                                    </span>
                                    {ev.confirmado && (
                                      <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "#2D4A2A" }}>
                                        <Check className="h-2.5 w-2.5" />Confirmado
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium truncate">{ev.titulo}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {fmtHora(ev.data_inicio)}
                                      {ev.data_fim && ` – ${fmtHora(ev.data_fim)}`}
                                    </span>
                                    {ev.local && (
                                      <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        {ev.local}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => toggleConfirmado(ev, e)}
                                  className="shrink-0 h-6 w-6 rounded border flex items-center justify-center transition-colors mt-0.5"
                                  style={{
                                    backgroundColor: ev.confirmado ? "#B58A2C" : "transparent",
                                    borderColor: ev.confirmado ? "#B58A2C" : "hsl(var(--border))",
                                  }}
                                  title={ev.confirmado ? "Marcar como não confirmado" : "Confirmar evento"}
                                >
                                  {ev.confirmado && <Check className="h-3 w-3 text-white" />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          )}
        </div>
      </main>

      {campanhaId && (
        <SlideOver
          open={slideOpen}
          evento={selected}
          defaultDate={clickedDate || today.toISOString().slice(0, 10)}
          campanhaId={campanhaId}
          onClose={() => setSlideOpen(false)}
          onSaved={fetchEventos}
        />
      )}
    </>
  );
}
