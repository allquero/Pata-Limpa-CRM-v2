import { useState } from "react";
import { useListFinancialEntries, useGetFinancialSummary, useCreateFinancialEntry, useUpdateFinancialEntry, useDeleteFinancialEntry } from "@workspace/api-client-react";
import type { FinancialEntryInputType, FinancialEntryUpdateType } from "@workspace/api-client-react";
import { DEFAULT_TENANT_ID, FINANCIAL_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";

type FinancialEntry = { id: number; type: string; description: string; amount: number; date: string; category?: string | null };
const emptyForm = { type: "receita", description: "", amount: "", date: new Date().toISOString().substring(0, 10), category: "" };

const typeColors: Record<string, string> = {
  receita: "bg-green-100 text-green-800",
  despesa: "bg-red-100 text-red-800",
  despesa_fixa: "bg-orange-100 text-orange-800",
};

export default function Financeiro() {
  const { toast } = useToast();
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().substring(0, 10);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().substring(0, 10);

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(monthEnd);
  const [typeFilter, setTypeFilter] = useState("all");

  const queryParams = {
    tenantId: DEFAULT_TENANT_ID,
    startDate,
    endDate,
    ...(typeFilter !== "all" ? { type: typeFilter as any } : {}),
  };

  const { data: entries = [], isLoading, refetch } = useListFinancialEntries(queryParams);
  const { data: summary } = useGetFinancialSummary({ tenantId: DEFAULT_TENANT_ID, startDate, endDate });
  const createEntry = useCreateFinancialEntry();
  const updateEntry = useUpdateFinancialEntry();
  const deleteEntry = useDeleteFinancialEntry();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialEntry | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (e: FinancialEntry) => {
    setEditing(e);
    setForm({ type: e.type, description: e.description, amount: String(e.amount), date: e.date.substring(0, 10), category: e.category ?? "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        const updatePayload = {
          type: form.type as FinancialEntryUpdateType,
          description: form.description,
          amount: Number(form.amount),
          date: form.date,
          category: form.category || undefined,
        };
        await updateEntry.mutateAsync({ id: editing.id, data: updatePayload });
        toast({ title: "Lançamento atualizado!" });
      } else {
        const createPayload = {
          tenantId: DEFAULT_TENANT_ID,
          type: form.type as FinancialEntryInputType,
          description: form.description,
          amount: Number(form.amount),
          date: form.date,
          category: form.category || undefined,
        };
        await createEntry.mutateAsync({ data: createPayload });
        toast({ title: "Lançamento criado!" });
      }
      setModalOpen(false);
      refetch();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este lançamento?")) return;
    await deleteEntry.mutateAsync({ id });
    refetch();
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const saldo = (summary?.totalReceitas ?? 0) - (summary?.totalDespesas ?? 0) - (summary?.totalDespesasFixas ?? 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Controle de receitas e despesas</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo Lançamento</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{fmt(summary?.totalReceitas ?? 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{fmt(summary?.totalDespesas ?? 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Fixas</CardTitle>
            <Minus className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-600">{fmt(summary?.totalDespesasFixas ?? 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo</CardTitle></CardHeader>
          <CardContent><div className={`text-2xl font-bold ${saldo >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(saldo)}</div></CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label>De</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label>Até</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(FINANCIAL_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (entries as FinancialEntry[]).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum lançamento no período.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {(entries as FinancialEntry[]).sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge className={typeColors[entry.type] ?? ""} variant="outline">
                      {FINANCIAL_TYPES[entry.type as keyof typeof FINANCIAL_TYPES] ?? entry.type}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString("pt-BR")}{entry.category ? ` • ${entry.category}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold ${entry.type === "receita" ? "text-green-600" : "text-red-600"}`}>
                      {entry.type === "receita" ? "+" : "-"}{fmt(Number(entry.amount))}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(FINANCIAL_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descrição *</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><Label>Data *</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><Label>Categoria</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: serviço, aluguel, produtos..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.description || !form.amount}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
