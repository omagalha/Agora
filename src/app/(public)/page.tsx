"use client";

import Link from "next/link";
import { useState } from "react";

const LogoMark = () => (
  <svg className="logo-mark" viewBox="0 0 100 100">
    <polygon points="50,8 76,23 76,53 50,68 24,53 24,23" fill="#33445E" />
    <polygon points="80,28 100,40 100,62 80,74 80,52" fill="#33445E" opacity="0.5" />
    <polygon points="20,28 0,40 0,62 20,74 20,52" fill="#33445E" opacity="0.5" />
    <polygon points="50,52 76,67 76,82 50,97 24,82 24,67" fill="#33445E" opacity="0.7" />
    <polygon points="50,30 64,38 64,55 50,63 36,55 36,38" fill="#B58A2C" />
  </svg>
);

const HeroMark = () => (
  <svg className="mark" viewBox="0 0 200 200">
    <polygon points="100,16 152,46 152,106 100,136 48,106 48,46" fill="#33445E" />
    <polygon points="160,52 200,76 200,124 160,148 160,100" fill="#7D8CA1" />
    <polygon points="40,52 0,76 0,124 40,148 40,100" fill="#7D8CA1" />
    <polygon points="100,104 152,134 152,164 100,194 48,164 48,134" fill="#33445E" opacity="0.7" />
    <polygon points="100,16 48,46 0,76 0,124 48,106" fill="#33445E" opacity="0.8" />
    <polygon points="100,60 128,76 128,108 100,124 72,108 72,76" fill="#B58A2C" />
  </svg>
);

