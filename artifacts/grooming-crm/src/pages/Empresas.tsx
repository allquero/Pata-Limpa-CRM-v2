import { useState, useEffect } from "react";
import { useGetTenant, useUpdateTenant } from "@workspace/api-client-react";
import { useAppAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save } from "lucide-react";

export default function Empresas() {
  const { tenantId } = useAppAuth();
  const { toast } = useToast();
  const { data: tenant, isLoading, refetch } = useGetTenant(tenantId!);
  const updateTenant = useUpdateTenant();

  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });

  useEffect(() => {
    if (tenant) {
      setForm({
        name: (tenant as any).name ?? "",
        phone: (tenant as any).phone ?? "",
        email: (tenant as any).email ?? "",
        address: (tenant as any).address ?? "",
      });
    }
  }, [tenant]);

  const handleSave = async () => {
    try {
      await updateTenant.mutateAsync({ id: tenantId!, data: form });
      toast({ title: "Dados da empresa atualizados!" });
      refetch();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações da Empresa</h1>
        <p className="text-muted-foreground">Dados do seu pet shop</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Informações Gerais
          </CardTitle>
          <CardDescription>Esses dados aparecem nas confirmações e comunicações.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="space-y-4">
              <div><Label>Nome do Pet Shop *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Telefone / WhatsApp</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" /></div>
              <div><Label>E-mail</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Endereço</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
              <Button onClick={handleSave} disabled={!form.name} className="w-full">
                <Save className="h-4 w-4 mr-2" />Salvar Alterações
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
