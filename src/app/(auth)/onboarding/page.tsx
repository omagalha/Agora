"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";
import { Check } from "lucide-react";

type CargoDB =
  | "vereador"
  | "vice_prefeito"
  | "prefeito"
  | "deputado_estadual"
  | "governador"
  | "deputado_federal"
  | "senador";

const cargos: { value: CargoDB; label: string; scope: string }[] = [
  { value: "vereador",          label: "Vereador(a)",          scope: "Municipal" },
  { value: "vice_prefeito",     label: "Vice-Prefeito(a)",     scope: "Municipal" },
  { value: "prefeito",          label: "Prefeito(a)",          scope: "Municipal" },
  { value: "deputado_estadual", label: "Deputado(a) Estadual", scope: "Estadual"  },
  { value: "governador",        label: "Governador(a)",        scope: "Estadual"  },
  { value: "deputado_federal",  label: "Deputado(a) Federal",  scope: "Federal"   },
  { value: "senador",           label: "Senador(a)",           scope: "Federal"   },
];

const ufs = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO",
  "MA","MT","MS","MG","PA","PB","PR","PE","PI",
  "RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const scopeColors: Record<string, string> = {
  Municipal: "#33445E",
  Estadual:  "#7D8CA1",
  Federal:   "#0B1F3A",
};