const HexMap = () => (
  <svg viewBox="0 0 180 130" width="100%" height="100%">
    <polygon points="20,15 35,25 35,40 20,50 5,40 5,25" fill="#33445E" />
    <polygon points="50,15 65,25 65,40 50,50 35,40 35,25" fill="#0B1F3A" />
    <polygon points="80,15 95,25 95,40 80,50 65,40 65,25" fill="#33445E" />
    <polygon points="110,15 125,25 125,40 110,50 95,40 95,25" fill="#7D8CA1" />
    <polygon points="140,15 155,25 155,40 140,50 125,40 125,25" fill="#0B1F3A" />
    <polygon points="170,15 185,25 185,40 170,50 155,40 155,25" fill="#7D8CA1" />
    <polygon points="35,50 50,60 50,75 35,85 20,75 20,60" fill="#0B1F3A" />
    <polygon points="65,50 80,60 80,75 65,85 50,75 50,60" fill="#B58A2C" />
    <polygon points="95,50 110,60 110,75 95,85 80,75 80,60" fill="#33445E" />
    <polygon points="125,50 140,60 140,75 125,85 110,75 110,60" fill="#0B1F3A" />
    <polygon points="155,50 170,60 170,75 155,85 140,75 140,60" fill="#33445E" />
    <polygon points="20,85 35,95 35,110 20,120 5,110 5,95" fill="#7D8CA1" />
    <polygon points="50,85 65,95 65,110 50,120 35,110 35,95" fill="#33445E" />
    <polygon points="80,85 95,95 95,110 80,120 65,110 65,95" fill="#0B1F3A" />
    <polygon points="110,85 125,95 125,110 110,120 95,110 95,95" fill="#7D8CA1" />
    <polygon points="140,85 155,95 155,110 140,120 125,110 125,95" fill="#33445E" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function LandingPage() {
  const [nome,    setNome]    = useState("");
  const [funcao,  setFuncao]  = useState("");
  const [email,   setEmail]   = useState("");
  const [wpp,     setWpp]     = useState("");
  const [estado,  setEstado]  = useState("");
  const [esfera,  setEsfera]  = useState("");
  const [msg,     setMsg]     = useState("");
  const [sent,    setSent]    = useState(false);
  const [sending, setSending] = useState(false);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await new Promise(r => setTimeout(r, 900));
    setSending(false);
    setSent(true);
  }

  return (
    <div className="landing-page">

      {/* ── NAV ─────────────────────────────────────── */}
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="logo">
            <LogoMark />
            <span className="logo-text">Ágora</span>
          </Link>
          <div className="nav-links">
            <a href="#produto" onClick={e => { e.preventDefault(); scrollTo("produto"); }}>Produto</a>
            <a href="#funcionalidades" onClick={e => { e.preventDefault(); scrollTo("funcionalidades"); }}>Funcionalidades</a>
            <a href="#resultados" onClick={e => { e.preventDefault(); scrollTo("resultados"); }}>Resultados</a>
            <Link href="/login" className="nav-entrar">Entrar</Link>
            <a href="#contato" onClick={e => { e.preventDefault(); scrollTo("contato"); }} className="nav-cta">
              Solicitar demo
            </a>
          </div>
        </div>
      </nav>

      <main>

        {/* ── HERO ────────────────────────────────────── */}
        <section className="hero">
          <div className="hero-particles" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => <span key={i} className="particle" />)}
          </div>

          <div className="hero-content">
            <div className="eyebrow">CRM POLÍTICO · ELEIÇÕES 2026</div>
            <h1>
              Sua base.<br />
              Sua voz.<br />
              <span className="shimmer">Seu mandato.</span>
            </h1>
            <p className="hero-tagline">
              Gestão política com inteligência e alcance — a praça pública agora cabe na sua plataforma.
            </p>
            <p className="hero-sub">
              Centralize sua base de eleitores, gerencie a comunicação com lideranças e organize todo o mandato. Tudo em um sistema pensado para campanhas brasileiras.
            </p>
            <div className="hero-actions">
              <a href="#contato" onClick={e => { e.preventDefault(); scrollTo("contato"); }} className="btn btn-primary">
                Solicitar demonstração <ArrowIcon />
              </a>
              <a href="#produto" onClick={e => { e.preventDefault(); scrollTo("produto"); }} className="btn btn-ghost">
                Ver o produto
              </a>
            </div>
            <p className="hero-login-hint">
              Já tem acesso?{" "}
              <Link href="/login" className="hero-login-link">Entrar na plataforma →</Link>
            </p>
            <div className="hero-meta">
              <span><strong>+180</strong> mandatos</span>
              <span><strong>26</strong> estados</span>
              <span><strong>LGPD</strong> compliant</span>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hex-stage">
              <div className="ring" />
              <div className="ring" />
              <div className="ring" />
              <HeroMark />
              <span className="orbit-node n1" />
              <span className="orbit-node n2" />
              <span className="orbit-node n3" />
            </div>
          </div>
        </section>

        {/* ── TRUST BAR ───────────────────────────────── */}
        <div className="trust">
          <div className="trust-inner">
            <span className="trust-label">UTILIZADO POR MANDATOS EM</span>
            <div className="trust-logos">
              {["São Paulo","Brasília","Recife","Belo Horizonte","Curitiba","Salvador"].map(c => (
                <span key={c}>{c}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── PILLARS ─────────────────────────────────── */}
        <section className="lp-section" id="funcionalidades">
          <div className="container">
            <div className="section-eyebrow">O que você terá</div>
            <h2 className="section-title">
              Quatro <em>pilares</em> para sustentar<br />
              um mandato moderno.
            </h2>
            <p className="section-lead">
              Da primeira pesquisa territorial até o relatório anual de prestação de contas — a Ágora cobre o ciclo completo de quem decide servir.
            </p>

            <div className="pillars">
              <div className="pillar">
                <span className="pillar-num">01 · BASE</span>
                <svg className="pillar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                  <circle cx="17" cy="6" r="2" />
                  <path d="M14 14c1.5-1 3.3-1 5 0" />
                </svg>
                <h3>Eleitores e lideranças</h3>
                <p>Cadastre, segmente e mantenha viva a relação com sua base. Histórico completo de cada contato, georreferenciamento e níveis de engajamento.</p>
              </div>
              <div className="pillar">
                <span className="pillar-num">02 · TERRITÓRIO</span>
                <svg className="pillar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="12,3 19,7 19,17 12,21 5,17 5,7" />
                  <polygon points="12,7 16,9 16,15 12,17 8,15 8,9" />
                </svg>
                <h3>Mapa territorial</h3>
                <p>Veja sua presença em tempo real por bairro, zona ou seção. Identifique onde investir tempo, onde o discurso pega, onde a campanha precisa crescer.</p>
              </div>
              <div className="pillar">
                <span className="pillar-num">03 · COMUNICAÇÃO</span>
                <svg className="pillar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 5h18v12H7l-4 4z" />
                  <path d="M8 10h8M8 13h5" />
                </svg>
                <h3>Comunicação direta</h3>
                <p>WhatsApp, SMS, e-mail e disparos segmentados sob mesma régua. Trilhas automáticas, respostas centralizadas e relatórios de abertura por território.</p>
              </div>
              <div className="pillar">
                <span className="pillar-num">04 · MANDATO</span>
                <svg className="pillar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4" y="5" width="16" height="16" rx="2" />
                  <path d="M4 9h16M9 13h6M9 17h4" />
                  <path d="M8 3v4M16 3v4" />
                </svg>
                <h3>Gestão de mandato</h3>
                <p>Demandas dos cidadãos, agenda parlamentar, prestação de contas e gabinete. Tudo conectado à base — sua resposta vira fidelidade política.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SHOWCASE ────────────────────────────────── */}
        <section className="showcase lp-section" id="produto">
          <div className="container">
            <div className="section-eyebrow">Produto em ação</div>
            <h2 className="section-title">
              Inteligência de base que <em>cabe</em><br />
              no dia a dia do gabinete.
            </h2>

            <div className="showcase-grid">
              <div className="features-list">
                <div className="feature active">
                  <h4>Painel do mandato</h4>
                  <p>KPIs de campanha em tempo real. Apoiadores ativos, indecisos, demandas em aberto e taxa de resposta por território.</p>
                </div>
                <div className="feature">
                  <h4>Mapa de presença</h4>
                  <p>Visualização hexagonal por setor eleitoral. Identifique vazios estratégicos e concentre esforço onde decide.</p>
                </div>
                <div className="feature">
                  <h4>Demandas e prazos</h4>
                  <p>Cada pedido de cidadão entra no fluxo. Status, responsável, prazo de resposta e histórico — ninguém fica sem retorno.</p>
                </div>
                <div className="feature">
                  <h4>Relatórios para imprensa</h4>
                  <p>Exportação institucional de prestação de contas, balanço de mandato e impacto territorial em PDF e Excel.</p>
                </div>
              </div>

              <div className="product-mock">
                <div className="mock-bar">
                  <i /><i /><i />
                  <span className="mock-url">agora.app / painel</span>
                </div>
                <div className="mock-body">
                  <div className="mock-side">
                    <div className="mock-logo">
                      <svg width="20" height="20" viewBox="0 0 100 100">
                        <polygon points="50,8 76,23 76,53 50,68 24,53 24,23" fill="#7D8CA1" />
                        <polygon points="50,30 64,38 64,55 50,63 36,55 36,38" fill="#B58A2C" />
                      </svg>
                      <span className="mock-logo-text">Ágora</span>
                    </div>
                    <div className="mock-nav">
                      {[
                        { label: "◐ Painel",      active: true },
                        { label: "○ Eleitores",   active: false },
                        { label: "⬡ Territórios", active: false },
                        { label: "◇ Demandas",    active: false },
                        { label: "◆ Lideranças",  active: false },
                        { label: "▤ Agenda",      active: false },
                        { label: "◧ Mensagens",   active: false },
                        { label: "▥ Relatórios",  active: false },
                      ].map(({ label, active }) => (
                        <div key={label} className={`mock-nav-item${active ? " on" : ""}`}>{label}</div>
                      ))}
                    </div>
                  </div>
                  <div className="mock-main">
                    <div className="mock-h">
                      <div>
                        <div className="eb">OLÁ, COORDENADOR</div>
                        <div className="ti">Painel do mandato</div>
                      </div>
                      <div className="pill">Maio 2026</div>
                    </div>
                    <div className="mock-stats">
                      {[
                        { l: "CONTATOS",    v: "12.458", d: "↑ 12,5%" },
                        { l: "APOIADORES",  v: "5.682",  d: "↑ 18,3%" },
                        { l: "INDECISOS",   v: "3.214",  d: "↑ 6,7%" },
                        { l: "DEMANDAS",    v: "1.256",  d: "↑ 9,2%" },
                      ].map(s => (
                        <div key={s.l} className="mock-stat">
                          <div className="l">{s.l}</div>
                          <div className="v">{s.v}</div>
                          <div className="d">{s.d}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mock-charts">
                      <div className="mock-card">
                        <div className="mock-card-title">Apoiadores por território</div>
                        {[
                          { nm: "Centro",    w: "95%" },
                          { nm: "Jardins",   w: "78%" },
                          { nm: "Vila Nova", w: "62%" },
                          { nm: "Paraíso",   w: "48%" },
                          { nm: "São Lucas", w: "35%" },
                        ].map(r => (
                          <div key={r.nm} className="mock-bar-row">
                            <span className="nm">{r.nm}</span>
                            <div className="tk"><i style={{ width: r.w }} /></div>
                            <span className="nu">{r.nm === "Centro" ? "4.7k" : r.nm === "Jardins" ? "3.9k" : r.nm === "Vila Nova" ? "3.1k" : r.nm === "Paraíso" ? "2.4k" : "1.7k"}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mock-card">
                        <div className="mock-card-title">Mapa de presença</div>
                        <div className="mock-hex-map"><HexMap /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── METRICS ─────────────────────────────────── */}
        <section className="metrics lp-section" id="resultados">
          <div className="container">
            <div className="section-eyebrow">Resultados em campo</div>
            <h2 className="section-title">
              Mandatos que escutam<br />
              <em>respondem mais rápido.</em>
            </h2>
            <p className="section-lead">
              A diferença entre uma base ativa e uma base esquecida está no tempo de resposta. Os números abaixo são médias de mandatos usando a Ágora há 12 meses.
            </p>
            <div className="metrics-grid">
              <div className="metric">
                <div className="v">3,2<small>×</small></div>
                <div className="l">Aumento médio em apoiadores ativos por território após 6 meses de uso.</div>
              </div>
              <div className="metric">
                <div className="v">−68<small>%</small></div>
                <div className="l">Redução no tempo de resposta a demandas de cidadãos.</div>
              </div>
              <div className="metric">
                <div className="v">+180</div>
                <div className="l">Mandatos ativos usando a plataforma em 26 estados.</div>
              </div>
              <div className="metric">
                <div className="v">94<small>%</small></div>
                <div className="l">Renovação anual de contrato — gestores que ficam quando ganham.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRINCIPLES ──────────────────────────────── */}
        <section className="lp-section">
          <div className="container">
            <div className="section-eyebrow">Princípios</div>
            <h2 className="section-title">
              Política séria pede <em>ferramenta séria.</em>
            </h2>
            <p className="section-lead">
              A Ágora foi construída sobre quatro compromissos não-negociáveis. Eles guiam cada decisão de produto, cada linha de contrato e cada protocolo de segurança.
            </p>

            <div className="principles-grid">
              {[
                {
                  n: "01",
                  title: "Soberania do dado",
                  body: "Sua base é sua. Servidores em território nacional, criptografia em repouso e em trânsito, e exportação completa a qualquer momento — sem amarras.",
                },
                {
                  n: "02",
                  title: "Conformidade LGPD",
                  body: "DPO designado, registro de tratamento de dados, base legal explícita para cada operação. Auditável por órgãos competentes a qualquer momento.",
                },
                {
                  n: "03",
                  title: "Neutralidade técnica",
                  body: "Atendemos mandatos de qualquer espectro político. Não há decisão editorial, ranqueamento partidário ou interferência em conteúdo da plataforma.",
                },
                {
                  n: "04",
                  title: "Sigilo de contrato",
                  body: "Não divulgamos a lista de clientes. Quem usa a Ágora decide se quer ser mencionado — sigilo é o padrão, transparência é opção do mandato.",
                },
              ].map(({ n, title, body }) => (
                <div key={n} className="principle">
                  <div className="principle-num">{n}</div>
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FORM ────────────────────────────────── */}
        <section className="cta lp-section" id="contato">
          <div className="container cta-inner">
            <div>
              <div className="section-eyebrow">Solicite uma demo</div>
              <h2 className="section-title" style={{ fontSize: "clamp(34px, 4.5vw, 52px)" }}>
                Conheça a Ágora<br />
                <em>antes do próximo ciclo.</em>
              </h2>
              <p className="section-lead" style={{ marginBottom: 24 }}>
                Apresentação personalizada de 30 minutos com nosso time. Mostramos a plataforma com dados do seu território.
              </p>
              <div className="cta-checks">
                {[
                  "Demo guiada com sua base simulada",
                  "Importação de dados existentes incluída",
                  "Suporte humano por WhatsApp e e-mail",
                  "Sem fidelidade — cancele quando quiser",
                ].map(item => (
                  <div key={item} className="cta-check">
                    <span className="cta-check-icon">✓</span> {item}
                  </div>
                ))}
              </div>
            </div>

            {sent ? (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(184,194,204,0.15)", borderRadius: 10, padding: 40, textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(181,138,44,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <CheckIcon />
                </div>
                <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 24, marginBottom: 8 }}>Recebido!</p>
                <p style={{ color: "#7D8CA1", fontSize: 14 }}>Em até 24h úteis entramos em contato.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="lp-nome">Nome</label>
                    <input id="lp-nome" type="text" placeholder="Seu nome completo" required value={nome} onChange={e => setNome(e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="lp-funcao">Cargo / Função</label>
                    <input id="lp-funcao" type="text" placeholder="Ex.: Coordenador" required value={funcao} onChange={e => setFuncao(e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="lp-email">E-mail</label>
                    <input id="lp-email" type="email" placeholder="voce@dominio.com.br" required value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="lp-wpp">WhatsApp</label>
                    <input id="lp-wpp" type="tel" placeholder="(11) 9 9999-0000" required value={wpp} onChange={e => setWpp(e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="lp-estado">Estado</label>
                    <select id="lp-estado" required value={estado} onChange={e => setEstado(e.target.value)}>
                      <option value="">Selecione</option>
                      {["São Paulo","Rio de Janeiro","Minas Gerais","Bahia","Paraná","Rio Grande do Sul","Pernambuco","Ceará","Distrito Federal","Outro"].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="lp-esfera">Esfera</label>
                    <select id="lp-esfera" required value={esfera} onChange={e => setEsfera(e.target.value)}>
                      <option value="">Selecione</option>
                      {["Municipal — Vereador","Municipal — Prefeitura","Estadual — Deputado","Federal — Deputado / Senador","Pré-candidatura"].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="lp-msg">Como podemos ajudar?</label>
                  <textarea id="lp-msg" placeholder="Conte rapidamente sobre o mandato ou campanha" value={msg} onChange={e => setMsg(e.target.value)} />
                </div>
                <button type="submit" className="form-submit" disabled={sending}>
                  {sending ? "Enviando…" : "Solicitar demonstração →"}
                </button>
                <div className="form-note">Resposta em até 24h úteis · Dados protegidos conforme LGPD</div>
              </form>
            )}
          </div>
        </section>

      </main>

      {/* ── FOOTER ──────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <Link href="/" className="logo">
                <LogoMark />
                <span className="logo-text">Ágora</span>
              </Link>
              <p>CRM político e gestão de campanhas eleitorais. Sua base, sua voz, seu mandato — em uma plataforma só.</p>
            </div>
            <div className="footer-col">
              <h5>Produto</h5>
              <ul>
                <li><a href="#funcionalidades" onClick={e => { e.preventDefault(); scrollTo("funcionalidades"); }}>Funcionalidades</a></li>
                <li><a href="#produto" onClick={e => { e.preventDefault(); scrollTo("produto"); }}>Como funciona</a></li>
                <li><a href="#resultados" onClick={e => { e.preventDefault(); scrollTo("resultados"); }}>Resultados</a></li>
                <li><Link href="/login">Entrar</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Empresa</h5>
              <ul>
                <li><a href="#contato" onClick={e => { e.preventDefault(); scrollTo("contato"); }}>Contato</a></li>
                <li><a href="#contato" onClick={e => { e.preventDefault(); scrollTo("contato"); }}>Demo</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Plataforma</h5>
              <ul>
                <li><Link href="/login">Entrar</Link></li>
                <li><Link href="/cadastro">Criar conta</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bot">
            <span>© {new Date().getFullYear()} ÁGORA TECNOLOGIA</span>
            <span>SÃO PAULO · BRASÍLIA · BRASIL</span>
            <span>LGPD COMPLIANT</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
