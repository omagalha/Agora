"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { useCampanha } from "@/hooks/use-campanha";
import { createClient } from "@/lib/supabase/client";

interface Kpis { contatos: number; apoiadores: number; indecisos: number; demandas: number; }
interface TerritorioResumo { nome: string; apoiadores: number; }

const hexPresenca = [
  [3,2,3,2,3,2,3,2],[2,3,1,3,2,1,2,3],[3,1,2,3,1,3,2,1],[1,3,2,1,3,2,3,2],[2,1,3,2,1,2,1,3],
];
const presencaColor: Record<number, string> = { 3:"#0B1F3A", 2:"#33445E", 1:"#B8C2CC", 0:"#EDE8DC" };
const fmt = (n: number) => n.toLocaleString("pt-BR");

export default function PainelPage() {
  const { campanha, campanhaId } = useCampanha();
  const [kpis, setKpis] = useState<Kpis>({ contatos:0, apoiadores:0, indecisos:0, demandas:0 });
  const [territorios, setTerritorios] = useState<TerritorioResumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campanhaId) return;
    const supabase = createClient();
    async function fetchData() {
      const [
        { count: c1 }, { count: c2 }, { count: c3 }, { count: c4 }, { data: terr }
      ] = await Promise.all([
        supabase.from("pessoas").select("*",{count:"exact",head:true}).eq("campanha_id",campanhaId),
        supabase.from("pessoas").select("*",{count:"exact",head:true}).eq("campanha_id",campanhaId).in("grau_apoio",["apoiador_forte","apoiador_moderado"]),
        supabase.from("pessoas").select("*",{count:"exact",head:true}).eq("campanha_id",campanhaId).eq("grau_apoio","indeciso"),
        supabase.from("demandas").select("*",{count:"exact",head:true}).eq("campanha_id",campanhaId),
        supabase.from("vw_territorio_resumo").select("nome,apoiadores").eq("campanha_id",campanhaId).order("apoiadores",{ascending:false}).limit(5),
      ]);
      setKpis({ contatos:c1??0, apoiadores:c2??0, indecisos:c3??0, demandas:c4??0 });
      setTerritorios((terr??[]) as TerritorioResumo[]);
      setLoading(false);
    }
    fetchData();
  }, [campanhaId]);

  const maxAp = Math.max(...territorios.map(t=>t.apoiadores),1);
  const today = new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"});

  return (
    <>
      <Topbar
        eyebrow={campanha ? `Candidato(a): ${campanha.candidato_nome}` : ""}
        title="Painel do mandato"
        subtitle={`Visão geral da campanha · ${today}`}
        action={{ label: "Nova ação", onClick: () => {} }}
      />
      <main className="flex-1 overflow-y-auto bg-background p-6">
        <div className="mx-auto max-w-6xl space-y-5">

          <div className="grid grid-cols-4 gap-4">
            {([ ["CONTATOS",kpis.contatos], ["APOIADORES",kpis.apoiadores], ["INDECISOS",kpis.indecisos], ["DEMANDAS",kpis.demandas] ] as [string,number][]).map(([label,value]) => (
              <div key={label} className="rounded-xl border border-border bg-card p-5">
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">{label}</p>
                <p className="text-3xl font-light text-foreground mb-2" style={{fontFamily:"var(--font-display),'Cormorant Garamond',Georgia,serif",fontVariantNumeric:"lining-nums tabular-nums"}}>
                  {loading ? "—" : fmt(value)}
                </p>
                <div className="h-px bg-border" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_320px] gap-4">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <p className="text-sm font-medium">Apoiadores por território</p>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Top 5</Badge>
              </div>
              <div className="px-5 py-4 space-y-4 min-h-[100px]">
                {territorios.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-6">Nenhum território cadastrado ainda.</p>
                  : territorios.map(t => (
                    <div key={t.nome} className="flex items-center gap-4">
                      <div className="w-36 shrink-0"><p className="text-sm truncate">{t.nome}</p></div>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-[#0B1F3A]" style={{width:`${(t.apoiadores/maxAp)*100}%`}} />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right shrink-0">{fmt(t.apoiadores)}</span>
                    </div>
                  ))
                }
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-sm font-medium">Mapa de presença territorial</p>
              </div>
              <div className="p-5">
                <div className="space-y-1">
                  {hexPresenca.map((row,ri) => (
                    <div key={ri} className="flex gap-1" style={{marginLeft:ri%2===1?13:0}}>
                      {row.map((val,ci) => <div key={ci} style={{width:24,height:24,clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",backgroundColor:presencaColor[val]}} />)}
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-1.5">
                  {[["Alta presença","#0B1F3A"],["Média presença","#33445E"],["Baixa presença","#B8C2CC"],["Sem presença","#EDE8DC"]].map(([l,c]) => (
                    <div key={l} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{backgroundColor:c,border:c==="#EDE8DC"?"1px solid #D8D2C6":"none"}} />
                      <span className="text-xs text-muted-foreground">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {kpis.contatos === 0 && !loading && (
            <div className="rounded-xl border border-[#B58A2C]/30 bg-[#B58A2C]/5 px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#B58A2C] mb-2">Começando agora</p>
              <p className="text-sm text-foreground/80">Campanha configurada. Adicione pessoas na aba <strong className="text-foreground">Pessoas</strong> para ver os números reais aqui.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
