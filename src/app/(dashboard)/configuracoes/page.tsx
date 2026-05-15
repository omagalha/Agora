"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Lock,
  Mail,
  Plus,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  User,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { useCampanha } from "@/hooks/use-campanha";
import { createClient } from "@/lib/supabase/client";
import type { CampoPersonalizado, CampoPersonalizadoTipo } from "@/types";

type CargoDB =
  | "vereador"
  | "vice_prefeito"
  | "prefeito"
  | "deputado_estadual"
  | "governador"
  | "deputado_federal"
  | "senador";

type Configuracoes = {
  convites_requerem_aprovacao?: boolean;
  validade_convite_dias?: number;
  permitir_link_generico?: boolean;
  notificar_novos_convites?: boolean;
  lembrete_tarefas_atrasadas?: boolean;
  escopo_padrao_territorio?: "bairro" | "zona_eleitoral" | "municipio";
  lgpd_reter_auditoria?: boolean;
};

const cargos: { value: CargoDB; label: string }[] = [
  { value: "vereador", label: "Vereador(a)" },
  { value: "vice_prefeito", label: "Vice-Prefeito(a)" },
  { value: "prefeito", label: "Prefeito(a)" },
  { value: "deputado_estadual", label: "Deputado(a) Estadual" },
  { value: "governador", label: "Governador(a)" },
  { value: "deputado_federal", label: "Deputado(a) Federal" },
  { value: "senador", label: "Senador(a)" },
];

const ufs = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const defaultConfig: Required<Configuracoes> = {
  convites_requerem_aprovacao: true,
  validade_convite_dias: 7,
  permitir_link_generico: true,
  notificar_novos_convites: true,
  lembrete_tarefas_atrasadas: true,
  escopo_padrao_territorio: "bairro",
  lgpd_reter_auditoria: true,
};

const fieldTypes: { value: CampoPersonalizadoTipo; label: string }[] = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Numero" },
  { value: "data", label: "Data" },
  { value: "booleano", label: "Sim/Nao" },
  { value: "opcao", label: "Lista" },
];

