const BASE_URL = process.env.ASAAS_SANDBOX === "true"
  ? "https://sandbox.asaas.com/api/v3"
  : "https://api.asaas.com/v3";

async function asaas<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { access_token: process.env.ASAAS_API_KEY! },
    next: { revalidate: 300 }, // cache 5 min
  });

  if (!res.ok) throw new Error(`Asaas API error: ${res.status} ${path}`);
  return res.json() as T;
}

export interface AsaasPayment {
  id: string;
  value: number;          // já em R$ (não em centavos)
  status: string;
  dateCreated: string;    // "YYYY-MM-DD"
  paymentDate: string | null;
  dueDate: string;
  billingType: string;
}

export interface AsaasSubscription {
  id: string;
  value: number;
  status: string;
  cycle: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";
}

interface AsaasList<T> {
  data: T[];
  hasMore: boolean;
  totalCount: number;
}

export async function listPayments(params: Record<string, string>) {
  return asaas<AsaasList<AsaasPayment>>("/payments", params);
}

export async function listSubscriptions(params: Record<string, string>) {
  return asaas<AsaasList<AsaasSubscription>>("/subscriptions", params);
}

export function fmtBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
