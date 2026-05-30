import { LoaderCircle } from "lucide-react";

export default function SplashScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-[#0B1220] text-slate-50">
      <div className="flex w-full max-w-md flex-col items-center rounded-[32px] border border-white/10 bg-white/5 px-10 py-12 text-center shadow-[0_30px_80px_rgba(6,10,18,0.45)] backdrop-blur-sm">
        <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/10">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 shadow-[0_10px_30px_rgba(59,130,246,0.35)]" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.32em] text-sky-200/80">
          Desktop App
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
          Alertes Taches
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Chargement de l'application et preparation de votre espace de travail.
        </p>
        <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
          <LoaderCircle className="h-4 w-4 animate-spin text-sky-300" />
          Initialisation en cours...
        </div>
      </div>
    </div>
  );
}
