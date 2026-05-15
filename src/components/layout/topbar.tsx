"use client";

import { useEffect, useState } from "react";
import { Bell, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useCampanha } from "@/hooks/use-campanha";

interface TopbarProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  filter?: React.ReactNode;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export function Topbar({ eyebrow, title, subtitle, action, filter }: TopbarProps) {
  const { campanha } = useCampanha();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? "");
      const meta = user.user_metadata;
      const name = meta?.nome_exibicao || meta?.full_name || meta?.name || user.email?.split("@")[0] || "";
      setDisplayName(name);
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const avatarText = displayName ? initials(displayName) : email.slice(0, 2).toUpperCase();

  return (
    <header className="shrink-0 border-b border-border bg-card px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="text-xs uppercase tracking-[0.15em] text-[#B58A2C] font-sans mb-1">
              {eyebrow}
            </p>
          )}
          <h1
            className="text-2xl font-semibold text-foreground leading-tight"
            style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 mt-1">
          {filter}

          {action && (
            <Button
              size="sm"
              onClick={action.onClick}
              className="gap-1.5 bg-[#B58A2C] hover:bg-[#9A7424] text-white border-0 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {action.label}
            </Button>
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8 relative text-muted-foreground">
            <Bell className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-[#0B1F3A] text-white text-xs font-semibold">
                  {avatarText || "—"}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <div className="text-sm font-medium truncate">{displayName || email || "Usuário"}</div>
                <div className="text-xs text-muted-foreground truncate">{campanha?.nome || "Campanha"}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleSignOut}>
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
