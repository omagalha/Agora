"use client";

import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useCampanha } from "@/hooks/use-campanha";
import { createClient } from "@/lib/supabase/client";

interface ApoioRow  { grau_apoio: string; count: number }
interface CrescRow  { mes: string; count: number }
interface DemandaRow{ categoria: string; total: number; resolvidas: number }
interface IntRow    { tipo: string; count: number }
interface TerRow    { nome: string; total_contatos: number; apoiadores: number }
interface LidRow    { estimativa_votos: number; pessoa: { nome: string } | null }

const apoioConfig: Record<string, { label: string; color: string }> = {
  apoiador_forte:    { label: "Apoiador forte",  color: "#0B1F3A" },
  apoiador_moderado: { label: "Apoiador",         color: "#33445E" },
  simpatizante:      { label: "Simpatizante",     color: "#7D8CA1" },
  indeciso:          { label: "Indeciso",         color: "#D4B56A" },
  opositor:          { label: "Opositor",         color: "#D4A0A0" },
  nao_classificado:  { label: "Não classificado", color: "#D8D2C6" },
};

const interacaoLabel: Record<string, string> = {
  visita:"Visita", reuniao:"Reunião", ligacao:"Ligação",
  whatsapp:"WhatsApp", evento:"Evento", retorno:"Retorno",
};

const mesesAbrev = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmt(n: number) { return n.toLocaleString("pt-BR"); }
function pct(val: number, max: number) { return max > 0 ? Math.max(2, Math.round((val / max) * 100)) : 0; }

function HBar({ label, value, max, color, sublabel }: { label: string; value: number; max: number; color: string; sublabel?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct(value, max)}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium w-12 text-right shrink-0">{fmt(value)}{sublabel && <span className="text-muted-foreground font-normal"> {sublabel}</span>}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({length:4}).map((_,i) => <div key={i} className="flex items-center gap-3"><div className="h-2.5 w-24 rounded bg-muted"/><div className="flex-1 h-2 rounded-full bg-muted"/><div className="h-2.5 w-10 rounded bg-muted"/></div>)}
    </div>
  );
}

