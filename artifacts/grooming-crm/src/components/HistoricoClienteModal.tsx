import { useState } from "react";
import { useGetClientHistory, useCreatePayment, useDeletePayment } from "@workspace/api-client-react";
import type { ClientHistory } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetClientHistoryQueryKey } from "@workspace/api-client-react";
import { ChevronDown, ChevronUp, Trash2, Plus, PackageIcon, CalendarIcon, CheckCircle2, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  try {
    return format(new Date(d as string), "dd/MM/yyyy", { locale: ptBR });
  } catch { return "—"; }
}

function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  try {
    return format(new Date(d as string), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch { return "—"; }
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  aguardando: { label: "Aguardando", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
  em_atendimento: { label: "Em Atendimento", color: "bg-blue-100 text-blue-800", icon: <Clock className="h-3 w-3" /> },
  pet_pronto: { label: "Pet Pronto", color: "bg-orange-100 text-orange-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  concluido: { label: "Concluído", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
};

const PAGAMENTO_INFO: Record<string, { label: string; color: string }> = {
  quitado: { label: "Quitado", color: "bg-green-100 text-green-800" },
  parcial: { label: "Parcial", color: "bg-yellow-100 text-yellow-800" },
  pendente: { label: "Pendente", color: "bg-red-100 text-red-800" },
};

const METODOS_PAGAMENTO = [
  "Dinheiro", "PIX", "Cartão de Débito", "Cartão de Crédito", "Transferência",
];

function PaymentForm({
  clientId,
  appointmentId,
  packageSaleId,
  maxAmount,
  onSuccess,
}: {
  clientId: number;
  appointmentId?: number;
  packageSaleId?: number;
  maxAmount?: number;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const createPayment = useCreatePayment();
  const [amount, setAmount] = useState(maxAmount != null && maxAmount > 0 ? String(maxAmount) : "");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().substring(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Plus className="h-3 w-3" /> Registrar pagamento
      </button>
    );
  }

  const handleSave = async () => {
    const v = parseFloat(amount.replace(",", "."));
    if (isNaN(v) || v <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    try {
      await createPayment.mutateAsync({
        data: {
          clientId,
          appointmentId,
          packageSaleId,
          amount: v,
          paymentDate: new Date(paymentDate) as any,
          paymentMethod: paymentMethod || undefined,
          notes: notes || undefined,
        },
      });
      toast({ title: "Pagamento registrado!" });
      setOpen(false);
      onSuccess();
    } catch {
      toast({ title: "Erro ao registrar pagamento", variant: "destructive" });
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/30 mt-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Novo Pagamento</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Valor *</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="h-7 text-xs"
            placeholder="0,00"
          />
        </div>
        <div>
          <Label className="text-xs">Data *</Label>
          <Input
            type="date"
            value={paymentDate}
            onChange={e => setPaymentDate(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Método</Label>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            className="h-7 text-xs w-full rounded border border-input bg-background px-2"
          >
            <option value="">Selecione</option>
            {METODOS_PAGAMENTO.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Obs.</Label>
          <Input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="h-7 text-xs"
            placeholder="Opcional"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button size="sm" className="h-6 text-xs" onClick={handleSave} disabled={createPayment.isPending}>
          {createPayment.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

type Avulso = NonNullable<ClientHistory["avulsos"]>[number];
type Pacote = NonNullable<ClientHistory["pacotes"]>[number];
type Payment = NonNullable<Avulso["pagamentos"]>[number];

function AvulsoItem({ item, clientId, onRefresh }: { item: Avulso; clientId: number; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const deletePayment = useDeletePayment();
  const pagInfo = PAGAMENTO_INFO[item.statusPagamento] ?? PAGAMENTO_INFO.pendente;
  const statusInfo = STATUS_INFO[item.status ?? "aguardando"] ?? STATUS_INFO.aguardando;

  const handleDeletePayment = async (id: number) => {
    if (!confirm("Excluir este pagamento?")) return;
    try {
      await deletePayment.mutateAsync({ id });
      toast({ title: "Pagamento excluído" });
      onRefresh();
    } catch {
      toast({ title: "Erro ao excluir pagamento", variant: "destructive" });
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 text-left gap-2"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{formatDateTime(item.scheduledDate)}</span>
              {item.service && <span className="text-xs text-muted-foreground">— {item.service.name}</span>}
              {item.pet && <span className="text-xs text-muted-foreground">({item.pet.name})</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge className={`text-[10px] px-1 py-0 gap-1 ${statusInfo.color}`}>
                {statusInfo.icon}{statusInfo.label}
              </Badge>
              <Badge className={`text-[10px] px-1.5 py-0 ${pagInfo.color}`}>{pagInfo.label}</Badge>
              {item.confirmedAt && (
                <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Confirmado
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-sm font-semibold">{formatBRL(item.totalPrice)}</p>
            <p className="text-[10px] text-muted-foreground">
              Pago: {formatBRL(item.totalPago)} · Saldo: {formatBRL(item.saldo)}
            </p>
          </div>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t px-3 py-2 bg-muted/20 space-y-2">
          {(item.pagamentos ?? []).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Pagamentos</p>
              <div className="space-y-1">
                {(item.pagamentos as Payment[]).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs bg-card border rounded px-2 py-1">
                    <span className="text-muted-foreground">{formatDate(p.paymentDate)}</span>
                    <span>{p.paymentMethod ?? "—"}</span>
                    <span className="font-semibold text-green-700">{formatBRL(p.amount as unknown as number)}</span>
                    {p.notes && <span className="text-muted-foreground truncate max-w-[100px]">{p.notes}</span>}
                    <button
                      onClick={() => handleDeletePayment(p.id)}
                      className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {item.saldo > 0 && (
            <PaymentForm
              clientId={clientId}
              appointmentId={item.id}
              maxAmount={item.saldo}
              onSuccess={onRefresh}
            />
          )}
          {item.saldo <= 0 && (item.pagamentos ?? []).length === 0 && (
            <PaymentForm clientId={clientId} appointmentId={item.id} onSuccess={onRefresh} />
          )}
        </div>
      )}
    </div>
  );
}

function PacoteItem({ item, clientId, onRefresh }: { item: Pacote; clientId: number; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const deletePayment = useDeletePayment();
  const pagInfo = PAGAMENTO_INFO[item.statusPagamento] ?? PAGAMENTO_INFO.pendente;

  const handleDeletePayment = async (id: number) => {
    if (!confirm("Excluir este pagamento?")) return;
    try {
      await deletePayment.mutateAsync({ id });
      toast({ title: "Pagamento excluído" });
      onRefresh();
    } catch {
      toast({ title: "Erro ao excluir pagamento", variant: "destructive" });
    }
  };

  const totalAppts = item.agendamentos?.length ?? 0;
  const doneAppts = item.agendamentos?.filter(a => a.status === "concluido").length ?? 0;
  const confirmedAppts = item.agendamentos?.filter(a => a.confirmedAt).length ?? 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 text-left gap-2"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <PackageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{item.packageName ?? "Pacote"}</span>
              {item.petName && <span className="text-xs text-muted-foreground">— {item.petName}</span>}
              {item.weeks && <span className="text-xs text-muted-foreground">({item.weeks} sessões)</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground">{formatDate(item.saleDate)}</span>
              <Badge className={`text-[10px] px-1.5 py-0 ${pagInfo.color}`}>{pagInfo.label}</Badge>
              {totalAppts > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {doneAppts}/{totalAppts} concluídos · {confirmedAppts} confirmados
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-sm font-semibold">{item.totalPrice != null ? formatBRL(item.totalPrice as unknown as number) : "—"}</p>
            <p className="text-[10px] text-muted-foreground">
              Pago: {formatBRL(item.totalPago)} · Saldo: {item.saldo != null ? formatBRL(item.saldo as unknown as number) : "—"}
            </p>
          </div>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t px-3 py-2 bg-muted/20 space-y-3">
          {/* Agendamentos do pacote */}
          {(item.agendamentos ?? []).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Agendamentos</p>
              <div className="space-y-1">
                {item.agendamentos!.map((a, i) => {
                  const si = STATUS_INFO[a.status ?? "aguardando"] ?? STATUS_INFO.aguardando;
                  return (
                    <div key={a.id} className="flex items-center gap-2 text-xs px-2 py-1 bg-card border rounded">
                      <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                      <span className="text-muted-foreground">{formatDateTime(a.scheduledDate)}</span>
                      <Badge className={`text-[10px] px-1 py-0 gap-1 ${si.color}`}>{si.icon}{si.label}</Badge>
                      {a.confirmedAt && (
                        <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Confirmado
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Pagamentos do pacote */}
          {(item.pagamentos ?? []).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Pagamentos</p>
              <div className="space-y-1">
                {(item.pagamentos as Payment[]).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs bg-card border rounded px-2 py-1">
                    <span className="text-muted-foreground">{formatDate(p.paymentDate)}</span>
                    <span>{p.paymentMethod ?? "—"}</span>
                    <span className="font-semibold text-green-700">{formatBRL(p.amount as unknown as number)}</span>
                    {p.notes && <span className="text-muted-foreground truncate max-w-[100px]">{p.notes}</span>}
                    <button
                      onClick={() => handleDeletePayment(p.id)}
                      className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(item.saldo == null || (item.saldo as unknown as number) > 0) && (
            <PaymentForm
              clientId={clientId}
              packageSaleId={item.id}
              maxAmount={item.saldo != null && (item.saldo as unknown as number) > 0 ? (item.saldo as unknown as number) : undefined}
              onSuccess={onRefresh}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function HistoricoClienteModal({
  clientId,
  clientName,
  open,
  onOpenChange,
}: {
  clientId: number | null;
  clientName?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetClientHistory(clientId ?? 0, {
    query: {
      queryKey: getGetClientHistoryQueryKey(clientId ?? 0),
      enabled: open && clientId != null,
    },
  });

  const handleRefresh = () => {
    if (clientId) {
      queryClient.invalidateQueries({ queryKey: getGetClientHistoryQueryKey(clientId) });
    }
  };

  const history = data as ClientHistory | undefined;

  const totalAvulsos = history?.avulsos?.length ?? 0;
  const totalPacotes = history?.pacotes?.length ?? 0;

  const totalPago =
    (history?.avulsos?.reduce((s, a) => s + (a.totalPago ?? 0), 0) ?? 0) +
    (history?.pacotes?.reduce((s, p) => s + (p.totalPago ?? 0), 0) ?? 0);

  const totalValor =
    (history?.avulsos?.reduce((s, a) => s + (a.totalPrice ?? 0), 0) ?? 0) +
    (history?.pacotes?.reduce((s, p) => s + ((p.totalPrice as unknown as number) ?? 0), 0) ?? 0);

  const totalSaldo = totalValor - totalPago;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Histórico — {clientName ?? "Cliente"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !history ? (
          <p className="text-muted-foreground text-sm">Nenhum dado encontrado.</p>
        ) : (
          <div className="space-y-5">
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-primary">{formatBRL(totalValor)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total em serviços</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{formatBRL(totalPago)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total pago</p>
              </div>
              <div className={`rounded-lg border p-3 text-center ${totalSaldo > 0 ? "border-red-200 bg-red-50" : ""}`}>
                <p className={`text-2xl font-bold ${totalSaldo > 0 ? "text-red-600" : "text-muted-foreground"}`}>{formatBRL(totalSaldo)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Saldo a receber</p>
              </div>
            </div>

            {/* Avulsos */}
            {totalAvulsos > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4" /> Agendamentos Avulsos ({totalAvulsos})
                </p>
                <div className="space-y-2">
                  {(history.avulsos ?? []).map(item => (
                    <AvulsoItem
                      key={item.id}
                      item={item}
                      clientId={clientId!}
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pacotes */}
            {totalPacotes > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <PackageIcon className="h-4 w-4" /> Pacotes ({totalPacotes})
                </p>
                <div className="space-y-2">
                  {(history.pacotes ?? []).map(item => (
                    <PacoteItem
                      key={item.id}
                      item={item}
                      clientId={clientId!}
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              </div>
            )}

            {totalAvulsos === 0 && totalPacotes === 0 && (
              <p className="text-muted-foreground text-sm text-center py-6">
                Nenhum agendamento ou pacote encontrado para este cliente.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
