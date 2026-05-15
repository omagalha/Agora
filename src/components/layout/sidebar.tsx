"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  CalendarDays,
  CheckSquare,
  GitMerge,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Settings,
  Star,
  UserCog,
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useCampanha } from "@/hooks/use-campanha";
import type { PerfilUsuario } from "@/types";

const ALL_NAV = [
  { href: "/painel", icon: LayoutDashboard, label: "Resumo" },
  { href: "/pessoas", icon: Users, label: "Pessoas" },
  { href: "/liderancas", icon: Star, label: "Lideranças" },
  { href: "/territorios", icon: MapPin, label: "Territórios" },
  { href: "/demandas", icon: MessageSquare, label: "Demandas" },
  { href: "/agenda", icon: CalendarDays, label: "Agenda" },
  { href: "/interacoes", icon: GitMerge, label: "Interações" },
  { href: "/tarefas", icon: CheckSquare, label: "Tarefas" },
  { href: "/equipe", icon: UserCog, label: "Equipe" },
  { href: "/relatorios", icon: BarChart2, label: "Relatórios" },
] as const;

type NavHref = (typeof ALL_NAV)[number]["href"];

const PERFIL_ROUTES: Record<PerfilUsuario, NavHref[]> = {
  admin: ["/painel", "/pessoas", "/liderancas", "/territorios", "/demandas", "/agenda", "/interacoes", "/tarefas", "/equipe", "/relatorios"],
  coordenacao: ["/painel", "/pessoas", "/liderancas", "/territorios", "/demandas", "/agenda", "/interacoes", "/tarefas", "/equipe", "/relatorios"],
  coordenador_territorial: ["/painel", "/pessoas", "/liderancas", "/territorios", "/demandas", "/agenda", "/interacoes", "/tarefas", "/relatorios"],
  equipe_rua: ["/painel", "/pessoas", "/demandas", "/agenda", "/interacoes", "/tarefas"],
  atendimento: ["/painel", "/pessoas", "/demandas", "/interacoes"],
  candidato: ["/painel", "/territorios", "/agenda", "/relatorios"],
};

const PERFIL_CONFIG: Record<PerfilUsuario, boolean> = {
  admin: true,
  coordenacao: true,
  coordenador_territorial: false,
  equipe_rua: false,
  atendimento: false,
  candidato: false,
};

export function Sidebar() {
  const pathname = usePathname();
  const configActive = pathname.startsWith("/configuracoes");
  const { perfil } = useCampanha();

  const allowedRoutes = perfil ? new Set(PERFIL_ROUTES[perfil]) : null;
  const showConfig = perfil ? PERFIL_CONFIG[perfil] : true;
  const nav = allowedRoutes
    ? ALL_NAV.filter((item) => allowedRoutes.has(item.href))
    : ALL_NAV;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo size={28} />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = href === "/painel" ? pathname === "/painel" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "border-l-2 border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-sidebar-primary" : "text-sidebar-foreground/40"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-sidebar-border px-3 py-3">
        {showConfig && (
          <Link
            href="/configuracoes"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              configActive
                ? "border-l-2 border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <Settings
              className={cn("h-4 w-4", configActive ? "text-sidebar-primary" : undefined)}
            />
            Configurações
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
