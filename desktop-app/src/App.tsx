import { Switch, Route, Router as WouterRouter } from "wouter";
import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import NotFound from "./pages/not-found";
import { Sidebar } from "./components/layout/sidebar";
import Dashboard from "./pages/dashboard";
import Tasks from "./pages/tasks";
import Alerts from "./pages/alerts";
import Compilation from "./pages/compilation";
import ImportExport from "./pages/import-export";
import Settings from "./pages/settings";
import StickyNoteWindow from "./pages/sticky-note";
import { TasksProvider } from "./hooks/use-tasks";

function Router() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/alerts" component={Alerts} />
          <Route path="/import-export" component={ImportExport} />
          <Route path="/compilation" component={Compilation} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  const [windowLabel, setWindowLabel] = useState<string | null>(null);

  useEffect(() => {
    setWindowLabel(getCurrentWebviewWindow().label);
  }, []);

  return (
    <TooltipProvider>
      {windowLabel === null ? null : windowLabel.startsWith("sticky-note-") ? (
        <StickyNoteWindow />
      ) : (
        <TasksProvider>
          <WouterRouter>
            <Router />
          </WouterRouter>
        </TasksProvider>
      )}
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
