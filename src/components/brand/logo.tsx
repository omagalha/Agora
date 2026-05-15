interface LogoProps {
  size?: number;
  variant?: "full" | "icon";
  className?: string;
}

/* Cluster de 7 hexágonos — "Sete hexágonos, uma praça" */
function HexIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-45 -43 90 86"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top-left — Azul Institucional */}
      <polygon
        points="-14,-40 -2,-33 -2,-19 -14,-12 -26,-19 -26,-33"
        fill="#33445E"
      />
      {/* Top-right — Aço */}
      <polygon
        points="14,-40 26,-33 26,-19 14,-12 2,-19 2,-33"
        fill="#7D8CA1"
      />
      {/* Left — Aço Claro */}
      <polygon
        points="-30,-14 -18,-7 -18,7 -30,14 -42,7 -42,-7"
        fill="#B8C2CC"
      />
      {/* Center — Dourado Cívico (liderança) */}
      <polygon
        points="0,-14 12,-7 12,7 0,14 -12,7 -12,-7"
        fill="#B58A2C"
      />
      {/* Right — Azul Profundo */}
      <polygon
        points="30,-14 42,-7 42,7 30,14 18,7 18,-7"
        fill="#0B1F3A"
      />
      {/* Bottom-left — Aço Claro */}
      <polygon
        points="-14,12 -2,19 -2,33 -14,40 -26,33 -26,19"
        fill="#B8C2CC"
      />
      {/* Bottom-right — Azul Institucional */}
      <polygon
        points="14,12 26,19 26,33 14,40 2,33 2,19"
        fill="#33445E"
      />
    </svg>
  );
}

export function Logo({ size = 32, variant = "full", className = "" }: LogoProps) {
  if (variant === "icon") {
    return <HexIcon size={size} />;
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <HexIcon size={size} />
      <div className="flex flex-col leading-none">
        <span
          className="font-display text-sidebar-foreground tracking-wide"
          style={{ fontSize: size * 0.7, fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif" }}
        >
          Ágora
        </span>
        <span
          className="text-sidebar-primary uppercase tracking-[0.2em] font-sans"
          style={{ fontSize: size * 0.22 }}
        >
          CRM Político
        </span>
      </div>
    </div>
  );
}
