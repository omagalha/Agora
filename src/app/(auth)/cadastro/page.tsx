"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome]             = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);

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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome_exibicao: nome },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      setError(error.message === "User already registered"
        ? "Este e-mail já está cadastrado."
        : "Não foi possível criar a conta. Tente novamente.");
      setLoading(false);
      return;
    }

    // Se o Supabase não exige confirmação de e-mail, já redireciona
    if (data.session) {
      window.location.href = "/onboarding";
      return;
    }

    // Caso contrário, mostra mensagem de "verifique seu e-mail"
    setConfirmEmail(true);
    setLoading(false);
  }

  if (confirmEmail) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "#F4EFE4" }}
      >
        <div
          className="w-full max-w-sm rounded-2xl px-8 py-10 shadow-2xl text-center"
          style={{ backgroundColor: "#0B1F3A" }}
        >
          <div className="flex justify-center mb-6">
            <Logo size={48} variant="icon" />
          </div>
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "#152844" }}
          >
            <svg className="h-6 w-6" fill="none" stroke="#B58A2C" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2
            className="text-2xl font-light text-white mb-2"
            style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif" }}
          >
            Verifique seu e-mail
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: "#7D8CA1" }}>
            Enviamos um link de confirmação para{" "}
            <span className="text-white">{email}</span>.
            Clique no link para ativar sua conta e começar.
          </p>
          <Link
            href="/login"
            className="text-xs transition-colors"
            style={{ color: "#3A4F6A" }}
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#F4EFE4" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl px-8 py-10 shadow-2xl"
        style={{ backgroundColor: "#0B1F3A" }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo size={52} variant="icon" />
          <h1
            className="mt-4 text-white tracking-wide"
            style={{
              fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
              fontSize: "1.75rem",
              fontWeight: 300,
              lineHeight: 1,
            }}
          >
            Ágora
          </h1>
          <p className="mt-1 uppercase tracking-[0.25em] font-sans text-[10px]" style={{ color: "#B58A2C" }}>
            CRM Político
          </p>
          <p className="mt-3 text-center text-xs leading-relaxed" style={{ color: "#7D8CA1" }}>
            Crie sua conta e configure sua campanha.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-1">
            <label htmlFor="nome" className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
              Seu nome
            </label>
            <input
              id="nome"
              type="text"
              autoComplete="name"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="João Silva"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder:text-[#3A4F6A]"
              style={{ backgroundColor: "#152844", border: "1px solid #1E3355" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#B58A2C")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "#1E3355")}
            />
          </div>

          {/* E-mail */}
          <div className="space-y-1">
            <label htmlFor="email" className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@campanha.com.br"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder:text-[#3A4F6A]"
              style={{ backgroundColor: "#152844", border: "1px solid #1E3355" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#B58A2C")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "#1E3355")}
            />
          </div>

          {/* Senha */}
          <div className="space-y-1">
            <label htmlFor="password" className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder:text-[#3A4F6A]"
              style={{ backgroundColor: "#152844", border: "1px solid #1E3355" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#B58A2C")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "#1E3355")}
            />
          </div>

          {/* Confirmar senha */}
          <div className="space-y-1">
            <label htmlFor="confirm" className="block text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7D8CA1" }}>
              Confirmar senha
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder:text-[#3A4F6A]"
              style={{ backgroundColor: "#152844", border: "1px solid #1E3355" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#B58A2C")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "#1E3355")}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "#B58A2C" }}
          >
            {loading ? "Criando conta…" : "Criar conta"}
          </button>
        </form>

        {/* Link para login */}
        <p className="mt-5 text-center text-xs" style={{ color: "#3A4F6A" }}>
          Já tem conta?{" "}
          <Link
            href="/login"
            className="transition-colors"
            style={{ color: "#7D8CA1" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#B58A2C")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#7D8CA1")}
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
