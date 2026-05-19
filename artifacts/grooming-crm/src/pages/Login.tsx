import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppAuth } from "@/lib/auth-context";

export default function Login() {
  const { login } = useAppAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary/10 rounded-full p-4">
            <Scissors className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Pata Limpa</h1>
          <p className="text-muted-foreground text-center text-sm">
            CRM para pet shops de banho e tosa
          </p>
        </div>

        <div className="w-full border-t" />

        <div className="flex flex-col items-center gap-3 w-full">
          <p className="text-sm text-muted-foreground text-center">
            Acesse sua conta para gerenciar seu pet shop
          </p>
          <Button onClick={login} className="w-full" size="lg">
            Entrar
          </Button>
        </div>
      </div>
    </div>
  );
}
