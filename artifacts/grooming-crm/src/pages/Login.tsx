import { useState } from "react";
import {
  CheckCircle2,
  PawPrint,
  Calendar,
  Users,
  DollarSign,
  BarChart3,
  MessageCircle,
  LogIn,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppAuth } from "@/lib/auth-context";
import { buildWhatsAppUrl } from "@/lib/admin-config";

const features = [
  {
    icon: Calendar,
    title: "Agendamentos Kanban",
    description: "Organize seus atendimentos por status com drag-and-drop",
  },
  {
    icon: Users,
    title: "Clientes e Pets",
    description: "Cadastro completo com histórico de atendimentos",
  },
  {
    icon: DollarSign,
    title: "Fluxo de Caixa",
    description: "Controle receitas e despesas do seu pet shop",
  },
  {
    icon: BarChart3,
    title: "Relatórios",
    description: "Gráficos e métricas para tomar melhores decisões",
  },
];

export default function Login() {
  const { login } = useAppAuth();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    }
    // On success, auth state updates automatically → Router redirects
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/10">
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <PawPrint className="h-6 w-6" />
          <span>Pata Limpa</span>
        </div>
        <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
          <LogIn className="h-4 w-4 mr-2" />
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
              O CRM feito para
              <br />
              <span className="text-primary">Estética Animal</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Gerencie agendamentos, clientes, pets, financeiro e muito mais.
              <br />
              Tudo em um só lugar.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setShowForm(true)}
              size="lg"
              className="px-8 text-base"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Entrar no sistema
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 text-base border-green-600 text-green-700 hover:bg-green-50"
              onClick={() =>
                window.open(
                  buildWhatsAppUrl(
                    "Olá! Quero conhecer o Pata Limpa CRM para meu pet shop.",
                  ),
                  "_blank",
                )
              }
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Quero conhecer
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Acesso exclusivo para pet shops cadastrados.
          </p>
        </section>

        {showForm && (
          <section className="w-full max-w-sm">
            <div className="bg-white rounded-2xl border shadow-md p-8 flex flex-col gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <PawPrint className="h-8 w-8 text-primary" />
                <h2 className="text-xl font-bold text-gray-900">
                  Acessar o sistema
                </h2>
                <p className="text-sm text-muted-foreground">
                  Use o e-mail e senha fornecidos pelo administrador
                </p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setShowForm(false)}
                >
                  Voltar
                </Button>
              </div>
            </div>
          </section>
        )}

        {!showForm && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-xl border p-6 flex gap-4 shadow-sm"
              >
                <div className="bg-primary/10 rounded-lg p-3 h-fit">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {f.description}
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}

        {!showForm && (
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
        )}
      </main>

      <footer className="text-center py-8 text-xs text-muted-foreground border-t mt-8">
        © {new Date().getFullYear()} Pata Limpa — CRM para Banho e Tosa |
        Criado dentro de uma estética animal para você!
      </footer>
    </div>
  );
}