export default function RelatoriosPage() {
  const { campanhaId } = useCampanha();
  const [loading, setLoading] = useState(true);
  const [apoio, setApoio]     = useState<ApoioRow[]>([]);
  const [cresc, setCresc]     = useState<CrescRow[]>([]);
  const [demandas, setDemandas] = useState<DemandaRow[]>([]);
  const [interacoes, setInteracoes] = useState<IntRow[]>([]);
  const [territorios, setTerritorios] = useState<TerRow[]>([]);
  const [liderancas, setLiderancas]   = useState<LidRow[]>([]);
  const [totais, setTotais]           = useState({ pessoas:0, apoiadores:0, demandas:0, eventos:0 });

  const fetch = useCallback(async () => {
    if (!campanhaId) return;
    setLoading(true);
    const sb = createClient();

    const [
      pessoasRes, apoiadoresRes, demandasCount, agendaCount,
      apoioRes, crescRes, demandasCat, intRes, terRes, lidRes,
    ] = await Promise.all([
      sb.from("pessoas").select("id",{count:"exact",head:true}).eq("campanha_id",campanhaId),
      sb.from("pessoas").select("id",{count:"exact",head:true}).eq("campanha_id",campanhaId).in("grau_apoio",["apoiador_forte","apoiador_moderado"]),
      sb.from("demandas").select("id",{count:"exact",head:true}).eq("campanha_id",campanhaId),
      sb.from("agenda_eventos").select("id",{count:"exact",head:true}).eq("campanha_id",campanhaId),

      sb.from("pessoas").select("grau_apoio").eq("campanha_id",campanhaId),
      sb.from("pessoas").select("created_at").eq("campanha_id",campanhaId).gte("created_at", new Date(Date.now()-180*86400000).toISOString()),
      sb.from("vw_demandas_categoria").select("categoria,total,resolvidas").eq("campanha_id",campanhaId).order("total",{ascending:false}).limit(8),
      sb.from("interacoes").select("tipo").eq("campanha_id",campanhaId),
      sb.from("vw_territorio_resumo").select("nome,total_contatos,apoiadores").eq("campanha_id",campanhaId).order("total_contatos",{ascending:false}).limit(8),
      sb.from("liderancas").select("estimativa_votos,pessoa:pessoa_id(nome)").eq("campanha_id",campanhaId).not("estimativa_votos","is",null).order("estimativa_votos",{ascending:false}).limit(8),
    ]);

    setTotais({
      pessoas: pessoasRes.count ?? 0,
      apoiadores: apoiadoresRes.count ?? 0,
      demandas: demandasCount.count ?? 0,
      eventos: agendaCount.count ?? 0,
    });

    const apoioMap: Record<string,number> = {};
    for (const r of apoioRes.data ?? []) apoioMap[r.grau_apoio] = (apoioMap[r.grau_apoio]??0)+1;
    setApoio(Object.entries(apoioMap).map(([grau_apoio,count]) => ({grau_apoio,count})).sort((a,b) => b.count-a.count));

    const mesMap: Record<string,number> = {};
    for (const r of crescRes.data ?? []) {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      mesMap[key] = (mesMap[key]??0)+1;
    }
    const now = new Date();
    const meses6: CrescRow[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      meses6.push({ mes: mesesAbrev[d.getMonth()], count: mesMap[key]??0 });
    }
    setCresc(meses6);

    setDemandas((demandasCat.data ?? []) as DemandaRow[]);

    const intMap: Record<string,number> = {};
    for (const r of intRes.data ?? []) intMap[r.tipo] = (intMap[r.tipo]??0)+1;
    setInteracoes(Object.entries(intMap).map(([tipo,count]) => ({tipo,count})).sort((a,b) => b.count-a.count));

    setTerritorios((terRes.data ?? []) as TerRow[]);
    setLiderancas((lidRes.data ?? []) as unknown as LidRow[]);

    setLoading(false);
  }, [campanhaId]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalPessoas = totais.pessoas;
  const apoiadoresPct = totalPessoas > 0 ? Math.round((totais.apoiadores/totalPessoas)*100) : 0;
  const maxCresc = Math.max(...cresc.map((c) => c.count), 1);
  const maxDemanda = Math.max(...demandas.map((d) => d.total), 1);
  const maxInt = Math.max(...interacoes.map((i) => i.count), 1);
  const maxTer = Math.max(...territorios.map((t) => t.total_contatos), 1);
  const maxVotos = Math.max(...liderancas.map((l) => l.estimativa_votos), 1);
  const totalVotos = liderancas.reduce((s,l) => s+(l.estimativa_votos??0), 0);

  return (
    <>
      <Topbar eyebrow="Análise da campanha" title="Relatórios" />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-5">

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label:"Contatos",   value: fmt(totalPessoas),        sub: totalPessoas > 0 ? `${apoiadoresPct}% apoiadores` : undefined },
              { label:"Apoiadores", value: fmt(totais.apoiadores),   sub: undefined },
              { label:"Demandas",   value: fmt(totais.demandas),     sub: undefined },
              { label:"Eventos",    value: fmt(totais.eventos),      sub: undefined },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">{label}</p>
                <p className="text-2xl font-light" style={{ fontFamily:"var(--font-display),'Cormorant Garamond',Georgia,serif" }}>{value}</p>
                {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

            <Section title="Grau de apoio">
              {loading ? <Skeleton /> : apoio.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> : (
                <div className="space-y-3">
                  {apoio.map((r) => {
                    const cfg = apoioConfig[r.grau_apoio];
                    const p = totalPessoas > 0 ? Math.round((r.count/totalPessoas)*100) : 0;
                    return <HBar key={r.grau_apoio} label={cfg?.label ?? r.grau_apoio} value={r.count} max={totalPessoas} color={cfg?.color ?? "#ccc"} sublabel={`${p}%`} />;
                  })}
                </div>
              )}
            </Section>

            <Section title="Novos contatos (6 meses)">
              {loading ? <Skeleton /> : (
                <div className="flex items-end justify-between gap-1.5 h-32">
                  {cresc.map((c) => (
                    <div key={c.mes} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">{c.count > 0 ? fmt(c.count) : ""}</span>
                      <div className="w-full rounded-t" style={{ height:`${pct(c.count,maxCresc)*1.1}px`, minHeight: c.count>0 ? "4px":"2px", backgroundColor: c.count>0 ? "#B58A2C" : "hsl(var(--muted))" }} />
                      <span className="text-[10px] text-muted-foreground">{c.mes}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Demandas por categoria">
              {loading ? <Skeleton /> : demandas.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> : (
                <div className="space-y-3">
                  {demandas.map((d) => (
                    <div key={d.categoria} className="space-y-1">
                      <HBar label={d.categoria} value={d.total} max={maxDemanda} color="#0B1F3A" sublabel={d.resolvidas > 0 ? `${d.resolvidas} resol.` : undefined} />
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Interações por tipo">
              {loading ? <Skeleton /> : interacoes.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> : (
                <div className="space-y-3">
                  {interacoes.map((i) => (
                    <HBar key={i.tipo} label={interacaoLabel[i.tipo] ?? i.tipo} value={i.count} max={maxInt} color="#33445E" />
                  ))}
                </div>
              )}
            </Section>

            <Section title="Territórios — top contatos">
              {loading ? <Skeleton /> : territorios.length === 0 ? <p className="text-sm text-muted-foreground">Sem territórios.</p> : (
                <div className="space-y-3">
                  {territorios.map((t) => (
                    <HBar key={t.nome} label={t.nome} value={t.total_contatos} max={maxTer} color="#7D8CA1"
                      sublabel={t.apoiadores > 0 ? `${fmt(t.apoiadores)} apo.` : undefined} />
                  ))}
                </div>
              )}
            </Section>

            <Section title={`Lideranças — votos estimados · ${fmt(totalVotos)} total`}>
              {loading ? <Skeleton /> : liderancas.length === 0 ? <p className="text-sm text-muted-foreground">Sem lideranças com estimativa.</p> : (
                <div className="space-y-3">
                  {liderancas.map((l, idx) => (
                    <HBar key={idx} label={l.pessoa?.nome ?? "—"} value={l.estimativa_votos} max={maxVotos} color="#B58A2C" />
                  ))}
                </div>
              )}
            </Section>

          </div>
        </div>
      </main>
    </>
  );
}
