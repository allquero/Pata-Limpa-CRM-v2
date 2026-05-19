import { AlertCircle, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppAuth } from "@/lib/auth-context";

export default function AcessoExpirado() {
  const { logout, tenant, user } = useAppAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6 max-w-md w-full mx-4 text-center">
        <div className="bg-red-100 rounded-full p-5">
          <AlertCircle className="h-12 w-12 text-red-600" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <PawPrint className="h-5 w-5" />
            <span className="text-lg font-bold">Pata Limpa</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Acesso expirado</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {tenant?.name ? `O acesso de "${tenant.name}"` : "Seu acesso"} ao Pata Limpa expirou em{" "}
            {tenant?.accessEnd
              ? new Date(tenant.accessEnd + "T00:00:00").toLocaleDateString("pt-BR")
              : "data desconhecida"}
            .
          </p>
          {user?.firstName && (
            <p className="text-muted-foreground text-sm">
              Olá, {user.firstName}! Entre em contato para renovar sua assinatura.
            </p>
          )}
        </div>

        <div className="w-full border rounded-lg p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-800">
            Renove seu plano para continuar usando o sistema.
          </p>
        </div>

        <Button variant="outline" onClick={logout} className="w-full">
          Sair
        </Button>
      </div>
    </div>
  );
}
