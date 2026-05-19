import { useState } from "react";
import {
  useListPackages, useCreatePackage, useUpdatePackage, useDeletePackage,
  useListServices, useListClients, useListPets, useSellPackage,
  getListPetsQueryKey,
} from "@workspace/api-client-react";
import { DEFAULT_TENANT_ID, PORTE_SIZES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package, X, ShoppingCart, CalendarCheck } from "lucide-react";
import { format } from "date-fns";

type ServiceItem = { serviceName: string; quantity: number };
type PriceBySize = { size: string; price: number };

type Pkg = {
  id: number;
  name: string;
  description: string | null;
  serviceItems: ServiceItem[];
  priceBySizes: PriceBySize[];
};

const ALL_SIZES = Object.entries(PORTE_SIZES) as [string, string][];

const emptyPriceBySizes = (): PriceBySize[] =>
  ALL_SIZES.map(([size]) => ({ size, price: 0 }));

const emptyForm = {
  name: "",
  description: "",
  serviceItems: [] as ServiceItem[],
  priceBySizes: emptyPriceBySizes(),
};

const emptySellForm = {
  clientId: "",
  petId: "",
  startDate: format(new Date(), "yyyy-MM-dd"),
  startTime: "09:00",
  notes: "",
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Pacotes() {
  const { toast } = useToast();
  const { data: packages = [], isLoading, refetch } = useListPackages({ tenantId: DEFAULT_TENANT_ID });
  const { data: services = [] } = useListServices({ tenantId: DEFAULT_TENANT_ID });
  const { data: clients = [] } = useListClients({ tenantId: DEFAULT_TENANT_ID });
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const deletePackage = useDeletePackage();
  const sellPackage = useSellPackage();

  // Package create/edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Pkg | null>(null);

  // Sell modal
  const [sellTarget, setSellTarget] = useState<Pkg | null>(null);
  const [sellForm, setSellForm] = useState(emptySellForm);

  const serviceNames = Array.from(new Set((services as any[]).map((s: any) => s.name))).sort() as string[];
  const usedNames = form.serviceItems.map(i => i.serviceName);
  const availableNames = serviceNames.filter(n => !usedNames.includes(n));

  // Pets filtered by selected client in sell form
  const sellPetParams = sellForm.clientId ? { clientId: Number(sellForm.clientId) } : { clientId: 0 };
  const { data: clientPets = [] } = useListPets(sellPetParams, {
    query: { queryKey: getListPetsQueryKey(sellPetParams), enabled: !!sellForm.clientId },
  });

  // Price for selected pet
  const selectedPet = (clientPets as any[]).find((p: any) => p.id === Number(sellForm.petId));
  const petSize = selectedPet?.size as string | undefined;
  const priceForPet = petSize && sellTarget
    ? (sellTarget.priceBySizes.find(p => p.size === petSize)?.price ?? null)
    : null;

  // Compute session summary for sell modal
  const sellSessions = (() => {
    if (!sellTarget) return [];
    const items = [...(sellTarget.serviceItems ?? [])].sort((a, b) => b.quantity - a.quantity);
    const main = items[0];
    const extras = items.slice(1);
    if (!main) return [];
    const sessions = [];
    for (let i = 0; i < main.quantity; i++) {
      const isLast = i === main.quantity - 1;
      sessions.push({
        index: i + 1,
        label: isLast && extras.length > 0
          ? `${main.serviceName} + ${extras.map(e => e.serviceName).join(" + ")}`
          : main.serviceName,
        hasExtra: isLast && extras.length > 0,
      });
    }
    return sessions;
  })();

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (pkg: Pkg) => {
    setEditing(pkg);
    const savedMap = Object.fromEntries((pkg.priceBySizes ?? []).map(p => [p.size, p.price]));
    const priceBySizes = ALL_SIZES.map(([size]) => ({ size, price: savedMap[size] ?? 0 }));
    setForm({
      name: pkg.name,
      description: pkg.description ?? "",
      serviceItems: pkg.serviceItems.map(i => ({ ...i })),
      priceBySizes,
    });
    setModalOpen(true);
  };

  const openSell = (pkg: Pkg) => {
    setSellTarget(pkg);
    setSellForm(emptySellForm);
  };

  const addServiceItem = (serviceName: string) => {
    if (!serviceName || usedNames.includes(serviceName)) return;
    setForm(f => ({ ...f, serviceItems: [...f.serviceItems, { serviceName, quantity: 1 }] }));
  };

  const updateItemQty = (idx: number, qty: number) => {
    setForm(f => {
      const items = [...f.serviceItems];
      items[idx] = { ...items[idx], quantity: Math.max(1, qty) };
      return { ...f, serviceItems: items };
    });
  };

  const removeItem = (idx: number) => {
    setForm(f => ({ ...f, serviceItems: f.serviceItems.filter((_, i) => i !== idx) }));
  };

  const updatePrice = (size: string, raw: string) => {
    const price = parseFloat(raw) || 0;
    setForm(f => ({
      ...f,
      priceBySizes: f.priceBySizes.map(p => p.size === size ? { ...p, price } : p),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Nome é obrigatório", variant: "destructive" }); return; }
    const hasAnyPrice = form.priceBySizes.some(p => p.price > 0);
    if (!hasAnyPrice) { toast({ title: "Defina ao menos um preço por porte", variant: "destructive" }); return; }
    try {
      const payload = {
        tenantId: DEFAULT_TENANT_ID,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        serviceItems: form.serviceItems,
        priceBySizes: form.priceBySizes.filter(p => p.price > 0),
      };
      if (editing) {
        await updatePackage.mutateAsync({ id: editing.id, data: payload });
        toast({ title: "Pacote atualizado!" });
      } else {
        await createPackage.mutateAsync({ data: payload });
        toast({ title: "Pacote criado!" });
      }
      setModalOpen(false);
      refetch();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePackage.mutateAsync({ id: deleteTarget.id });
      toast({ title: "Pacote excluído!" });
      refetch();
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSell = async () => {
    if (!sellTarget) return;
    if (!sellForm.clientId) { toast({ title: "Selecione o cliente", variant: "destructive" }); return; }
    if (!sellForm.petId) { toast({ title: "Selecione o pet", variant: "destructive" }); return; }
    if (!sellForm.startDate) { toast({ title: "Informe a data do primeiro agendamento", variant: "destructive" }); return; }
    if (!sellForm.startTime) { toast({ title: "Informe o horário", variant: "destructive" }); return; }

    try {
      const result = await sellPackage.mutateAsync({
        id: sellTarget.id,
        data: {
          tenantId: DEFAULT_TENANT_ID,
          clientId: Number(sellForm.clientId),
          petId: Number(sellForm.petId),
          startDate: sellForm.startDate,
          startTime: sellForm.startTime,
          notes: sellForm.notes || null,
        },
      });
      const count = (result as any).appointments?.length ?? 0;
      const price = (result as any).financialEntry?.amount ?? 0;
      toast({
        title: "Pacote vendido com sucesso!",
        description: `${count} agendamento${count !== 1 ? "s" : ""} criado${count !== 1 ? "s" : ""} · Receita: ${formatBRL(price)}`,
      });
      setSellTarget(null);
    } catch {
      toast({ title: "Erro ao vender pacote", variant: "destructive" });
    }
  };

  const isSaving = createPackage.isPending || updatePackage.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pacotes</h1>
          <p className="text-muted-foreground">Combos de serviços com preço por porte</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Pacote
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : packages.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Package className="h-12 w-12 opacity-30" />
          <p className="text-lg">Nenhum pacote cadastrado</p>
          <Button variant="outline" onClick={openCreate}>Criar primeiro pacote</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(packages as Pkg[]).map(pkg => {
            const prices = pkg.priceBySizes ?? [];
            const priceValues = prices.map(p => p.price).filter(p => p > 0);
            const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
            const maxPrice = priceValues.length ? Math.max(...priceValues) : 0;

            return (
              <Card key={pkg.id} className="flex flex-col border hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg leading-tight">{pkg.name}</CardTitle>
                      {pkg.description && (
                        <CardDescription className="mt-1 line-clamp-2">{pkg.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(pkg)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(pkg)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {/* Price range */}
                  <div>
                    {minPrice === maxPrice && minPrice > 0 ? (
                      <span className="text-2xl font-bold text-primary">{formatBRL(minPrice)}</span>
                    ) : minPrice > 0 ? (
                      <span className="text-xl font-bold text-primary">{formatBRL(minPrice)} – {formatBRL(maxPrice)}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sem preços definidos</span>
                    )}
                  </div>

                  {/* Service items */}
                  {pkg.serviceItems && pkg.serviceItems.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inclui</p>
                      <div className="flex flex-wrap gap-1">
                        {pkg.serviceItems.map((item, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-normal">
                            {item.quantity}× {item.serviceName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price by size table */}
                  {prices.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preço por porte</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                        {prices.map(p => (
                          <div key={p.size} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground capitalize">{PORTE_SIZES[p.size as keyof typeof PORTE_SIZES] ?? p.size}</span>
                            <span className="font-medium">{formatBRL(p.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sell button */}
                  <Button
                    className="w-full gap-2 mt-1"
                    size="sm"
                    onClick={() => openSell(pkg)}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Vender Pacote
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Nome do pacote *</Label>
              <Input
                placeholder="Ex: Pacote Mensal"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                placeholder="Descreva o pacote"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Service items */}
            <div className="space-y-2">
              <Label>Serviços incluídos</Label>
              {form.serviceItems.length > 0 && (
                <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                  {form.serviceItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="flex-1 text-sm font-medium">{item.serviceName}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateItemQty(idx, item.quantity - 1)}>−</Button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateItemQty(idx, item.quantity + 1)}>+</Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {availableNames.length > 0 && (
                <Select onValueChange={addServiceItem} value="">
                  <SelectTrigger>
                    <SelectValue placeholder="+ Adicionar tipo de serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNames.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Prices by size */}
            <div className="space-y-2">
              <Label>Preço por porte *</Label>
              <p className="text-xs text-muted-foreground">Deixe 0 para portes que não se aplicam a este pacote.</p>
              <div className="rounded-lg border divide-y">
                {form.priceBySizes.map(({ size, price }) => (
                  <div key={size} className="flex items-center justify-between px-3 py-2 gap-3">
                    <span className="text-sm w-32 shrink-0">{PORTE_SIZES[size as keyof typeof PORTE_SIZES] ?? size}</span>
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={price === 0 ? "" : price}
                        onChange={e => updatePrice(size, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : editing ? "Salvar" : "Criar Pacote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sell Modal */}
      <Dialog open={!!sellTarget} onOpenChange={o => !o && setSellTarget(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Vender Pacote
            </DialogTitle>
            {sellTarget && (
              <p className="text-sm text-muted-foreground mt-1">{sellTarget.name}</p>
            )}
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Cliente */}
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select
                value={sellForm.clientId}
                onValueChange={v => setSellForm(f => ({ ...f, clientId: v, petId: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {(clients as any[]).map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pet */}
            <div className="space-y-1.5">
              <Label>Pet *</Label>
              <Select
                value={sellForm.petId}
                onValueChange={v => setSellForm(f => ({ ...f, petId: v }))}
                disabled={!sellForm.clientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={sellForm.clientId ? "Selecione o pet" : "Selecione um cliente primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {(clientPets as any[]).map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} — {PORTE_SIZES[p.size as keyof typeof PORTE_SIZES] ?? p.size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price preview */}
            {sellForm.petId && (
              <div className="rounded-lg bg-muted/40 border px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor do pacote</span>
                {priceForPet !== null ? (
                  <span className="text-lg font-bold text-primary">{formatBRL(priceForPet)}</span>
                ) : (
                  <span className="text-sm text-amber-600">Sem preço definido para este porte</span>
                )}
              </div>
            )}

            {/* Data */}
            <div className="space-y-1.5">
              <Label>Data do 1º agendamento *</Label>
              <Input
                type="date"
                value={sellForm.startDate}
                onChange={e => setSellForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </div>

            {/* Horário */}
            <div className="space-y-1.5">
              <Label>Horário *</Label>
              <Input
                type="time"
                value={sellForm.startTime}
                onChange={e => setSellForm(f => ({ ...f, startTime: e.target.value }))}
              />
            </div>

            {/* Session preview */}
            {sellSessions.length > 0 && sellForm.startDate && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Agendamentos que serão criados
                </p>
                <div className="rounded-lg border divide-y text-sm">
                  {sellSessions.map((s, i) => {
                    const d = new Date(`${sellForm.startDate}T${sellForm.startTime}`);
                    d.setDate(d.getDate() + i * 7);
                    return (
                      <div key={s.index} className="flex items-center justify-between px-3 py-2">
                        <span className="text-muted-foreground">
                          {d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                          {" "}às {sellForm.startTime}
                        </span>
                        <span className={s.hasExtra ? "font-medium text-primary" : ""}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações para todos os agendamentos"
                value={sellForm.notes}
                onChange={e => setSellForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSellTarget(null)}>Cancelar</Button>
            <Button onClick={handleSell} disabled={sellPackage.isPending} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              {sellPackage.isPending ? "Criando..." : `Confirmar Venda (${sellSessions.length} agend.)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pacote?</AlertDialogTitle>
            <AlertDialogDescription>
              O pacote <strong>{deleteTarget?.name}</strong> será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