export default function OnboardingPage() {
  const router = useRouter();
  const [cargo, setCargo] = useState<CargoDB | null>(null);
  const [form, setForm] = useState({
    candidato_nome: "",
    nome:           "",
    municipio:      "",
    uf:             "",
    partido:        "",
    numero_urna:    "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [step, setStep]       = useState<1 | 2>(1);

  // Redireciona quem já tem campanha
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("usuarios_campanhas")
      .select("campanha_id")
      .eq("ativo", true)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) router.replace("/painel");
      });
  }, [router]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Auto-preenche nome da campanha quando candidato digita o nome
  function handleCandidatoNome(value: string) {
    set("candidato_nome", value);
    if (!form.nome || form.nome === buildCampanhaNome(form.candidato_nome, cargo)) {
      set("nome", buildCampanhaNome(value, cargo));
    }
  }

  function buildCampanhaNome(candidato: string, c: CargoDB | null) {
    if (!candidato || !c) return "";
    const cargoLabel = cargos.find((x) => x.value === c)?.label ?? c;
    return `${candidato} — ${cargoLabel} ${new Date().getFullYear() + 2}`;
  }

  function handleCargoSelect(c: CargoDB) {
    setCargo(c);
    if (form.candidato_nome) {
      set("nome", buildCampanhaNome(form.candidato_nome, c));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cargo) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    // Cria campanha + vincula o usuario como admin em uma funcao do banco.
    const { error: errCampanha } = await supabase.rpc("criar_campanha", {
      p_nome: form.nome,
      p_candidato_nome: form.candidato_nome,
      p_cargo: cargo,
      p_uf: form.uf,
      p_municipio: form.municipio || null,
      p_partido: form.partido || null,
      p_numero_urna: form.numero_urna || null,
    });

    if (errCampanha) {
      setError(`Erro ao criar campanha: ${errCampanha.message}`);
      setLoading(false);
      return;
    }

    window.location.href = "/painel";
  }

  const scopeGroups = ["Municipal", "Estadual", "Federal"] as const;
  const needsMunicipio = cargo && ["vereador", "vice_prefeito", "prefeito"].includes(cargo);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F4EFE4" }}>

      {/* Header */}
      <header
        className="flex items-center gap-3 px-8 py-4 border-b"
        style={{ backgroundColor: "#0B1F3A", borderColor: "#1E3355" }}
      >
        <Logo size={28} />
      </header>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-3xl">

          {/* Title */}
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: "#B58A2C" }}>
              Configure sua campanha
            </p>
            <h1
              className="text-4xl font-light"
              style={{
                fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                color: "#0B1F3A",
              }}
            >
              Bem-vindo ao Ágora
            </h1>
            <p className="mt-1 text-sm" style={{ color: "#7D8CA1" }}>
              Vamos configurar sua campanha em dois passos simples.
            </p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-3 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: step >= s ? "#0B1F3A" : "#D8D2C6",
                    color: step >= s ? "#F4EFE4" : "#7D8CA1",
                  }}
                >
                  {step > s ? <Check className="h-3 w-3" /> : s}
                </div>
                <span className="text-xs" style={{ color: step >= s ? "#0B1F3A" : "#7D8CA1" }}>
                  {s === 1 ? "Cargo" : "Dados da campanha"}
                </span>
                {s < 2 && <div className="w-8 h-px" style={{ backgroundColor: "#D8D2C6" }} />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>

            {/* ── STEP 1: Cargo ── */}
            {step === 1 && (
              <div className="space-y-6">
                {scopeGroups.map((scope) => (
                  <div key={scope}>
                    <p
                      className="text-[10px] uppercase tracking-[0.15em] mb-2"
                      style={{ color: "#7D8CA1" }}
                    >
                      {scope}
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {cargos.filter((c) => c.scope === scope).map((c) => {
                        const active = cargo === c.value;
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => handleCargoSelect(c.value)}
                            className="relative rounded-xl border px-4 py-3.5 text-left transition-all"
                            style={{
                              backgroundColor: active ? "#0B1F3A" : "#FFFFFF",
                              borderColor:     active ? "#B58A2C" : "#D8D2C6",
                            }}
                          >
                            {active && (
                              <span
                                className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full"
                                style={{ backgroundColor: "#B58A2C" }}
                              >
                                <Check className="h-2.5 w-2.5 text-white" />
                              </span>
                            )}
                            <span
                              className="block text-[9px] uppercase tracking-[0.15em] mb-1"
                              style={{ color: active ? "#B58A2C" : scopeColors[scope] }}
                            >
                              {scope}
                            </span>
                            <span
                              className="block text-sm font-medium"
                              style={{ color: active ? "#F4EFE4" : "#0B1F3A" }}
                            >
                              {c.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={!cargo}
                    onClick={() => setStep(2)}
                    className="rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: "#B58A2C" }}
                  >
                    Continuar →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Dados ── */}
            {step === 2 && (
              <div className="rounded-xl border bg-white p-6 space-y-5" style={{ borderColor: "#D8D2C6" }}>

                <div className="grid grid-cols-2 gap-4">
                  {/* Nome do candidato */}
                  <div className="col-span-2 space-y-1">
                    <label className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
                      Nome do candidato <span style={{ color: "#B58A2C" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.candidato_nome}
                      onChange={(e) => handleCandidatoNome(e.target.value)}
                      placeholder="Nome completo"
                      className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                      style={{ borderColor: "#D8D2C6", color: "#0B1F3A" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#B58A2C")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = "#D8D2C6")}
                    />
                  </div>

                  {/* Nome da campanha */}
                  <div className="col-span-2 space-y-1">
                    <label className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
                      Nome da campanha <span style={{ color: "#B58A2C" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.nome}
                      onChange={(e) => set("nome", e.target.value)}
                      placeholder="Nome da campanha"
                      className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                      style={{ borderColor: "#D8D2C6", color: "#0B1F3A" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#B58A2C")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = "#D8D2C6")}
                    />
                  </div>

                  {/* Município */}
                  {needsMunicipio && (
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
                        Município <span style={{ color: "#B58A2C" }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.municipio}
                        onChange={(e) => set("municipio", e.target.value)}
                        placeholder="Cidade"
                        className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                        style={{ borderColor: "#D8D2C6", color: "#0B1F3A" }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#B58A2C")}
                        onBlur={(e)  => (e.currentTarget.style.borderColor = "#D8D2C6")}
                      />
                    </div>
                  )}

                  {/* UF */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
                      Estado <span style={{ color: "#B58A2C" }}>*</span>
                    </label>
                    <select
                      required
                      value={form.uf}
                      onChange={(e) => set("uf", e.target.value)}
                      className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                      style={{ borderColor: "#D8D2C6", color: form.uf ? "#0B1F3A" : "#7D8CA1" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#B58A2C")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = "#D8D2C6")}
                    >
                      <option value="">Selecione</option>
                      {ufs.map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>

                  {/* Partido */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
                      Partido <span className="normal-case tracking-normal" style={{ color: "#B8C2CC" }}>(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.partido}
                      onChange={(e) => set("partido", e.target.value)}
                      placeholder="Sigla do partido"
                      className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                      style={{ borderColor: "#D8D2C6", color: "#0B1F3A" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#B58A2C")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = "#D8D2C6")}
                    />
                  </div>

                  {/* Número de urna */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
                      Número de urna <span className="normal-case tracking-normal" style={{ color: "#B8C2CC" }}>(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.numero_urna}
                      onChange={(e) => set("numero_urna", e.target.value)}
                      placeholder="Número na urna"
                      className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                      style={{ borderColor: "#D8D2C6", color: "#0B1F3A" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#B58A2C")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = "#D8D2C6")}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-500">{error}</p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-sm transition-colors"
                    style={{ color: "#7D8CA1" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#0B1F3A")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#7D8CA1")}
                  >
                    ← Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: "#B58A2C" }}
                  >
                    {loading ? "Criando campanha…" : "Começar campanha"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
