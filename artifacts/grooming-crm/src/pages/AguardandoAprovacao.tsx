import { Clock, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppAuth } from "@/lib/auth-context";

export default function AguardandoAprovacao() {
  const { logout, user } = useAppAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6 max-w-md w-full mx-4 text-center">
        <div className="bg-amber-100 rounded-full p-5">
          <Clock className="h-12 w-12 text-amber-600" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <PawPrint className="h-5 w-5" />
            <span className="text-lg font-bold">Pata Limpa</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Aguardando aprovação</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Olá{user?.firstName ? `, ${user.firstName}` : ""}! Sua conta está aguardando ativação pelo administrador.
            Em breve você receberá acesso ao sistema.
          </p>
        </div>

        <div className="w-full border rounded-lg p-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            Entre em contato com o suporte para agilizar seu cadastro.
          </p>
        </div>

        <Button variant="outline" onClick={logout} className="w-full">
          Sair
        </Button>
      </div>
    </div>
  );
}
