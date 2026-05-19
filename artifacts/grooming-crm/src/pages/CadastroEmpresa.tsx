import { useState } from "react";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRegisterMyTenant } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyTenantQueryKey } from "@workspace/api-client-react";

export default function CadastroEmpresa() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: registerTenant, isPending } = useRegisterMyTenant({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyTenantQueryKey() });
        toast({ title: "Empresa cadastrada com sucesso!" });
      },
      onError: () => {
        toast({
          title: "Erro ao cadastrar empresa",
          description: "Verifique os dados e tente novamente.",
          variant: "destructive",
        });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }
    registerTenant({ data: { name: name.trim(), phone: phone || undefined, email: email || undefined, address: address || undefined } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col gap-6 max-w-md w-full mx-4">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary/10 rounded-full p-4">
            <Scissors className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Cadastre seu Pet Shop</h1>
          <p className="text-muted-foreground text-center text-sm">
            Bem-vindo ao Pata Limpa! Informe os dados do seu estabelecimento para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Nome do pet shop *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pet Shop Amigo Fiel"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@meuPetShop.com.br"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade"
            />
          </div>

          <Button type="submit" className="w-full mt-2" size="lg" disabled={isPending}>
            {isPending ? "Cadastrando..." : "Cadastrar Pet Shop"}
          </Button>
        </form>
      </div>
    </div>
  );
}
