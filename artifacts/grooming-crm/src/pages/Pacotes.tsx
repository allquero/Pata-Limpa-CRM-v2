import { useState, useMemo } from "react";
import { useListPackages, useCreatePackage, useUpdatePackage, useDeletePackage, useListServices } from "@workspace/api-client-react";
import { DEFAULT_TENANT_ID } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package, Tag, Clock } from "lucide-react";

type Pkg = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  serviceIds: number[];
};

const emptyForm = { name: "", description: "", price: "", serviceIds: [] as number[] };

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

  const serviceMap = useMemo(() => {
    const m: Record<number, typeof services[0]> = {};
    for (const s of services) m[s.id] = s;
    return m;
  }, [services]);

  const groupedServices = useMemo(() => {
    const g: Record<string, typeof services> = {};
    for (const s of services) {
      if (!g[s.name]) g[s.name] = [];
      g[s.name].push(s);
    }
    return g;
  }, [services]);

  const sumServicesPrice = (ids: number[]) =>
    ids.reduce((s, id) => s + (parseFloat(String(serviceMap[id]?.price ?? 0))), 0);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (pkg: Pkg) => {
    setEditing(pkg);
    setForm({ name: pkg.name, description: pkg.description ?? "", price: String(pkg.price), serviceIds: pkg.serviceIds });
    setModalOpen(true);
  };

  const toggleService = (id: number) => {
    setForm(f => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter(s => s !== id) : [...f.serviceIds, id],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Nome é obrigatório", variant: "destructive" }); return; }
    if (!form.price || isNaN(Number(form.price))) { toast({ title: "Preço inválido", variant: "destructive" }); return; }
    try {
      const payload = {
        tenantId: DEFAULT_TENANT_ID,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: form.price,
        serviceIds: form.serviceIds,
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pacotes</h1>
          <p className="text-muted-foreground">Combos de serviços com preço especial</p>
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
          {(packages as Pkg[]).map(pkg => {
            const originalPrice = sumServicesPrice(pkg.serviceIds);
            const discount = originalPrice > 0 ? Math.round((1 - pkg.price / originalPrice) * 100) : 0;
            const includedServices = pkg.serviceIds.map(id => serviceMap[id]).filter(Boolean);

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
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">{formatBRL(pkg.price)}</span>
                    {discount > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1">
                        <Tag className="h-3 w-3" />
                        {discount}% off
                      </Badge>
                    )}
                  </div>
                  {originalPrice > 0 && pkg.price < originalPrice && (
                    <p className="text-xs text-muted-foreground line-through">{formatBRL(originalPrice)} avulso</p>
                  )}
                  {includedServices.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inclui</p>
                      <div className="flex flex-wrap gap-1">
                        {includedServices.map(s => (
                          <Badge key={s.id} variant="outline" className="text-xs">
                            {s.name} · {s.size?.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {includedServices.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {includedServices.reduce((s, sv) => s + (sv.durationMinutes ?? 0), 0)} min no total
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do pacote *</Label>
              <Input placeholder="Ex: Pacote Completo Pequeno" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input placeholder="Descreva o que está incluso" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Preço (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              />
              {form.serviceIds.length > 0 && (() => {
                const orig = sumServicesPrice(form.serviceIds);
                const pkg = parseFloat(form.price) || 0;
                if (orig > 0 && pkg < orig) {
                  const disc = Math.round((1 - pkg / orig) * 100);
                  return <p className="text-xs text-green-600">{disc}% de desconto em relação aos serviços avulsos ({formatBRL(orig)})</p>;
                }
                if (orig > 0) return <p className="text-xs text-muted-foreground">Valor avulso: {formatBRL(orig)}</p>;
                return null;
              })()}
            </div>
            <div className="space-y-2">
              <Label>Serviços incluídos</Label>
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {Object.entries(groupedServices).map(([groupName, svcs]) => (
                  <div key={groupName} className="p-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 px-1">{groupName}</p>
                    <div className="space-y-1">
                      {svcs.map(s => {
                        const label = `${s.size?.replace(/_/g, " ")} — ${formatBRL(parseFloat(String(s.price)))}`;
                        return (
                          <label key={s.id} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-muted cursor-pointer">
                            <Checkbox
                              checked={form.serviceIds.includes(s.id)}
                              onCheckedChange={() => toggleService(s.id)}
                            />
                            <span className="text-sm capitalize">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {form.serviceIds.length > 0 && (
                <p className="text-xs text-muted-foreground">{form.serviceIds.length} serviço(s) selecionado(s)</p>
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
