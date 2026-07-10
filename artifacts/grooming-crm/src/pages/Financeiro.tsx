import { useState } from "react";
import {
  useListFinancialEntries, useGetFinancialSummary, useCreateFinancialEntry,
  useUpdateFinancialEntry, useDeleteFinancialEntry, usePayFinancialEntry,
  useGetTenant,
} from "@workspace/api-client-react";
import type { FinancialEntryInputType, FinancialEntryUpdateType } from "@workspace/api-client-react";
import { FINANCIAL_TYPES } from "@/lib/constants";
import { useAppAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, TrendingUp, TrendingDown, Minus, ShoppingBag,
  CheckCircle2, Clock, Receipt, MessageSquare,
} from "lucide-react";

type FinancialEntry = {
  id: number;
  type: string;
  description: string;
  amount: number;
  date: string;
  category?: string | null;
  appointmentId?: number | null;
  paidAt?: string | null;
};

const emptyForm = { type: "receita", description: "", amount: "", date: new Date().toISOString().substring(0, 10), category: "" };

const typeColors: Record<string, string> = {
  receita: "bg-green-100 text-green-800",
  despesa: "bg-red-100 text-red-800",
  despesa_fixa: "bg-orange-100 text-orange-800",
};

function buildCupomText(entry: FinancialEntry, tenantName: string, tomador: string, tenantCnpj?: string | null) {
  const date = new Date(entry.date + "T12:00:00").toLocaleDateString("pt-BR");
  const amount = Number(entry.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const lines = [
    `🐾 *COMPROVANTE DE SERVIÇO*`,
    ``,
    `*Prestador:* ${tenantName}`,
    tenantCnpj ? `*CNPJ:* ${tenantCnpj}` : null,
    ``,
    tomador ? `*Tomador:* ${tomador}` : null,
    ``,
    `*Data:* ${date}`,
    `*Discriminação:* ${entry.description}`,
    entry.category ? `*Categoria:* ${entry.category}` : null,
    ``,
    `*Valor:* ${amount}`,
    entry.paidAt ? `*Pagamento:* Confirmado em ${new Date(entry.paidAt).toLocaleDateString("pt-BR")}` : `*Pagamento:* Pendente`,
    ``,
    `_Documento gerado pelo Pata Limpa CRM_`,
  ].filter(l => l !== null).join("\n");
  return lines;
}

export default function Financeiro() {
  const { tenantId } = useAppAuth();
  const { toast } = useToast();
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().substring(0, 10);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().substring(0, 10);
  const todayStr = today.toISOString().substring(0, 10);

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(monthEnd);
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: tenantData } = useGetTenant(tenantId!);
  const tenant = tenantData as any;

  const { data: todayEntries = [] } = useListFinancialEntries({ tenantId: tenantId!, startDate: todayStr, endDate: todayStr });
  const todayReceitas = (todayEntries as FinancialEntry[]).filter(e => e.type === "receita");
  const todayTotal = todayReceitas.reduce((sum, e) => sum + Number(e.amount), 0);

  const queryParams = {
    tenantId: tenantId!,
    startDate,
    endDate,
    ...(typeFilter !== "all" ? { type: typeFilter as any } : {}),
  };

  const { data: entries = [], isLoading, refetch } = useListFinancialEntries(queryParams);
  const { data: summary } = useGetFinancialSummary({ tenantId: tenantId!, startDate, endDate });
  const createEntry = useCreateFinancialEntry();
  const updateEntry = useUpdateFinancialEntry();
  const deleteEntry = useDeleteFinancialEntry();
  const payEntry = usePayFinancialEntry();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialEntry | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [cupomEntry, setCupomEntry] = useState<FinancialEntry | null>(null);
  const [cupomTomador, setCupomTomador] = useState("");

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
          tenantId: tenantId!,
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

  const handleTogglePay = async (entry: FinancialEntry) => {
    try {
      await payEntry.mutateAsync({ id: entry.id });
      refetch();
      toast({ title: entry.paidAt ? "Pagamento revertido" : "Pagamento confirmado!" });
    } catch {
      toast({ title: "Erro ao confirmar pagamento", variant: "destructive" });
    }
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const saldo = (summary?.totalReceitas ?? 0) - (summary?.totalDespesas ?? 0) - (summary?.totalDespesasFixas ?? 0);

  const cupomText = cupomEntry ? buildCupomText(cupomEntry, tenant?.name ?? "Pet Shop", cupomTomador, tenant?.cnpj) : "";
  const waLink = cupomEntry && tenant?.phone
    ? `https://wa.me/55${(tenant.phone as string).replace(/\D/g, "")}?text=${encodeURIComponent(cupomText)}`
    : `https://wa.me/?text=${encodeURIComponent(cupomText)}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Controle de receitas e despesas</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo Lançamento</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Vendas Hoje</CardTitle>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{fmt(todayTotal)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{todayReceitas.length} lançamento{todayReceitas.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex gap-3 items-end">
          <div>
            <Label>De</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" />
          </div>
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
                <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge className={typeColors[entry.type] ?? ""} variant="outline">
                      {FINANCIAL_TYPES[entry.type as keyof typeof FINANCIAL_TYPES] ?? entry.type}
                    </Badge>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{entry.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-muted-foreground">{new Date(entry.date + "T12:00:00").toLocaleDateString("pt-BR")}{entry.category ? ` • ${entry.category}` : ""}</p>
                        {entry.type === "receita" && (
                          entry.paidAt ? (
                            <span className="text-[10px] flex items-center gap-0.5 text-green-700 font-medium">
                              <CheckCircle2 className="h-3 w-3" />
                              Pago {new Date(entry.paidAt).toLocaleDateString("pt-BR")}
                            </span>
                          ) : (
                            <span className="text-[10px] flex items-center gap-0.5 text-amber-600">
                              <Clock className="h-3 w-3" />
                              Pendente
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`font-semibold text-sm ${entry.type === "receita" ? "text-green-600" : "text-red-600"}`}>
                      {entry.type === "receita" ? "+" : "-"}{fmt(Number(entry.amount))}
                    </span>
                    {entry.type === "receita" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={entry.paidAt ? "Reverter pagamento" : "Confirmar pagamento"}
                          className={entry.paidAt ? "text-green-600 hover:text-amber-600" : "text-muted-foreground hover:text-green-600"}
                          onClick={() => handleTogglePay(entry)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Gerar cupom / comprovante"
                          onClick={() => { setCupomTomador(""); setCupomEntry(entry); }}
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Modal */}
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

      {/* Cupom / Comprovante Modal */}
      <Dialog open={!!cupomEntry} onOpenChange={o => { if (!o) setCupomEntry(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Comprovante de Serviço
            </DialogTitle>
          </DialogHeader>
          {cupomEntry && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Tomador (cliente / pet)</Label>
                <Input
                  value={cupomTomador}
                  onChange={e => setCupomTomador(e.target.value)}
                  placeholder="Ex: Maria Silva — Luna (Poodle)"
                  className="text-sm"
                />
              </div>
              <div className="bg-muted/40 border rounded-lg p-4 text-sm space-y-1 font-mono whitespace-pre-wrap text-xs leading-relaxed">
                {cupomText}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Este comprovante segue os campos mínimos de NFS-e (discriminação, prestador, tomador, valor) para facilitar futura integração com nota fiscal eletrônica.
              </p>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCupomEntry(null)}>Fechar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 gap-2"
              onClick={() => window.open(waLink, "_blank")}
            >
              <MessageSquare className="h-4 w-4" />
              Enviar via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
