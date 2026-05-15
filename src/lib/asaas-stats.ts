import { listPayments, listSubscriptions } from "./asaas";

export interface DiaFaturamento {
  data: string;   // "14/05"
  valor: number;  // em R$
}

export interface FaturamentoStats {
  totalMes: number;
  totalMesAnterior: number;
  mrr: number;
  assinaturasAtivas: number;
  serie: DiaFaturamento[];
}

function toYMD(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toDDMM(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

const MRR_FACTOR: Record<string, number> = {
  WEEKLY:       4.33,
  BIWEEKLY:     2.17,
  MONTHLY:      1,
  QUARTERLY:    1 / 3,
  SEMIANNUALLY: 1 / 6,
  YEARLY:       1 / 12,
};

export async function fetchFaturamento(): Promise<FaturamentoStats> {
  const hoje = new Date();
  const ha30 = new Date(hoje); ha30.setDate(hoje.getDate() - 30);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

  const statusRecebido = "RECEIVED,CONFIRMED";

  const [pag30, pagMesAnt, subs] = await Promise.all([
    // Pagamentos dos últimos 30 dias (recebidos)
    listPayments({
      status: statusRecebido,
      paymentDate: `${toYMD(ha30)}`,
      dateCreatedFrom: toYMD(ha30),
      limit: "100",
    }),
    // Pagamentos do mês anterior para comparação
    listPayments({
      status: statusRecebido,
      dateCreatedFrom: toYMD(inicioMesAnterior),
      dateCreatedTo: toYMD(fimMesAnterior),
      limit: "100",
    }),
    // Assinaturas ativas
    listSubscriptions({ status: "ACTIVE", limit: "100" }),
  ]);

  // ── Série diária ─────────────────────────────────────────────────────────
  const mapa: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - i);
    mapa[toYMD(d)] = 0;
  }
  for (const p of pag30.data) {
    const chave = p.paymentDate ?? p.dateCreated;
    if (chave in mapa) mapa[chave] += p.value;
  }
  const serie: DiaFaturamento[] = Object.entries(mapa).map(([ymd, valor]) => ({
    data: toDDMM(ymd),
    valor,
  }));

  // ── Total do mês corrente ─────────────────────────────────────────────────
  const inicioMesYMD = toYMD(inicioMes);
  const totalMes = pag30.data
    .filter((p) => (p.paymentDate ?? p.dateCreated) >= inicioMesYMD)
    .reduce((s, p) => s + p.value, 0);

  const totalMesAnterior = pagMesAnt.data.reduce((s, p) => s + p.value, 0);

  // ── MRR ──────────────────────────────────────────────────────────────────
  const mrr = subs.data.reduce((s, sub) => {
    return s + sub.value * (MRR_FACTOR[sub.cycle] ?? 1);
  }, 0);

  return {
    totalMes,
    totalMesAnterior,
    mrr,
    assinaturasAtivas: subs.totalCount,
    serie,
  };
}
