import type { Metadata } from "next";
import "./landing.css";

export const metadata: Metadata = {
  title: "Ágora — CRM Político · Sua base. Sua voz. Seu mandato.",
  description: "Gestão política com inteligência e alcance — a praça pública agora cabe na sua plataforma.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
