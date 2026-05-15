import { createServiceClient } from "@/lib/supabase/service";
import { Building2, Users, UserCheck, TrendingUp, DollarSign, CreditCard, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AdminCharts } from "./charts";
import { fetchFaturamento } from "@/lib/asaas-stats";
import { fmtBRL } from "@/lib/asaas";

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

async function fetchStats() {
  const sb = createServiceClient();

  const [campanhasRes, usuariosRes, contatosRes, byCargoRes, byMesRes] = await Promise.all([
    sb.from("campanhas").select("id", { count: "exact" }).eq("ativa", true),
    sb.from("usuarios_campanhas").select("id", { count: "exact" }).eq("ativo", true),
    sb.from("pessoas").select("id", { count: "exact" }),
    sb.rpc("admin_campanhas_por_cargo"),
    sb.rpc("admin_crescimento_mensal"),
  ]);

  return {
    campanhas: campanhasRes.count ?? 0,
    usuarios:  usuariosRes.count ?? 0,
    contatos:  contatosRes.count ?? 0,
    porCargo:  (byCargoRes.data ?? []) as { cargo: string; total: number }[],
    crescimento: (byMesRes.data ?? []) as { mes: string; total: number }[],
  };
}

const cargoLabel: Record<string, string> = {
  vereador: "Vereador(a)", prefeito: "Prefeito(a)", vice_prefeito: "Vice-Prefeito(a)",
  deputado_estadual: "Dep. Estadual", deputado_federal: "Dep. Federal",
  senador: "Senador(a)", governador: "Governador(a)",
};

export default async function AdminPage() {
  const [stats, fat] = await Promise.all([
    fetchStats(),
    fetchFaturamento().catch(() => null), // não quebra se STRIPE_SECRET_KEY não estiver configurada
  ]);

  const crescimentoData = stats.crescimento.map((r) => ({
    mes: r.mes.slice(5),
    total: r.total,
  }));

  const cargoData = stats.porCargo.map((r) => ({
    cargo: cargoLabel[r.cargo] ?? r.cargo,
    total: r.total,
  }));

  const variacaoMes = fat && fat.totalMesAnterior > 0
    ? ((fat.totalMes - fat.totalMesAnterior) / fat.totalMesAnterior) * 100
    : null;

  const kpis = [
    { label: "Campanhas ativas", value: fmt(stats.campanhas), icon: Building2,  bg: "#EBF0F7", color: "#0B1F3A" },
    { label: "Usuários ativos",  value: fmt(stats.usuarios),  icon: Users,       bg: "#EDF2EB", color: "#2D4A2A" },
    { label: "Contatos totais",  value: fmt(stats.contatos),  icon: UserCheck,   bg: "#FBF5E8", color: "#6B4E0A" },
    { label: "Meses no ar",      value: "1",                  icon: TrendingUp,  bg: "#F3EEF9", color: "#5A3A7A" },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      <div className="border-b border-border px-8 py-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Plataforma</p>
        <h1 className="text-xl font-semibold">Visão Geral</h1>
      </div>

      <div className="flex-1 p-8 space-y-6">

        {/* ── KPIs da plataforma ─────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {kpis.map(({ label, value, icon: Icon, bg, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Faturamento ────────────────────────────────────── */}
        {fat ? (
          <>
            <div className="flex items-center gap-2 pt-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Faturamento</p>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* KPIs financeiros */}
            <div className="grid grid-cols-3 gap-4">
              {/* Total do mês */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#EDF5EE" }}>
                    <DollarSign className="h-4 w-4" style={{ color: "#1A6B2A" }} />
                  </div>
                  {variacaoMes !== null && (
                    <div className={`flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${variacaoMes >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                      {variacaoMes >= 0
                        ? <ArrowUpRight className="h-3 w-3" />
                        : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(variacaoMes).toFixed(1)}%
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold tabular-nums">{fmtBRL(fat.totalMes)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Faturado este mês</p>
                {fat.totalMesAnterior > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Mês anterior: {fmtBRL(fat.totalMesAnterior)}
                  </p>
                )}
              </div>

              {/* MRR */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#EBF0F7" }}>
                    <BarChart3 className="h-4 w-4" style={{ color: "#0B1F3A" }} />
                  </div>
                </div>
                <p className="text-2xl font-bold tabular-nums">{fmtBRL(fat.mrr)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">MRR (Receita recorrente mensal)</p>
              </div>

              {/* Assinaturas */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FBF5E8" }}>
                    <CreditCard className="h-4 w-4" style={{ color: "#6B4E0A" }} />
                  </div>
                </div>
                <p className="text-2xl font-bold tabular-nums">{fat.assinaturasAtivas}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Assinaturas ativas</p>
              </div>
            </div>

            {/* Gráfico de receita diária */}
            <AdminCharts
              crescimento={crescimentoData}
              porCargo={cargoData}
              faturamento={fat.serie}
            />
          </>
        ) : (
          /* Sem Stripe configurado — mostra só os gráficos normais */
          <AdminCharts crescimento={crescimentoData} porCargo={cargoData} />
        )}

      </div>
    </div>
  );
}
