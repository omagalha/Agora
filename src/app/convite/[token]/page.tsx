"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";
import { Check, AlertCircle, Loader2 } from "lucide-react";

const perfilLabel: Record<string, string> = {
  admin: "Administrador",
  coordenacao: "Coordenação",
  coordenador_territorial: "Coord. Territorial",
  equipe_rua: "Equipe de Rua",
  atendimento: "Atendimento",
  candidato: "Candidato",
};

const cargoLabel: Record<string, string> = {
  vereador: "Vereador(a)", prefeito: "Prefeito(a)", vice_prefeito: "Vice-Prefeito(a)",
  deputado_estadual: "Deputado(a) Estadual", deputado_federal: "Deputado(a) Federal",
  senador: "Senador(a)", governador: "Governador(a)",
};

interface ConviteInfo {
  campanha_nome: string;
  candidato_nome: string;
  cargo: string;
  uf: string;
  municipio: string | null;
  perfil: string;
  expires_at: string;
  status: string;
  valido: boolean;
  error?: string;
}

type AuthMode = "signup" | "login";

export default function ConvitePage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<ConviteInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [isAuthed, setIsAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; nome: string } | null>(null);

  // Form state
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [infoRes, authRes] = await Promise.all([
        supabase.rpc("get_convite_info", { p_token: token }),
        supabase.auth.getUser(),
      ]);
      setInfo((infoRes.data ?? { error: "Convite não encontrado" }) as ConviteInfo);
      setLoadingInfo(false);

      if (authRes.data.user) {
        setIsAuthed(true);
        const meta = authRes.data.user.user_metadata;
        setCurrentUser({
          email: authRes.data.user.email ?? "",
          nome: meta?.nome_exibicao ?? meta?.full_name ?? authRes.data.user.email ?? "",
        });
      }
    }
    if (token) load();
  }, [token]);

  async function acceptInvite() {
    setFormLoading(true); setFormError(null);
    const supabase = createClient();
    const { data } = await supabase.rpc("aceitar_convite", { p_token: token });
    if (data?.error) { setFormError(data.error); setFormLoading(false); return; }
    setAccepted(true);
    setTimeout(() => { window.location.href = "/painel"; }, 1500);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setFormError("A senha deve ter pelo menos 8 caracteres."); return; }
    setFormLoading(true); setFormError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nome_exibicao: nome } },
    });
    if (error) { setFormError(error.message); setFormLoading(false); return; }
    if (data.session) {
      // Auto-accept after signup
      const { data: acceptData } = await supabase.rpc("aceitar_convite", { p_token: token });
      if (acceptData?.error) { setFormError(acceptData.error); setFormLoading(false); return; }
      setAccepted(true);
      setTimeout(() => { window.location.href = "/painel"; }, 1500);
    } else {
      setFormError("Confirme seu e-mail e volte a este link para aceitar o convite.");
      setFormLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true); setFormError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setFormError("E-mail ou senha incorretos."); setFormLoading(false); return; }
    const { data: acceptData } = await supabase.rpc("aceitar_convite", { p_token: token });
    if (acceptData?.error) { setFormError(acceptData.error); setFormLoading(false); return; }
    setAccepted(true);
    setTimeout(() => { window.location.href = "/painel"; }, 1500);
  }

  const inputCls = "w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder:text-[#3A4F6A]";
  const inputStyle = { backgroundColor: "#152844", border: "1px solid #1E3355" };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: "#F4EFE4" }}>
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-6">
          <Logo size={40} />
        </div>

        {loadingInfo ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !info || info.error ? (
          <div className="rounded-2xl px-8 py-10 text-center" style={{ backgroundColor: "#0B1F3A" }}>
            <AlertCircle className="h-10 w-10 mx-auto mb-4" style={{ color: "#D4A0A0" }} />
            <h2 className="text-xl font-light text-white mb-2" style={{ fontFamily: "var(--font-display),'Cormorant Garamond',Georgia,serif" }}>
              Convite inválido
            </h2>
            <p className="text-sm" style={{ color: "#7D8CA1" }}>
              Este convite não existe, foi cancelado ou já expirou.
            </p>
          </div>
        ) : !info.valido ? (
          <div className="rounded-2xl px-8 py-10 text-center" style={{ backgroundColor: "#0B1F3A" }}>
            <AlertCircle className="h-10 w-10 mx-auto mb-4" style={{ color: "#D4B56A" }} />
            <h2 className="text-xl font-light text-white mb-2" style={{ fontFamily: "var(--font-display),'Cormorant Garamond',Georgia,serif" }}>
              Convite expirado
            </h2>
            <p className="text-sm" style={{ color: "#7D8CA1" }}>
              Este convite não está mais ativo. Peça um novo link ao responsável da campanha.
            </p>
          </div>
        ) : accepted ? (
          <div className="rounded-2xl px-8 py-10 text-center" style={{ backgroundColor: "#0B1F3A" }}>
            <div className="h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#EDF2EB" }}>
              <Check className="h-6 w-6" style={{ color: "#2D4A2A" }} />
            </div>
            <h2 className="text-xl font-light text-white mb-2" style={{ fontFamily: "var(--font-display),'Cormorant Garamond',Georgia,serif" }}>
              Bem-vindo à equipe!
            </h2>
            <p className="text-sm" style={{ color: "#7D8CA1" }}>Redirecionando para o painel...</p>
          </div>
        ) : (
          <div className="rounded-2xl px-8 py-8 shadow-2xl" style={{ backgroundColor: "#0B1F3A" }}>
            {/* Campaign info */}
            <div className="mb-6 pb-5 border-b" style={{ borderColor: "#1E3355" }}>
              <p className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: "#B58A2C" }}>
                Convite para campanha
              </p>
              <h1 className="text-2xl font-light text-white leading-tight mb-1" style={{ fontFamily: "var(--font-display),'Cormorant Garamond',Georgia,serif" }}>
                {info.candidato_nome}
              </h1>
              <p className="text-sm" style={{ color: "#7D8CA1" }}>
                {cargoLabel[info.cargo] ?? info.cargo}
                {info.municipio ? ` · ${info.municipio}/` : " · "}
                {info.uf}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#152844" }}>
                <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "#7D8CA1" }}>Seu papel:</span>
                <span className="text-[10px] font-semibold" style={{ color: "#B58A2C" }}>
                  {perfilLabel[info.perfil] ?? info.perfil}
                </span>
              </div>
            </div>

            {isAuthed && currentUser ? (
              <div className="space-y-4">
                <div className="rounded-lg px-3.5 py-2.5" style={{ backgroundColor: "#152844" }}>
                  <p className="text-xs font-medium text-white">{currentUser.nome}</p>
                  <p className="text-[10px]" style={{ color: "#7D8CA1" }}>{currentUser.email}</p>
                </div>
                {formError && <p className="text-xs text-red-400">{formError}</p>}
                <button onClick={acceptInvite} disabled={formLoading}
                  className="w-full rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60 transition-opacity"
                  style={{ backgroundColor: "#B58A2C" }}>
                  {formLoading ? "Entrando na equipe..." : "Aceitar convite"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex rounded-lg overflow-hidden text-xs" style={{ backgroundColor: "#152844" }}>
                  {([["signup","Criar conta"],["login","Já tenho conta"]] as [AuthMode,string][]).map(([v,l]) => (
                    <button key={v} onClick={() => { setAuthMode(v); setFormError(null); }}
                      className="flex-1 py-2 font-medium transition-colors"
                      style={{ backgroundColor: authMode===v ? "#B58A2C" : "transparent", color: authMode===v ? "#fff" : "#7D8CA1" }}>
                      {l}
                    </button>
                  ))}
                </div>

                {authMode === "signup" ? (
                  <form onSubmit={handleSignup} className="space-y-3">
                    <input type="text" required placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)}
                      className={inputCls} style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor="#B58A2C")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor="#1E3355")} />
                    <input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)}
                      className={inputCls} style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor="#B58A2C")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor="#1E3355")} />
                    <input type="password" required placeholder="Senha (mín. 8 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)}
                      className={inputCls} style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor="#B58A2C")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor="#1E3355")} />
                    {formError && <p className="text-xs text-red-400">{formError}</p>}
                    <button type="submit" disabled={formLoading}
                      className="w-full rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60"
                      style={{ backgroundColor: "#B58A2C" }}>
                      {formLoading ? "Criando conta..." : "Criar conta e aceitar convite"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-3">
                    <input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)}
                      className={inputCls} style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor="#B58A2C")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor="#1E3355")} />
                    <input type="password" required placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)}
                      className={inputCls} style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor="#B58A2C")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor="#1E3355")} />
                    {formError && <p className="text-xs text-red-400">{formError}</p>}
                    <button type="submit" disabled={formLoading}
                      className="w-full rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60"
                      style={{ backgroundColor: "#B58A2C" }}>
                      {formLoading ? "Entrando..." : "Entrar e aceitar convite"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