function makeFieldKey(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-background px-3 py-3 text-left transition-colors hover:bg-[#F4EFE4]/50"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <span
        className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
        style={{ backgroundColor: checked ? "#0B1F3A" : "#D8D2C6" }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
        />
      </span>
    </button>
  );
}

export default function ConfiguracoesPage() {
  const { campanhaId } = useCampanha();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [membroId, setMembroId] = useState<string | null>(null);
  const [perfil, setPerfil] = useState("");
  const [conta, setConta] = useState({ nome_exibicao: "" });
  const [campanhaForm, setCampanhaForm] = useState({
    nome: "",
    candidato_nome: "",
    cargo: "vereador" as CargoDB,
    municipio: "",
    uf: "",
    partido: "",
    numero_urna: "",
  });
  const [config, setConfig] = useState<Required<Configuracoes>>(defaultConfig);
  const [customFields, setCustomFields] = useState<CampoPersonalizado[]>([]);
  const [fieldForm, setFieldForm] = useState({
    rotulo: "",
    tipo: "texto" as CampoPersonalizadoTipo,
    opcoes: "",
    obrigatorio: false,
  });
  const [fieldSaving, setFieldSaving] = useState(false);

  useEffect(() => {
    if (!campanhaId) return;

    async function load() {
      setLoading(true);
      const supabase = createClient();
      const [{ data: authData }, campanhaRes, membroRes, camposRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("campanhas")
          .select("nome,candidato_nome,cargo,municipio,uf,partido,numero_urna,configuracoes")
          .eq("id", campanhaId)
          .single(),
        supabase
          .from("usuarios_campanhas")
          .select("id,perfil,nome_exibicao")
          .eq("campanha_id", campanhaId)
          .eq("ativo", true)
          .single(),
        supabase
          .from("campos_personalizados")
          .select("*")
          .eq("campanha_id", campanhaId)
          .eq("entidade", "pessoas")
          .order("ordem", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      const user = authData.user;
      setUserId(user?.id ?? null);
      setEmail(user?.email ?? "");
      const metadataName =
        user?.user_metadata?.nome_exibicao ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        "";

      if (campanhaRes.data) {
        const data = campanhaRes.data;
        setCampanhaForm({
          nome: data.nome ?? "",
          candidato_nome: data.candidato_nome ?? "",
          cargo: data.cargo as CargoDB,
          municipio: data.municipio ?? "",
          uf: data.uf ?? "",
          partido: data.partido ?? "",
          numero_urna: data.numero_urna ?? "",
        });
        setConfig({ ...defaultConfig, ...((data.configuracoes as Configuracoes | null) ?? {}) });
      }

      if (membroRes.data) {
        setMembroId(membroRes.data.id);
        setPerfil(membroRes.data.perfil ?? "");
        setConta({ nome_exibicao: membroRes.data.nome_exibicao || metadataName });
      } else {
        setConta({ nome_exibicao: metadataName });
      }

      setCustomFields((camposRes.data ?? []) as CampoPersonalizado[]);

      setLoading(false);
    }

    load();
  }, [campanhaId]);

  function setCampanha(field: keyof typeof campanhaForm, value: string) {
    setCampanhaForm((current) => ({ ...current, [field]: value }));
  }

  function setCfg<K extends keyof Required<Configuracoes>>(field: K, value: Required<Configuracoes>[K]) {
    setConfig((current) => ({ ...current, [field]: value }));
  }

  async function addCustomField() {
    if (!campanhaId || !fieldForm.rotulo.trim()) return;

    const chave = makeFieldKey(fieldForm.rotulo);
    if (chave.length < 2) {
      setError("Informe um nome de campo com pelo menos duas letras.");
      return;
    }

    setFieldSaving(true);
    setError(null);

    const supabase = createClient();
    const opcoes = fieldForm.tipo === "opcao"
      ? fieldForm.opcoes.split(",").map((item) => item.trim()).filter(Boolean)
      : [];

    if (fieldForm.tipo === "opcao" && opcoes.length < 2) {
      setError("Campos do tipo lista precisam de pelo menos duas opcoes separadas por virgula.");
      setFieldSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("campos_personalizados")
      .insert({
        campanha_id: campanhaId,
        entidade: "pessoas",
        chave,
        rotulo: fieldForm.rotulo.trim(),
        tipo: fieldForm.tipo,
        opcoes,
        obrigatorio: fieldForm.obrigatorio,
        ordem: customFields.length,
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
      setFieldSaving(false);
      return;
    }

    setCustomFields((current) => [...current, data as CampoPersonalizado]);
    setFieldForm({ rotulo: "", tipo: "texto", opcoes: "", obrigatorio: false });
    setFieldSaving(false);
  }

  async function disableCustomField(field: CampoPersonalizado) {
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("campos_personalizados")
      .update({ ativo: false })
      .eq("id", field.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setCustomFields((current) => current.map((item) => (
      item.id === field.id ? { ...item, ativo: false } : item
    )));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!campanhaId) return;

    setSaving(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const { error: campanhaError } = await supabase
      .from("campanhas")
      .update({
        nome: campanhaForm.nome.trim(),
        candidato_nome: campanhaForm.candidato_nome.trim(),
        cargo: campanhaForm.cargo,
        municipio: campanhaForm.municipio.trim() || null,
        uf: campanhaForm.uf,
        partido: campanhaForm.partido.trim() || null,
        numero_urna: campanhaForm.numero_urna.trim() || null,
        configuracoes: config,
      })
      .eq("id", campanhaId);

    if (campanhaError) {
      setError(campanhaError.message);
      setSaving(false);
      return;
    }

    if (userId) {
      await supabase.auth.updateUser({
        data: { nome_exibicao: conta.nome_exibicao.trim() || null },
      });
    }

    if (membroId) {
      await supabase
        .from("usuarios_campanhas")
        .update({ nome_exibicao: conta.nome_exibicao.trim() || null })
        .eq("id", membroId);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <>
      <Topbar
        eyebrow="Administração"
        title="Configurações"
        subtitle="Dados da campanha, acesso e preferências operacionais"
      />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        <form onSubmit={handleSave} className="mx-auto max-w-5xl space-y-4">
          <style>{`.cfg-input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0.625rem 0.75rem;font-size:0.875rem;outline:none;color:hsl(var(--foreground));transition:border-color 0.15s;}.cfg-input:focus{border-color:#B58A2C;}.cfg-input:disabled{opacity:.65;cursor:not-allowed;}`}</style>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="grid grid-cols-[220px_1fr] gap-5 rounded-xl border border-border bg-card p-5">
            <div>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#EBF0F7] text-[#0B1F3A]">
                <Settings className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold">Campanha</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Informações principais usadas no painel e nos convites.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome da campanha">
                <input required disabled={loading} value={campanhaForm.nome} onChange={(e) => setCampanha("nome", e.target.value)} className="cfg-input" />
              </Field>
              <Field label="Nome do candidato">
                <input required disabled={loading} value={campanhaForm.candidato_nome} onChange={(e) => setCampanha("candidato_nome", e.target.value)} className="cfg-input" />
              </Field>
              <Field label="Cargo">
                <select disabled={loading} value={campanhaForm.cargo} onChange={(e) => setCampanha("cargo", e.target.value)} className="cfg-input">
                  {cargos.map((cargo) => <option key={cargo.value} value={cargo.value}>{cargo.label}</option>)}
                </select>
              </Field>
              <Field label="Estado">
                <select required disabled={loading} value={campanhaForm.uf} onChange={(e) => setCampanha("uf", e.target.value)} className="cfg-input">
                  <option value="">Selecione</option>
                  {ufs.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </Field>
              <Field label="Município">
                <input disabled={loading} value={campanhaForm.municipio} onChange={(e) => setCampanha("municipio", e.target.value)} className="cfg-input" />
              </Field>
              <Field label="Partido">
                <input disabled={loading} value={campanhaForm.partido} onChange={(e) => setCampanha("partido", e.target.value.toUpperCase())} className="cfg-input" />
              </Field>
              <Field label="Número de urna">
                <input disabled={loading} value={campanhaForm.numero_urna} onChange={(e) => setCampanha("numero_urna", e.target.value)} className="cfg-input" />
              </Field>
            </div>
          </section>

          <section className="grid grid-cols-[220px_1fr] gap-5 rounded-xl border border-border bg-card p-5">
            <div>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#EBF0F7] text-[#0B1F3A]">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold">Campos de pessoas</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Campos extras para capturar informacoes especificas da campanha.
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_140px] gap-3">
                <Field label="Nome do campo">
                  <input
                    disabled={loading || fieldSaving}
                    value={fieldForm.rotulo}
                    onChange={(e) => setFieldForm((current) => ({ ...current, rotulo: e.target.value }))}
                    placeholder="Ex: Igreja, origem do contato, zona"
                    className="cfg-input"
                  />
                </Field>
                <Field label="Tipo">
                  <select
                    disabled={loading || fieldSaving}
                    value={fieldForm.tipo}
                    onChange={(e) => setFieldForm((current) => ({ ...current, tipo: e.target.value as CampoPersonalizadoTipo }))}
                    className="cfg-input"
                  >
                    {fieldTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </Field>
              </div>
              {fieldForm.tipo === "opcao" && (
                <Field label="Opcoes da lista">
                  <input
                    disabled={loading || fieldSaving}
                    value={fieldForm.opcoes}
                    onChange={(e) => setFieldForm((current) => ({ ...current, opcoes: e.target.value }))}
                    placeholder="Ex: Igreja, Esporte, Juventude"
                    className="cfg-input"
                  />
                </Field>
              )}
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={fieldForm.obrigatorio}
                    onChange={(e) => setFieldForm((current) => ({ ...current, obrigatorio: e.target.checked }))}
                    className="h-4 w-4 accent-[#B58A2C]"
                  />
                  Obrigatorio no cadastro
                </label>
                <button
                  type="button"
                  onClick={addCustomField}
                  disabled={loading || fieldSaving || !fieldForm.rotulo.trim()}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "#0B1F3A" }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {fieldSaving ? "Adicionando..." : "Adicionar campo"}
                </button>
              </div>

              <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                {customFields.length === 0 ? (
                  <div className="px-4 py-5 text-center text-xs text-muted-foreground">
                    Nenhum campo personalizado criado ainda.
                  </div>
                ) : customFields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className={field.ativo ? "" : "opacity-50"}>
                      <p className="text-sm font-medium">{field.rotulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {field.chave} · {fieldTypes.find((type) => type.value === field.tipo)?.label ?? field.tipo}
                        {field.obrigatorio ? " · obrigatorio" : ""}
                        {!field.ativo ? " · inativo" : ""}
                      </p>
                    </div>
                    {field.ativo && (
                      <button
                        type="button"
                        onClick={() => disableCustomField(field)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Desativar campo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-[220px_1fr] gap-5 rounded-xl border border-border bg-card p-5">
            <div>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#EDF2EB] text-[#2D4A2A]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold">Acesso e convites</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Padrões para entrada de pessoas na equipe da campanha.
              </p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Validade padrão do convite">
                  <select disabled={loading} value={config.validade_convite_dias} onChange={(e) => setCfg("validade_convite_dias", Number(e.target.value))} className="cfg-input">
                    <option value={1}>1 dia</option>
                    <option value={7}>7 dias</option>
                    <option value={15}>15 dias</option>
                    <option value={30}>30 dias</option>
                  </select>
                </Field>
                <Field label="Escopo territorial padrão">
                  <select disabled={loading} value={config.escopo_padrao_territorio} onChange={(e) => setCfg("escopo_padrao_territorio", e.target.value as Required<Configuracoes>["escopo_padrao_territorio"])} className="cfg-input">
                    <option value="bairro">Bairro</option>
                    <option value="zona_eleitoral">Zona eleitoral</option>
                    <option value="municipio">Município</option>
                  </select>
                </Field>
              </div>
              <Toggle checked={config.convites_requerem_aprovacao} label="Exigir aprovação para novos membros" description="Indicações entram com revisão antes de receberem acesso completo." onChange={(value) => setCfg("convites_requerem_aprovacao", value)} />
              <Toggle checked={config.permitir_link_generico} label="Permitir convite por link genérico" description="O coordenador pode gerar um link sem e-mail amarrado." onChange={(value) => setCfg("permitir_link_generico", value)} />
            </div>
          </section>

          <section className="grid grid-cols-[220px_1fr] gap-5 rounded-xl border border-border bg-card p-5">
            <div>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#FBF5E8] text-[#6B4E0A]">
                <Mail className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold">Operação</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Preferências para avisos e governança dos dados.
              </p>
            </div>
            <div className="space-y-3">
              <Toggle checked={config.notificar_novos_convites} label="Avisar sobre convites aceitos" description="Destaca novas entradas da equipe para a coordenação." onChange={(value) => setCfg("notificar_novos_convites", value)} />
              <Toggle checked={config.lembrete_tarefas_atrasadas} label="Lembrar tarefas atrasadas" description="Mantém pendências importantes visíveis no acompanhamento." onChange={(value) => setCfg("lembrete_tarefas_atrasadas", value)} />
              <Toggle checked={config.lgpd_reter_auditoria} label="Manter trilha de auditoria" description="Preserva rastreabilidade de alterações em contatos e dados sensíveis." onChange={(value) => setCfg("lgpd_reter_auditoria", value)} />
            </div>
          </section>

          <section className="grid grid-cols-[220px_1fr] gap-5 rounded-xl border border-border bg-card p-5">
            <div>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3EEF9] text-[#5A3A7A]">
                <User className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold">Minha conta</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Dados exibidos para outros membros da equipe.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome de exibição">
                <input disabled={loading} value={conta.nome_exibicao} onChange={(e) => setConta({ nome_exibicao: e.target.value })} className="cfg-input" />
              </Field>
              <Field label="E-mail">
                <input disabled value={email} className="cfg-input" />
              </Field>
              <Field label="Perfil na campanha">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  {perfil || "Carregando"}
                </div>
              </Field>
            </div>
          </section>

          <div className="sticky bottom-0 -mx-6 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setConfig(defaultConfig)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restaurar padrões
              </button>
              <button
                type="submit"
                disabled={saving || loading}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: saved ? "#2D4A2A" : "#B58A2C" }}
              >
                {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? "Salvando..." : saved ? "Salvo" : "Salvar configurações"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </>
  );
}
