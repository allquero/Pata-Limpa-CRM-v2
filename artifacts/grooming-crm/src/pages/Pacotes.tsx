import { useState } from "react";
import { useListPackages, useCreatePackage, useUpdatePackage, useDeletePackage, useListServices } from "@workspace/api-client-react";
import { DEFAULT_TENANT_ID } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package, Tag, X } from "lucide-react";

type ServiceItem = { serviceName: string; quantity: number };

type Pkg = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  serviceItems: ServiceItem[];
};

const emptyForm = {
  name: "",
  description: "",
  price: "",
  serviceItems: [] as ServiceItem[],
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Pacotes() {
  const { toast } = useToast();
  const { data: packages = [], isLoading, refetch } = useListPackages({ tenantId: DEFAULT_TENANT_ID });
  const { data: services = [] } = useListServices({ tenantId: DEFAULT_TENANT_ID });
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const deletePackage = useDeletePackage();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Pkg | null>(null);

  // Unique service names (types) from the catalog
  const serviceNames = Array.from(new Set((services as any[]).map(s => s.name))).sort();

  // Which service names are already in the form
  const usedNames = form.serviceItems.map(i => i.serviceName);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (pkg: Pkg) => {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description ?? "",
      price: String(pkg.price),
      serviceItems: pkg.serviceItems.map(i => ({ ...i })),
    });
    setModalOpen(true);
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

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Nome é obrigatório", variant: "destructive" }); return; }
    if (!form.price || isNaN(Number(form.price))) { toast({ title: "Preço inválido", variant: "destructive" }); return; }
    try {
      const payload = {
        tenantId: DEFAULT_TENANT_ID,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        serviceItems: form.serviceItems,
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

  const isSaving = createPackage.isPending || updatePackage.isPending;

  // Service names not yet added to the form
  const availableNames = serviceNames.filter(n => !usedNames.includes(n));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pacotes</h1>
          <p className="text-muted-foreground">Combos de serviços com preço especial — válidos para qualquer porte</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Pacote
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : packages.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Package className="h-12 w-12 opacity-30" />
          <p className="text-lg">Nenhum pacote cadastrado</p>
          <Button variant="outline" onClick={openCreate}>Criar primeiro pacote</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(packages as Pkg[]).map(pkg => (
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
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">{formatBRL(pkg.price)}</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1 text-xs">
                    <Tag className="h-3 w-3" />
                    todos os portes
                  </Badge>
                </div>
                {pkg.serviceItems && pkg.serviceItems.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inclui</p>
                    <div className="flex flex-col gap-1">
                      {pkg.serviceItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-normal">
                            {item.quantity}× {item.serviceName}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do pacote *</Label>
              <Input
                placeholder="Ex: Pacote Mensal"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                placeholder="Descreva o pacote"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Preço do pacote (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              />
            </div>

            {/* Service Items */}
            <div className="space-y-2">
              <Label>Serviços incluídos</Label>
              <p className="text-xs text-muted-foreground">
                Selecione o tipo de serviço e a quantidade — o preço se adapta automaticamente ao porte de cada pet no agendamento.
              </p>

              {form.serviceItems.length > 0 && (
                <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                  {form.serviceItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="flex-1 text-sm font-medium">{item.serviceName}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateItemQty(idx, item.quantity - 1)}
                        >
                          −
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateItemQty(idx, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(idx)}
                      >
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

              {form.serviceItems.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total de sessões:{" "}
                  <span className="font-medium text-foreground">
                    {form.serviceItems.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                </p>
              )}
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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
