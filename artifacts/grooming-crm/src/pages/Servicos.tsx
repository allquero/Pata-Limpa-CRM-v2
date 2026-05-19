import { useState } from "react";
import { useListServices, useCreateService, useUpdateService, useDeleteService } from "@workspace/api-client-react";
import type { ServiceInputSize } from "@workspace/api-client-react";
import { DEFAULT_TENANT_ID, PORTE_SIZES } from "@/lib/constants";
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
const emptyForm = { name: "", size: "mini_longo", price: "", durationMinutes: 60 };

export default function Servicos() {
  const { toast } = useToast();
  const { data: services = [], isLoading, refetch } = useListServices({ tenantId: DEFAULT_TENANT_ID });
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterSize, setFilterSize] = useState("all");

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, size: s.size, price: String(s.price), durationMinutes: s.durationMinutes ?? 60 });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        tenantId: DEFAULT_TENANT_ID,
        name: form.name,
        size: form.size as ServiceInputSize,
        price: Number(form.price),
        durationMinutes: Number(form.durationMinutes),
      };
      if (editing) {
        await updateService.mutateAsync({ id: editing.id, data: payload });
        toast({ title: "Serviço atualizado!" });
      } else {
        await createService.mutateAsync({ data: payload });
        toast({ title: "Serviço criado!" });
      }
      setModalOpen(false);
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Serviço" : "Novo Serviço"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome do Serviço *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Banho, Tosa..." /></div>
            <div>
              <Label>Porte / Pelagem *</Label>
              <Select value={form.size} onValueChange={v => setForm(f => ({ ...f, size: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PORTE_SIZES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Preço (R$) *</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
            <div><Label>Duração (minutos)</Label><Input type="number" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.price}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
