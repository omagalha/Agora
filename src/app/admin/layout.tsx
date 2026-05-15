import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { LayoutDashboard, Building2, Users, LogOut } from "lucide-react";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { adminLogout } from "./actions";

async function AdminSidebar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-border bg-[#0B1F3A]">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#B58A2C] text-white text-xs font-bold">A</div>
        <div>
          <p className="text-xs font-semibold text-white leading-none">Ágora</p>
          <p className="text-[10px] text-white/40 leading-none mt-0.5">Plataforma</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {[
          { href: "/admin", icon: LayoutDashboard, label: "Visão Geral" },
          { href: "/admin/campanhas", icon: Building2, label: "Campanhas" },
          { href: "/admin/usuarios", icon: Users, label: "Usuários" },
        ].map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-3 space-y-1">
        <p className="px-3 text-[10px] text-white/30 truncate">{user?.email}</p>
        <form action={adminLogout}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isPlatformAdmin(user)) redirect("/");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
