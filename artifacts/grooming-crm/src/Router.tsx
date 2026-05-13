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

export function Router() {
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
