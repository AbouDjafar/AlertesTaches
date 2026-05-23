import { Link, useLocation } from "wouter";
import { LayoutDashboard, CheckSquare, BellRing, FileJson } from "lucide-react";
import { motion } from "framer-motion";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Tableau de Bord", icon: LayoutDashboard },
    { href: "/tasks", label: "Tâches", icon: CheckSquare },
    { href: "/alerts", label: "Alertes", icon: BellRing },
    { href: "/import-export", label: "Import / Export", icon: FileJson },
  ];

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-full shrink-0">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
          <BellRing className="w-5 h-5" />
          Alertes Tâches
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {links.map((link) => {
          const isActive = location === link.href;
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="block relative">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}>
                <Icon className="w-4 h-4" />
                {link.label}
              </div>
              {isActive && (
                <motion.div 
                  layoutId="activeTab" 
                  className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-6 text-xs text-muted-foreground">
        © 2026 Projet Manager
      </div>
    </div>
  );
}
