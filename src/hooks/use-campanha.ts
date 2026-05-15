"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PerfilUsuario } from "@/types";

export interface Campanha {
  id: string;
  nome: string;
  candidato_nome: string;
  cargo: string;
  municipio: string | null;
  uf: string;
  partido: string | null;
  numero_urna: string | null;
}

export function useCampanha() {
  const [campanha, setCampanha] = useState<Campanha | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("usuarios_campanhas")
      .select("perfil, campanhas(id, nome, candidato_nome, cargo, municipio, uf, partido, numero_urna)")
      .eq("ativo", true)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.campanhas) {
          setCampanha(data.campanhas as unknown as Campanha);
          setPerfil((data.perfil as PerfilUsuario) ?? null);
        }
        setLoading(false);
      });
  }, []);

  return { campanha, campanhaId: campanha?.id ?? null, perfil, loading };
}
