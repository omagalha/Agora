"use client";

import { useState, useEffect } from "react";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";
import { Check, AlertCircle } from "lucide-react";

type View = "form" | "success" | "expired";

export default function RedefinirSenhaPage() {
  const [view, setView] = useState<View>("form");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verifica se há sessão ativa (Supabase já trocou o code via /auth/callback)
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) setView("expired");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setError("Não foi possível atualizar a senha. O link pode ter expirado.");
      setLoading(false);
      return;
    }

    setView("success");
    setTimeout(() => { window.location.href = "/painel"; }, 2000);
  }

  const inputCls = "w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder:text-[#3A4F6A]";
  const inputStyle = { backgroundColor: "#152844", border: "1px solid #1E3355" };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "#B58A2C");
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "#1E3355");

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#F4EFE4" }}>
      <div className="w-full max-w-sm rounded-2xl px-8 py-10 shadow-2xl" style={{ backgroundColor: "#0B1F3A" }}>

        <div className="flex flex-col items-center mb-8">
          <Logo size={52} variant="icon" />
          <h1 className="mt-4 text-white tracking-wide"
            style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif", fontSize: "1.75rem", fontWeight: 300, lineHeight: 1 }}>
            Ágora
          </h1>
          <p className="mt-1 uppercase tracking-[0.25em] font-sans text-[10px]" style={{ color: "#B58A2C" }}>
            CRM Político
          </p>
        </div>

        {view === "expired" && (
          <div className="text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#3A1A1A" }}>
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm mb-1">Link expirado</p>
              <p className="text-xs leading-relaxed" style={{ color: "#7D8CA1" }}>
                Este link de redefinição não é mais válido. Solicite um novo pelo login.
              </p>
            </div>
            <a href="/login" className="block text-xs transition-colors" style={{ color: "#B58A2C" }}>
              Voltar para o login
            </a>
          </div>
        )}

        {view === "success" && (
          <div className="text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#152844" }}>
              <Check className="h-6 w-6" style={{ color: "#B58A2C" }} />
            </div>
            <div>
              <p className="text-white font-medium text-sm mb-1">Senha atualizada!</p>
              <p className="text-xs leading-relaxed" style={{ color: "#7D8CA1" }}>
                Redirecionando para o painel...
              </p>
            </div>
          </div>
        )}

        {view === "form" && (
          <>
            <p className="text-sm text-white font-medium mb-1">Criar nova senha</p>
            <p className="text-xs mb-5 leading-relaxed" style={{ color: "#7D8CA1" }}>
              Escolha uma senha segura com pelo menos 8 caracteres.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="password" className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
                  Nova senha
                </label>
                <input id="password" type="password" autoComplete="new-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div className="space-y-1">
                <label htmlFor="confirm" className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
                  Confirmar senha
                </label>
                <input id="confirm" type="password" autoComplete="new-password" required
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: "#B58A2C" }}>
                {loading ? "Salvando…" : "Salvar nova senha"}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
