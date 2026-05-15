import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { isPlatformAdmin } from "@/lib/platform-admin";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Platform admin não tem campanha — redireciona direto para /admin
  if (isPlatformAdmin(user)) redirect("/admin");

  const { data: campanhas } = await supabase
    .from("usuarios_campanhas")
    .select("campanha_id")
    .eq("ativo", true)
    .limit(1);

  if (!campanhas || campanhas.length === 0) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
