"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Check } from "lucide-react";

type View = "login" | "forgot" | "forgot_sent";

export default function LoginPage() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setError("Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.");
      } else if (error.message.toLowerCase().includes("invalid login")) {
        setError("E-mail ou senha incorretos.");
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    window.location.href = "/painel";
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/redefinir-senha`;
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo });
    if (error) {
      setError("Não foi possível enviar o e-mail. Tente novamente.");
      setLoading(false);
      return;
    }
    setLoading(false);
    setView("forgot_sent");
  }

  const inputCls = "w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder:text-[#3A4F6A]";
  const inputStyle = { backgroundColor: "#152844", border: "1px solid #1E3355" };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "#B58A2C");
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "#1E3355");

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#F4EFE4" }}>
      <div className="w-full max-w-sm rounded-2xl px-8 py-10 shadow-2xl" style={{ backgroundColor: "#0B1F3A" }}>

        {/* Logo — always visible */}
        <div className="flex flex-col items-center mb-8">
          <Logo size={52} variant="icon" />
          <h1 className="mt-4 text-white tracking-wide"
            style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif", fontSize: "1.75rem", fontWeight: 300, lineHeight: 1 }}>
            Ágora
          </h1>
          <p className="mt-1 uppercase tracking-[0.25em] font-sans text-[10px]" style={{ color: "#B58A2C" }}>
            CRM Político
          </p>
          {view === "login" && (
            <p className="mt-3 text-center text-xs leading-relaxed" style={{ color: "#7D8CA1" }}>
              Sua base. Sua voz. Seu mandato.
            </p>
          )}
        </div>

        {/* ── VIEW: login ── */}
        {view === "login" && (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="email" className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
                  E-mail
                </label>
                <input id="email" type="email" autoComplete="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="voce@campanha.com.br"
                  className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div className="space-y-1">
                <label htmlFor="password" className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
                  Senha
                </label>
                <input id="password" type="password" autoComplete="current-password" required value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              {error && <p className="text-xs text-red-400 text-center">{error}</p>}
              <button type="submit" disabled={loading}
                className="mt-2 w-full rounded-lg py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: "#B58A2C" }}>
                {loading ? "Entrando…" : "Entrar"}
              </button>
            </form>
            <div className="mt-5 flex flex-col items-center gap-2">
              <button type="button" onClick={() => { setResetEmail(email); setError(null); setView("forgot"); }}
                className="text-xs transition-colors" style={{ color: "#3A4F6A" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#B58A2C")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#3A4F6A")}>
                Esqueci minha senha
              </button>
              <p className="text-xs" style={{ color: "#3A4F6A" }}>
                Não tem conta?{" "}
                <Link href="/cadastro" className="transition-colors" style={{ color: "#7D8CA1" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#B58A2C")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#7D8CA1")}>
                  Criar conta
                </Link>
              </p>
            </div>
          </>
        )}

        {/* ── VIEW: forgot password ── */}
        {view === "forgot" && (
          <>
            <button type="button" onClick={() => { setView("login"); setError(null); }}
              className="flex items-center gap-1.5 text-xs mb-6 transition-colors" style={{ color: "#7D8CA1" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#B58A2C")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#7D8CA1")}>
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login
            </button>
            <p className="text-sm text-white font-medium mb-1">Redefinir senha</p>
            <p className="text-xs mb-5 leading-relaxed" style={{ color: "#7D8CA1" }}>
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </p>
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="reset-email" className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
                  E-mail
                </label>
                <input id="reset-email" type="email" autoComplete="email" required value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)} placeholder="voce@campanha.com.br"
                  className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: "#B58A2C" }}>
                {loading ? "Enviando…" : "Enviar link de redefinição"}
              </button>
            </form>
          </>
        )}

        {/* ── VIEW: forgot sent ── */}
        {view === "forgot_sent" && (
          <div className="text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#152844" }}>
              <Check className="h-6 w-6" style={{ color: "#B58A2C" }} />
            </div>
            <div>
              <p className="text-white font-medium text-sm mb-1">Link enviado!</p>
              <p className="text-xs leading-relaxed" style={{ color: "#7D8CA1" }}>
                Verifique sua caixa de entrada em{" "}
                <span className="text-white">{resetEmail}</span> e clique no link para redefinir sua senha.
              </p>
            </div>
            <button type="button" onClick={() => { setView("login"); setError(null); }}
              className="text-xs transition-colors" style={{ color: "#3A4F6A" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#B58A2C")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#3A4F6A")}>
              Voltar para o login
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
