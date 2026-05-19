import { CalendarClock, PawPrint, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppAuth } from "@/lib/auth-context";
import { buildWhatsAppUrl } from "@/lib/admin-config";

export default function AcessoNaoIniciado() {
  const { logout, tenant } = useAppAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6 max-w-md w-full mx-4 text-center">
        <div className="bg-blue-100 rounded-full p-5">
          <CalendarClock className="h-12 w-12 text-blue-600" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <PawPrint className="h-5 w-5" />
            <span className="text-lg font-bold">Pata Limpa</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Acesso ainda não iniciado</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Seu acesso ao Pata Limpa está programado para iniciar em{" "}
            <strong>
              {tenant?.accessStart
                ? new Date(tenant.accessStart + "T00:00:00").toLocaleDateString("pt-BR")
                : "breve"}
            </strong>
            .
          </p>
        </div>

        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          onClick={() => window.open(buildWhatsAppUrl("Olá! Tenho uma dúvida sobre meu acesso ao Pata Limpa."), "_blank")}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Falar com o suporte pelo WhatsApp
        </Button>

        <Button variant="outline" onClick={logout} className="w-full">
          Sair
        </Button>
      </div>
    </div>
  );
}
