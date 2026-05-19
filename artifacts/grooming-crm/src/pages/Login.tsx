import { CheckCircle2, PawPrint, Calendar, Users, DollarSign, BarChart3, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppAuth } from "@/lib/auth-context";
import { buildWhatsAppUrl } from "@/lib/admin-config";

const features = [
  { icon: Calendar, title: "Agendamentos Kanban", description: "Organize seus atendimentos por status com drag-and-drop" },
  { icon: Users, title: "Clientes e Pets", description: "Cadastro completo com histórico de atendimentos" },
  { icon: DollarSign, title: "Fluxo de Caixa", description: "Controle receitas e despesas do seu pet shop" },
  { icon: BarChart3, title: "Relatórios", description: "Gráficos e métricas para tomar melhores decisões" },
];

export default function Login() {
  const { login } = useAppAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/10">
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <PawPrint className="h-6 w-6" />
          <span>Pata Limpa</span>
        </div>
        <Button onClick={login} variant="outline" size="sm">
          Entrar
        </Button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 flex flex-col items-center gap-16">
        <section className="flex flex-col items-center gap-6 text-center max-w-2xl">
          <div className="bg-primary/10 rounded-full p-5">
            <PawPrint className="h-14 w-14 text-primary" />
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
              O CRM feito para<br />
              <span className="text-primary">pet shops de banho e tosa</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Gerencie agendamentos, clientes, pets, financeiro e muito mais — tudo em um só lugar.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={login} size="lg" className="px-8 text-base">
              Entrar
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 text-base border-green-600 text-green-700 hover:bg-green-50"
              onClick={() => window.open(buildWhatsAppUrl("Olá! Quero conhecer o Pata Limpa CRM para meu pet shop."), "_blank")}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Quero conhecer
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Acesso exclusivo para pet shops cadastrados.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-xl border p-6 flex gap-4 shadow-sm">
              <div className="bg-primary/10 rounded-lg p-3 h-fit">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{f.description}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>WhatsApp integrado para confirmações</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Recorrência automática de agendamentos</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Relatórios detalhados de receita e atendimentos</span>
          </div>
        </section>
      </main>

      <footer className="text-center py-8 text-xs text-muted-foreground border-t mt-8">
        © {new Date().getFullYear()} Pata Limpa — CRM para pet shops
      </footer>
    </div>
  );
}
