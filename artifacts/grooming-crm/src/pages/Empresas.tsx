import { useState, useEffect } from "react";
import { useGetTenant, useUpdateTenant } from "@workspace/api-client-react";
import { useAppAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save, Clock, Sun } from "lucide-react";

export default function Empresas() {
  const { tenantId } = useAppAuth();
  const { toast } = useToast();
  const { data: tenant, isLoading, refetch } = useGetTenant(tenantId!);
  const updateTenant = useUpdateTenant();

  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", schedulingMethod: "hora" as "hora" | "periodo" });

  useEffect(() => {
    if (tenant) {
      setForm({
        name: (tenant as any).name ?? "",
        phone: (tenant as any).phone ?? "",
        email: (tenant as any).email ?? "",
        address: (tenant as any).address ?? "",
        schedulingMethod: ((tenant as any).schedulingMethod ?? "hora") as "hora" | "periodo",
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

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Método de Agendamento
          </CardTitle>
          <CardDescription>Escolha como os horários dos agendamentos são definidos.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, schedulingMethod: "hora" }))}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    form.schedulingMethod === "hora"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Clock className="h-6 w-6" />
                  <span className="text-sm font-semibold">Por Hora</span>
                  <span className="text-xs text-center leading-tight">Horário exato (ex: 14:30)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, schedulingMethod: "periodo" }))}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    form.schedulingMethod === "periodo"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Sun className="h-6 w-6" />
                  <span className="text-sm font-semibold">Por Período</span>
                  <span className="text-xs text-center leading-tight">Manhã ou Tarde</span>
                </button>
              </div>
              <Button
                onClick={handleSave}
                disabled={!form.name || updateTenant.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />Salvar Método
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
