import { Link, useLocation } from "wouter";
import { BarChart3, BellRing, CheckSquare, FileJson, LayoutDashboard, Settings } from "lucide-react";
import { motion } from "framer-motion";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Tableau de Bord", icon: LayoutDashboard },
    { href: "/tasks", label: "Taches", icon: CheckSquare },
    { href: "/alerts", label: "Alertes", icon: BellRing },
    { href: "/import-export", label: "Import / Export", icon: FileJson },
    { href: "/compilation", label: "Compilation", icon: BarChart3 },
    { href: "/settings", label: "Reglages", icon: Settings },
  ];

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="p-6">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary">
          <BellRing className="h-5 w-5" />
          Alertes Taches
        </h1>
      </div>

      <nav className="flex-1 space-y-2 px-4">
        {links.map((link) => {
          const isActive = location === link.href;
          const Icon = link.icon;

          return (
            <Link key={link.href} href={link.href} className="relative block">
              <div className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
                <Icon className="h-4 w-4" />
                {link.label}
              </div>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 top-0 w-1 rounded-r-full bg-primary"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 text-xs text-muted-foreground">
        © 2026 Fait par Abou Djafar
      </div>
    </div>
  );
}
