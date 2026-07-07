import { useState } from "react";
import { useListServices, useCreateService, useUpdateService, useDeleteService, useGetTenant } from "@workspace/api-client-react";
import { DEFAULT_PORTE_ORDER, DEFAULT_COAT_LABELS, getPorteLabel, getCoatLabel } from "@/lib/constants";
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

type Service = { id: number; name: string; size: string; coat: string; price: number; durationMinutes: number | null };

type BulkPrices = Record<string, string>; // key = "size|coat"

const emptyBulkForm = { name: "", durationMinutes: 60, prices: {} as BulkPrices };
const emptyEditForm = { name: "", size: "pequeno", coat: "curto", price: "", durationMinutes: 60 };

function sizeCoatKey(size: string, coat: string) { return `${size}|${coat}`; }

export default function Servicos() {
  const { tenantId } = useAppAuth();
  const { toast } = useToast();
  const { data: tenant } = useGetTenant(tenantId!);
  const { data: services = [], isLoading, refetch } = useListServices({ tenantId: tenantId! });
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  // ── Tenant config ─────────────────────────────────────────────────────────
  const tenantPortes: string[] = (tenant as any)?.petSizes ?? DEFAULT_PORTE_ORDER;
  const tenantCoats: string[] = (tenant as any)?.coatTypes ?? Object.keys(DEFAULT_COAT_LABELS);

  // combinações porte × pelagem
  const allCombos: [string, string, string][] = tenantPortes.flatMap(p =>
    tenantCoats.map(c => [p, c, `${getPorteLabel(p)} · ${getCoatLabel(c)}`] as [string, string, string])
  );

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
    setEditForm({ name: s.name, size: s.size, coat: s.coat ?? "curto", price: String(s.price), durationMinutes: s.durationMinutes ?? 60 });
    setEditOpen(true);
  };

  const setBulkPrice = (key: string, value: string) => {
    setBulkForm(f => ({ ...f, prices: { ...f.prices, [key]: value } }));
  };

  const handleCreate = async () => {
    if (!bulkForm.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    const duration = Number(bulkForm.durationMinutes);
    if (!duration || !isFinite(duration) || duration <= 0) {
      toast({ title: "Duração deve ser maior que zero", variant: "destructive" });
      return;
    }
    const toCreate = allCombos.filter(([size, coat]) => {
      const val = parseFloat(bulkForm.prices[sizeCoatKey(size, coat)] ?? "");
      return !isNaN(val) && val > 0;
    });
    if (toCreate.length === 0) {
      toast({ title: "Informe o preço de pelo menos uma combinação", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const results = await Promise.allSettled(
      toCreate.map(([size, coat]) =>
        createService.mutateAsync({
          data: {
            tenantId: tenantId!,
            name: bulkForm.name.trim(),
            size,
            coat,
            price: parseFloat(bulkForm.prices[sizeCoatKey(size, coat)]!),
            durationMinutes: duration,
          },
        })
      )
    );
    setIsSaving(false);
    const succeeded = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    if (failed === 0) {
      toast({ title: `Serviço criado para ${succeeded} combinação${succeeded !== 1 ? "ões" : ""}!` });
      setCreateOpen(false);
    } else if (succeeded === 0) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } else {
      toast({
        title: `${succeeded} criado${succeeded !== 1 ? "s" : ""}`,
        description: `${failed} não foi salvo. Tente novamente.`,
        variant: "destructive",
      });
      setCreateOpen(false);
    }
    refetch();
  };

  const handleEdit = async () => {
    if (!editing) return;
    const duration = Number(editForm.durationMinutes);
    if (!duration || !isFinite(duration) || duration <= 0) {
      toast({ title: "Duração deve ser maior que zero", variant: "destructive" });
      return;
    }
    try {
      await updateService.mutateAsync({
        id: editing.id,
        data: {
          name: editForm.name,
          size: editForm.size,
          coat: editForm.coat,
          price: Number(editForm.price),
          durationMinutes: duration,
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
            {tenantPortes.map((p: string) => (
              <SelectItem key={p} value={p}>{getPorteLabel(p)}</SelectItem>
            ))}
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
                  {items
                    .sort((a, b) => {
                      const ai = tenantPortes.indexOf(a.size);
                      const bi = tenantPortes.indexOf(b.size);
                      if (ai !== bi) return ai - bi;
                      return tenantCoats.indexOf(a.coat) - tenantCoats.indexOf(b.coat);
                    })
                    .map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/30 transition-colors">
                        <div>
                          <div className="flex gap-1 mb-1">
                            <Badge variant="secondary">{getPorteLabel(s.size)}</Badge>
                            {s.coat && <Badge variant="outline">{getCoatLabel(s.coat)}</Badge>}
                          </div>
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

      {/* ── Modal de Criação em Massa ── */}
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
              <Label>Preço por porte · pelagem *</Label>
              <p className="text-xs text-muted-foreground">
                Deixe em branco as combinações que não se aplicam a este serviço.
              </p>
              <div className="rounded-lg border divide-y">
                {allCombos.map(([size, coat, label]) => (
                  <div key={`${size}|${coat}`} className="flex items-center justify-between px-3 py-2 gap-3">
                    <span className="text-sm w-40 shrink-0">{label}</span>
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={bulkForm.prices[sizeCoatKey(size, coat)] ?? ""}
                        onChange={e => setBulkPrice(sizeCoatKey(size, coat), e.target.value)}
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

      {/* ── Modal de Edição Individual ── */}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Porte *</Label>
                <Select value={editForm.size} onValueChange={v => setEditForm(f => ({ ...f, size: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tenantPortes.map((p: string) => (
                      <SelectItem key={p} value={p}>{getPorteLabel(p)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pelagem *</Label>
                <Select value={editForm.coat} onValueChange={v => setEditForm(f => ({ ...f, coat: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tenantCoats.map((c: string) => (
                      <SelectItem key={c} value={c}>{getCoatLabel(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
