import { useState, useEffect } from "react";
import { useGetTenant, useUpdateTenant } from "@workspace/api-client-react";
import { useAppAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save, Clock, Sun, PawPrint, X, Plus, Globe } from "lucide-react";
import { DEFAULT_PORTE_ORDER, DEFAULT_COAT_LABELS } from "@/lib/constants";

export default function Empresas() {
  const { tenantId } = useAppAuth();
  const { toast } = useToast();
  const { data: tenant, isLoading, refetch } = useGetTenant(tenantId!);
  const updateTenant = useUpdateTenant();

  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "",
    schedulingMethod: "hora" as "hora" | "periodo",
    utcOffset: -3,
  });

  const [petSizes, setPetSizes] = useState<string[]>(DEFAULT_PORTE_ORDER.slice());
  const [coatTypes, setCoatTypes] = useState<string[]>(Object.keys(DEFAULT_COAT_LABELS));
  const [newSize, setNewSize] = useState("");
  const [newCoat, setNewCoat] = useState("");

  useEffect(() => {
    if (tenant) {
      const t = tenant as any;
      setForm({
        name: t.name ?? "",
        phone: t.phone ?? "",
        email: t.email ?? "",
        address: t.address ?? "",
        schedulingMethod: (t.schedulingMethod ?? "hora") as "hora" | "periodo",
        utcOffset: t.utcOffset ?? -3,
      });
      if (Array.isArray(t.petSizes) && t.petSizes.length > 0) setPetSizes(t.petSizes);
      if (Array.isArray(t.coatTypes) && t.coatTypes.length > 0) setCoatTypes(t.coatTypes);
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

  const handleSaveSizes = async () => {
    if (petSizes.length === 0) {
      toast({ title: "Informe ao menos um porte", variant: "destructive" });
      return;
    }
    if (coatTypes.length === 0) {
      toast({ title: "Informe ao menos uma pelagem", variant: "destructive" });
      return;
    }
    try {
      await updateTenant.mutateAsync({
        id: tenantId!,
        data: { petSizes, coatTypes } as any,
      });
      toast({ title: "Portes e pelagens atualizados!" });
      refetch();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const addSize = () => {
    const v = newSize.trim().toLowerCase().replace(/\s+/g, "_");
    if (!v || petSizes.includes(v)) return;
    setPetSizes(s => [...s, v]);
    setNewSize("");
  };

  const removeSize = (v: string) => setPetSizes(s => s.filter(x => x !== v));

  const addCoat = () => {
    const v = newCoat.trim().toLowerCase().replace(/\s+/g, "_");
    if (!v || coatTypes.includes(v)) return;
    setCoatTypes(s => [...s, v]);
    setNewCoat("");
  };

  const removeCoat = (v: string) => setCoatTypes(s => s.filter(x => x !== v));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações da Empresa</h1>
        <p className="text-muted-foreground">Dados do seu pet shop</p>
      </div>

      {/* ── Informações Gerais ── */}
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

      {/* ── Método de Agendamento ── */}
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
              <div>
                <Label className="flex items-center gap-1.5 mb-1.5">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Fuso horário (UTC offset)
                </Label>
                <Select
                  value={String(form.utcOffset)}
                  onValueChange={v => setForm(f => ({ ...f, utcOffset: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-12">UTC-12</SelectItem>
                    <SelectItem value="-11">UTC-11</SelectItem>
                    <SelectItem value="-10">UTC-10 (Havaí)</SelectItem>
                    <SelectItem value="-9">UTC-9 (Alasca)</SelectItem>
                    <SelectItem value="-8">UTC-8 (Los Angeles)</SelectItem>
                    <SelectItem value="-7">UTC-7 (Denver)</SelectItem>
                    <SelectItem value="-6">UTC-6 (Chicago)</SelectItem>
                    <SelectItem value="-5">UTC-5 (Nova York, Bogotá)</SelectItem>
                    <SelectItem value="-4">UTC-4 (Manaus, Cuiabá, Santiago)</SelectItem>
                    <SelectItem value="-3">UTC-3 (Brasília, Buenos Aires)</SelectItem>
                    <SelectItem value="-2">UTC-2 (Noronha)</SelectItem>
                    <SelectItem value="-1">UTC-1 (Açores)</SelectItem>
                    <SelectItem value="0">UTC+0 (Lisboa, Londres)</SelectItem>
                    <SelectItem value="1">UTC+1 (Paris, Madrid)</SelectItem>
                    <SelectItem value="2">UTC+2 (Cairo, Atenas)</SelectItem>
                    <SelectItem value="3">UTC+3 (Moscou, Nairobi)</SelectItem>
                    <SelectItem value="4">UTC+4 (Dubai)</SelectItem>
                    <SelectItem value="5">UTC+5 (Paquistão)</SelectItem>
                    <SelectItem value="6">UTC+6 (Bangladesh)</SelectItem>
                    <SelectItem value="7">UTC+7 (Bangkok)</SelectItem>
                    <SelectItem value="8">UTC+8 (Pequim, Singapura)</SelectItem>
                    <SelectItem value="9">UTC+9 (Tóquio, Seul)</SelectItem>
                    <SelectItem value="10">UTC+10 (Sydney)</SelectItem>
                    <SelectItem value="11">UTC+11 (Ilhas Salomão)</SelectItem>
                    <SelectItem value="12">UTC+12 (Nova Zelândia)</SelectItem>
                    <SelectItem value="13">UTC+13</SelectItem>
                    <SelectItem value="14">UTC+14</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Usado para classificar Manhã/Tarde corretamente nas mensagens.</p>
              </div>
              <Button
                onClick={handleSave}
                disabled={!form.name || updateTenant.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />Salvar Método e Fuso
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Portes e Pelagens ── */}
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-primary" />
            Portes e Pelagens
          </CardTitle>
          <CardDescription>
            Defina os portes e tipos de pelagem disponíveis no seu pet shop. Esses valores são usados nos
            cadastros de pets e na tabela de preços dos serviços.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Portes */}
              <div className="space-y-2">
                <Label className="font-semibold">Portes</Label>
                <p className="text-xs text-muted-foreground">Arraste para reordenar (use os nomes em minúsculas, ex: mini, pequeno, medio).</p>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-lg bg-muted/20">
                  {petSizes.map(p => (
                    <Badge key={p} variant="secondary" className="gap-1 pr-1">
                      {p}
                      <button
                        onClick={() => removeSize(p)}
                        className="ml-1 hover:text-destructive transition-colors"
                        title="Remover"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Novo porte (ex: extra_grande)"
                    value={newSize}
                    onChange={e => setNewSize(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSize(); } }}
                    className="h-8 text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={addSize} disabled={!newSize.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Pelagens */}
              <div className="space-y-2">
                <Label className="font-semibold">Pelagens</Label>
                <p className="text-xs text-muted-foreground">Tipos de pelagem aceitos no seu pet shop (ex: curto, longo, duplo).</p>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-lg bg-muted/20">
                  {coatTypes.map(c => (
                    <Badge key={c} variant="outline" className="gap-1 pr-1">
                      {c}
                      <button
                        onClick={() => removeCoat(c)}
                        className="ml-1 hover:text-destructive transition-colors"
                        title="Remover"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nova pelagem (ex: duplo, crespo)"
                    value={newCoat}
                    onChange={e => setNewCoat(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCoat(); } }}
                    className="h-8 text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={addCoat} disabled={!newCoat.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={handleSaveSizes} disabled={updateTenant.isPending} className="w-full">
                <Save className="h-4 w-4 mr-2" />Salvar Portes e Pelagens
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
