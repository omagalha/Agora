"use client";

import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import type { DiaFaturamento } from "@/lib/asaas-stats";

interface Props {
  crescimento: { mes: string; total: number }[];
  porCargo:    { cargo: string; total: number }[];
  faturamento?: DiaFaturamento[];
}

const BAR_COLORS = ["#0B1F3A", "#B58A2C", "#2D4A2A", "#5A3A7A", "#6B4E0A", "#2A3F5A", "#7D8CA1"];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};

function fmtBRLShort(v: number) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
}

export function AdminCharts({ crescimento, porCargo, faturamento }: Props) {
  return (
    <div className="space-y-4">

      {/* ── Gráfico de receita diária (Stripe-style) ─── */}
      {faturamento && faturamento.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-0.5">Receita diária</h2>
          <p className="text-xs text-muted-foreground mb-5">Volume faturado nos últimos 30 dias</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={faturamento} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0B1F3A" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0B1F3A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false}
                interval={4}
              />
              <YAxis
                tickFormatter={fmtBRLShort}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(v) => v}
                formatter={(v) => [`R$ ${Number(v ?? 0).toFixed(2)}`, "Receita"]}
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke="#0B1F3A"
                strokeWidth={2}
                fill="url(#gradFat)"
                dot={false}
                activeDot={{ r: 4, fill: "#0B1F3A", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Crescimento + Distribuição por cargo ─────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Campanhas por mês */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-0.5">Campanhas por mês</h2>
          <p className="text-xs text-muted-foreground mb-5">Novas campanhas criadas nos últimos 6 meses</p>

          {crescimento.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Sem dados ainda</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={crescimento} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCrescimento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#B58A2C" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#B58A2C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(v) => `Mês ${v}`}
                  formatter={(v) => [Number(v ?? 0), "Campanhas"]}
                />
                <Area
                  type="monotone" dataKey="total"
                  stroke="#B58A2C" strokeWidth={2}
                  fill="url(#gradCrescimento)"
                  dot={{ fill: "#B58A2C", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribuição por cargo */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-0.5">Distribuição por cargo</h2>
          <p className="text-xs text-muted-foreground mb-5">Campanhas ativas por tipo de mandato</p>

          {porCargo.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Sem dados ainda</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={porCargo} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="cargo" width={96} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v ?? 0), "Campanhas"]} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {porCargo.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}
