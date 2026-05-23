import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import NotFound from "./pages/not-found";
import { Sidebar } from "./components/layout/sidebar";
import Dashboard from "./pages/dashboard";
import Tasks from "./pages/tasks";
import Alerts from "./pages/alerts";
import ImportExport from "./pages/import-export";

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
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter>
        <Router />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
