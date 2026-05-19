import { Route, Switch } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Clientes from "@/pages/Clientes";
import Agendamentos from "@/pages/Agendamentos";
import Servicos from "@/pages/Servicos";
import Pacotes from "@/pages/Pacotes";
import Financeiro from "@/pages/Financeiro";
import Relatorios from "@/pages/Relatorios";
import Mensagens from "@/pages/Mensagens";
import Leads from "@/pages/Leads";
import Empresas from "@/pages/Empresas";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";
import AguardandoAprovacao from "@/pages/AguardandoAprovacao";
import AcessoExpirado from "@/pages/AcessoExpirado";
import AcessoNaoIniciado from "@/pages/AcessoNaoIniciado";
import { useAppAuth } from "@/lib/auth-context";
import { Scissors } from "lucide-react";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-primary">
        <Scissors className="h-10 w-10 animate-pulse" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

export function Router() {
  const { isLoading, isAuthenticated, isAdmin, hasTenant, accessStatus } = useAppAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Login />;

  if (isAdmin) {
    return <Admin />;
  }

  if (!hasTenant || accessStatus === "pending") return <AguardandoAprovacao />;
  if (accessStatus === "not_started") return <AcessoNaoIniciado />;
  if (accessStatus === "expired") return <AcessoExpirado />;

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clientes" component={Clientes} />
        <Route path="/agendamentos" component={Agendamentos} />
        <Route path="/servicos" component={Servicos} />
        <Route path="/pacotes" component={Pacotes} />
        <Route path="/financeiro" component={Financeiro} />
        <Route path="/relatorios" component={Relatorios} />
        <Route path="/mensagens" component={Mensagens} />
        <Route path="/leads" component={Leads} />
        <Route path="/empresas" component={Empresas} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}
