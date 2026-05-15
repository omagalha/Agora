import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function EquipeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("usuarios_campanhas")
    .select("perfil")
    .eq("ativo", true)
    .limit(1)
    .single();

  if (!data || !["admin", "coordenacao"].includes(data.perfil)) {
    redirect("/painel");
  }

  return <>{children}</>;
}
