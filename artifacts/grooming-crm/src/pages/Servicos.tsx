import { useState } from "react";
import { useListServices, useCreateService, useUpdateService, useDeleteService } from "@workspace/api-client-react";
import type { ServiceInputSize } from "@workspace/api-client-react";
import { PORTE_SIZES } from "@/lib/constants";
import { useAppAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Service = { id: number; name: string; size: string; price: number; durationMinutes: number | null };

const ALL_SIZES = Object.entries(PORTE_SIZES) as [string, string][];

type BulkPrices = Record<string, string>;

const emptyBulkForm = { name: "", durationMinutes: 60, prices: {} as BulkPrices };
const emptyEditForm = { name: "", size: "mini_longo", price: "", durationMinutes: 60 };

export default function Servicos() {
  const { tenantId } = useAppAuth();
  const { toast } = useToast();
  const { data: services = [], isLoading, refetch } = useListServices({ tenantId: tenantId! });
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [createOpen, setCreateOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState(emptyBulkForm);
  const [isSaving, setIsSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const [filterSize, setFilterSize] = useState("all");

  const openCreate = () => {
    setBulkForm(emptyBulkForm);
    setCreateOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setEditForm({ name: s.name, size: s.size, price: String(s.price), durationMinutes: s.durationMinutes ?? 60 });
    setEditOpen(true);
  };

  const setBulkPrice = (size: string, value: string) => {
    setBulkForm(f => ({ ...f, prices: { ...f.prices, [size]: value } }));
  };

  const handleCreate = async () => {
    if (!bulkForm.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    const toCreate = ALL_SIZES.filter(([size]) => {
      const val = parseFloat(bulkForm.prices[size] ?? "");
      return !isNaN(val) && val > 0;
    });
    if (toCreate.length === 0) {
      toast({ title: "Informe o preço de pelo menos um porte", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await Promise.all(
        toCreate.map(([size]) =>
          createService.mutateAsync({
            data: {
              tenantId: tenantId!,
              name: bulkForm.name.trim(),
              size: size as ServiceInputSize,
              price: parseFloat(bulkForm.prices[size]!),
              durationMinutes: Number(bulkForm.durationMinutes),
            },
          })
        )
      );
      toast({ title: `Serviço criado para ${toCreate.length} porte${toCreate.length !== 1 ? "s" : ""}!` });
      setCreateOpen(false);
      refetch();
    } catch {
      toast({ title: "Erro ao salvar serviço", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editing) return;
    try {
      await updateService.mutateAsync({
        id: editing.id,
        data: {
          name: editForm.name,
          size: editForm.size as ServiceInputSize,
          price: Number(editForm.price),
          durationMinutes: Number(editForm.durationMinutes),
        },
      });
      toast({ title: "Serviço atualizado!" });
      setEditOpen(false);
      refetch();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este serviço?")) return;
    await deleteService.mutateAsync({ id });
    refetch();
  };

  const filtered = (services as Service[]).filter(s => filterSize === "all" || s.size === filterSize);
  const grouped = filtered.reduce((acc, s) => {
    if (!acc[s.name]) acc[s.name] = [];
    acc[s.name].push(s);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Serviços</h1>
          <p className="text-muted-foreground">Gerencie os serviços por porte e pelagem</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo Serviço</Button>
      </div>

      <div className="flex items-center gap-3">
        <Label className="whitespace-nowrap">Filtrar por porte:</Label>
        <Select value={filterSize} onValueChange={setFilterSize}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(PORTE_SIZES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum serviço encontrado.</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([name, items]) => (
            <Card key={name}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.sort((a, b) => Object.keys(PORTE_SIZES).indexOf(a.size) - Object.keys(PORTE_SIZES).indexOf(b.size)).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/30 transition-colors">
                      <div>
                        <Badge variant="secondary" className="mb-1">{PORTE_SIZES[s.size as keyof typeof PORTE_SIZES] ?? s.size}</Badge>
                        <p className="font-semibold text-primary">{Number(s.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                        <p className="text-xs text-muted-foreground">{s.durationMinutes} min</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Criação em Massa */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do Serviço *</Label>
              <Input
                placeholder="Ex: Banho, Tosa, Banho e Tosa..."
                value={bulkForm.name}
                onChange={e => setBulkForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duração padrão (minutos)</Label>
              <Input
                type="number"
                min={1}
                value={bulkForm.durationMinutes}
                onChange={e => setBulkForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço por porte *</Label>
              <p className="text-xs text-muted-foreground">
                Deixe em branco os portes que não se aplicam a este serviço.
              </p>
              <div className="rounded-lg border divide-y">
                {ALL_SIZES.map(([size, label]) => (
                  <div key={size} className="flex items-center justify-between px-3 py-2 gap-3">
                    <span className="text-sm w-36 shrink-0">{label}</span>
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={bulkForm.prices[size] ?? ""}
                        onChange={e => setBulkPrice(size, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Criar Serviço"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição Individual */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome do Serviço *</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Porte / Pelagem *</Label>
              <Select value={editForm.size} onValueChange={v => setEditForm(f => ({ ...f, size: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PORTE_SIZES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preço (R$) *</Label>
              <Input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div>
              <Label>Duração (minutos)</Label>
              <Input type="number" value={editForm.durationMinutes} onChange={e => setEditForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={!editForm.name || !editForm.price}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
