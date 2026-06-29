import { useState } from "react";
import {
  PawPrint,
  Calendar,
  Users,
  DollarSign,
  BarChart3,
  MessageCircle,
  LogIn,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  Kanban,
  Package,
  TrendingUp,
  ChevronRight,
  Repeat2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppAuth } from "@/lib/auth-context";
import { buildWhatsAppUrl } from "@/lib/admin-config";

const gains = [
  {
    icon: Clock,
    number: "~2h",
    label: "economizadas por dia",
    description:
      "Sem caderninho, sem WhatsApp bagunçado. Cada agendamento confirmado em segundos, com histórico completo de cada pet.",
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
  {
    icon: Calendar,
    number: "0",
    label: "esquecimentos de agenda",
    description:
      "Kanban visual por status — veja de relance quem está aguardando, em atendimento e pronto para buscar. Recorrência automática para clientes fixos.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: DollarSign,
    number: "+R$",
    label: "de receita controlada",
    description:
      "Fluxo de caixa integrado: cada atendimento já entra no financeiro. Veja quanto entrou, quanto saiu e onde o dinheiro está indo.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

const features = [
  {
    icon: Kanban,
    title: "Agenda Kanban",
    description:
      "Arraste cada atendimento entre colunas: Aguardando → Em Atendimento → Pet Pronto → Concluído. Sabe na hora o que está acontecendo no seu pet shop.",
  },
  {
    icon: Users,
    title: "Clientes e Pets",
    description:
      'Cadastro completo de tutores e pets com porte, raça, histórico de visitas e observações. Nunca mais pergunte "qual o nome do cachorrinho?" duas vezes.',
  },
  {
    icon: MessageCircle,
    title: "Mensagens WhatsApp",
    description:
      "Templates prontos de confirmação, lembrete de amanhã e aviso de pet pronto. Um clique abre o WhatsApp com a mensagem já preenchida.",
  },
  {
    icon: Package,
    title: "Pacotes e Recorrência",
    description:
      "Venda pacotes de banho e tosa com sessões pré-pagas. Configure agendamentos semanais automáticos para clientes fixos.",
  },
  {
    icon: DollarSign,
    title: "Financeiro integrado",
    description:
      "Cada atendimento vira um lançamento. Adicione despesas fixas e variáveis. Veja o saldo do mês sem precisar de planilha.",
  },
  {
    icon: BarChart3,
    title: "Relatórios e Leads",
    description:
      "Gráficos de receita, ranking de clientes e lista de pets que sumiram — para você reativar quem não volta há tempo.",
  },
];

const steps = [
  {
    number: "1",
    icon: Users,
    title: "Cadastre seus clientes e pets",
    description:
      "Cadastre rapidinho. Porte, raça, observações do tutor — tudo guardado e acessível em segundos.",
  },
  {
    number: "2",
    icon: Calendar,
    title: "Agende com um clique",
    description:
      "Escolha o cliente, o pet, o serviço e a data. O sistema cuida do resto: confirmação, lembrete e controle de caixa.",
  },
  {
    number: "3",
    icon: TrendingUp,
    title: "Feche o dia com tudo em ordem",
    description:
      "Veja o Kanban do dia, dispare os avisos de pet pronto e confira o financeiro antes de ir embora.",
  },
];

const trustItems = [
  "Feito por quem entende estética animal, para quem vive disso todo dia",
  "WhatsApp integrado — sem copiar e colar mensagem",
  "Recorrência automática para clientes fixos",
  "Relatórios prontos — sem planilha, sem dor de cabeça",
  "Acesso seguro por senha — cada pet shop vê só os seus dados",
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
  }

  const openLogin = () => {
    setShowForm(true);
    setTimeout(() => {
      document.getElementById("login-form-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const openWhatsApp = () =>
    window.open(
      buildWhatsAppUrl("Olá! Quero conhecer o Pata Limpa CRM para meu pet shop."),
      "_blank",
    );

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header sticky ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b px-6 py-3 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <PawPrint className="h-6 w-6" />
          <span>Pata Limpa</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openWhatsApp}
            variant="ghost"
            size="sm"
            className="hidden sm:flex text-green-700 hover:text-green-800 hover:bg-green-50"
          >
            <MessageCircle className="h-4 w-4 mr-1.5" />
            Falar com a gente
          </Button>
          <Button onClick={openLogin} size="sm">
            <LogIn className="h-4 w-4 mr-1.5" />
            Entrar
          </Button>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-primary/5 via-white to-teal-50 px-6 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-8">
          <div className="bg-primary/10 rounded-full p-5 shadow-sm">
            <PawPrint className="h-14 w-14 text-primary" />
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
              Menos tempo no caderno.
              <br />
              <span className="text-primary">Mais tempo atendendo.</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              O <strong className="text-gray-700">Pata Limpa</strong> organiza toda a agenda do seu pet shop em segundos —
              agendamentos, clientes, financeiro e WhatsApp em um só lugar.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button onClick={openLogin} size="lg" className="px-8 text-base shadow-sm">
              <LogIn className="h-5 w-5 mr-2" />
              Entrar no sistema
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 text-base border-green-600 text-green-700 hover:bg-green-50"
              onClick={openWhatsApp}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Quero conhecer
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Acesso exclusivo para pet shops de banho e tosa cadastrados.
          </p>
        </div>
      </section>

      {/* ── Login form (inline, aparece ao clicar em Entrar) ──────────────── */}
      {showForm && (
        <section
          id="login-form-section"
          className="px-6 py-12 bg-gray-50 border-y flex justify-center"
        >
          <div className="bg-white rounded-2xl border shadow-md p-8 flex flex-col gap-6 w-full max-w-sm">
            <div className="flex flex-col items-center gap-2 text-center">
              <PawPrint className="h-8 w-8 text-primary" />
              <h2 className="text-xl font-bold text-gray-900">Acessar o sistema</h2>
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}

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

      {/* ── O que você ganha ──────────────────────────────────────────────── */}
      <section className="px-6 py-16 sm:py-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">Resultados reais</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            O que você ganha com o Pata Limpa
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Tempo é dinheiro — e no seu pet shop, cada minuto perdido com papelada é um atendimento a menos no dia.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {gains.map((g) => (
            <div
              key={g.label}
              className="flex flex-col items-center text-center gap-4 p-8 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`${g.bg} rounded-full p-4`}>
                <g.icon className={`h-8 w-8 ${g.color}`} />
              </div>
              <div>
                <p className={`text-4xl font-extrabold ${g.color}`}>{g.number}</p>
                <p className="text-sm font-semibold text-gray-700 mt-0.5">{g.label}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{g.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Funcionalidades ───────────────────────────────────────────────── */}
      <section className="px-6 py-16 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">Tudo que você precisa</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Um sistema completo para seu pet shop
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Do agendamento ao financeiro, do cliente ao WhatsApp — tudo integrado, sem complicação.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-xl border p-6 flex gap-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="bg-primary/10 rounded-lg p-3 h-fit shrink-0">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ─────────────────────────────────────────────────── */}
      <section className="px-6 py-16 sm:py-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">Simples assim</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Como funciona</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Em minutos você já tem tudo organizado e funcionando.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
          {/* linha conectora (desktop) */}
          <div className="hidden sm:block absolute top-10 left-[calc(16.6%+1rem)] right-[calc(16.6%+1rem)] h-0.5 bg-primary/20" />

          {steps.map((s) => (
            <div key={s.number} className="flex flex-col items-center text-center gap-4 relative">
              <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-sm z-10">
                {s.number}
              </div>
              <div className="bg-primary/5 rounded-xl p-4 w-full">
                <s.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 text-base mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Faixa de confiança ────────────────────────────────────────────── */}
      <section className="bg-primary px-6 py-14">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-white/80 mb-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">Por que o Pata Limpa</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Feito para quem vive de estética animal
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            {trustItems.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-300 shrink-0 mt-0.5" />
                <span className="text-white/90 text-sm leading-relaxed">{item}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Repeat2 className="h-4 w-4" />
            <span>Recorrência automática · WhatsApp integrado · Controle de caixa</span>
          </div>
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-gradient-to-br from-gray-50 to-teal-50">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-6">
          <div className="bg-primary/10 rounded-full p-4">
            <PawPrint className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              Pronto para organizar seu pet shop
              <br />
              <span className="text-primary">de uma vez por todas?</span>
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              Comece hoje. Sem contrato, sem complicação.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button onClick={openLogin} size="lg" className="px-10 text-base shadow-sm">
              <LogIn className="h-5 w-5 mr-2" />
              Entrar no sistema
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-10 text-base border-green-600 text-green-700 hover:bg-green-50"
              onClick={openWhatsApp}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Falar com a gente
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" />Acesso imediato</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" />Suporte pelo WhatsApp</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" />Dados seguros</span>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="text-center py-8 text-xs text-muted-foreground border-t bg-white">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <PawPrint className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-gray-700">Pata Limpa</span>
        </div>
        © {new Date().getFullYear()} Pata Limpa — CRM para Banho e Tosa
        {" · "}Feito especialmente para pet shops brasileiros 🐾
        <div className="mt-2 flex justify-center gap-4">
          <button
            onClick={openLogin}
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <ChevronRight className="h-3 w-3" /> Entrar no sistema
          </button>
          <button
            onClick={openWhatsApp}
            className="hover:text-green-600 transition-colors flex items-center gap-1"
          >
            <ChevronRight className="h-3 w-3" /> Falar com a gente
          </button>
        </div>
      </footer>
    </div>
  );
}
