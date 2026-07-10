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
import {
  ChevronDown, ChevronUp, Trash2, Plus, PackageIcon,
  CalendarIcon, CheckCircle2, Clock, XCircle, PawPrint,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d as string), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return "—"; }
}

function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d as string), "dd/MM/yyyy HH:mm", { locale: ptBR }); }
  catch { return "—"; }
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  aguardando:    { label: "Aguardando",    color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
  em_atendimento:{ label: "Em Atendimento",color: "bg-blue-100 text-blue-800",    icon: <Clock className="h-3 w-3" /> },
  pet_pronto:    { label: "Pet Pronto",    color: "bg-orange-100 text-orange-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  concluido:     { label: "Concluído",     color: "bg-green-100 text-green-800",   icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelado:     { label: "Cancelado",     color: "bg-red-100 text-red-800",       icon: <XCircle className="h-3 w-3" /> },
};

const PAGAMENTO_INFO: Record<string, { label: string; color: string }> = {
  quitado: { label: "Quitado", color: "bg-green-100 text-green-800" },
  parcial:  { label: "Parcial",  color: "bg-yellow-100 text-yellow-800" },
  pendente: { label: "Pendente", color: "bg-red-100 text-red-800" },
};

const METODOS_PAGAMENTO = [
  "Dinheiro", "PIX", "Cartão de Débito", "Cartão de Crédito", "Transferência",
];

// ─── Tipos derivados ──────────────────────────────────────────────────────────
type Avulso  = NonNullable<ClientHistory["avulsos"]>[number];
type Pacote  = NonNullable<ClientHistory["pacotes"]>[number];
type Payment = NonNullable<Avulso["pagamentos"]>[number];

type PkgAgendamento = NonNullable<Pacote["agendamentos"]>[number] & {
  petId?: number | null;
  petName?: string | null;
  service?: { id: number; name: string } | null;
};

// ─── Visão por cachorro ───────────────────────────────────────────────────────
type PetSession = {
  apptId: number;
  scheduledDate: string;
  service: string | null;
  extraServices: string[];
  status: string;
  confirmed: boolean;
  origin: "avulso" | "pacote";
  packageName?: string | null;
  notes?: string | null;
};

function buildPetView(history: ClientHistory): Map<number, { petName: string; sessions: PetSession[] }> {
  const map = new Map<number, { petName: string; sessions: PetSession[] }>();

  for (const a of history.avulsos ?? []) {
    const pet = a.pet as { id?: number; name?: string } | null | undefined;
    if (!pet?.id) continue;
    if (!map.has(pet.id)) map.set(pet.id, { petName: pet.name ?? "?", sessions: [] });
    map.get(pet.id)!.sessions.push({
      apptId: a.id,
      scheduledDate: a.scheduledDate as string,
      service: (a.service as { name?: string } | null)?.name ?? null,
      extraServices: ((a as any).extraServices as string[]) ?? [],
      status: a.status ?? "aguardando",
      confirmed: !!a.confirmedAt,
      origin: "avulso",
      notes: (a as any).notes ?? null,
    });
  }

  for (const p of history.pacotes ?? []) {
    for (const ag of (p.agendamentos ?? []) as PkgAgendamento[]) {
      const petId = ag.petId;
      const petName = ag.petName ?? p.petName ?? "?";
      if (!petId || ag.id == null) continue;
      if (!map.has(petId)) map.set(petId, { petName, sessions: [] });
      map.get(petId)!.sessions.push({
        apptId: ag.id as number,
        scheduledDate: ag.scheduledDate as string,
        service: ag.service?.name ?? null,
        extraServices: ((ag as any).extraServices as string[]) ?? [],
        status: ag.status ?? "aguardando",
        confirmed: !!ag.confirmedAt,
        origin: "pacote",
        packageName: p.packageName,
        notes: (ag as any).notes ?? null,
      });
    }
  }

  // Ordena por data dentro de cada pet
  for (const { sessions } of map.values()) {
    sessions.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }

  return map;
}

function PetHistorySection({ petName, sessions }: { petName: string; sessions: PetSession[] }) {
  const [expanded, setExpanded] = useState(false);
  const total     = sessions.length;
  const attended  = sessions.filter(s => s.confirmed).length;
  const completed = sessions.filter(s => s.status === "concluido").length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 text-left gap-2"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <PawPrint className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">{petName}</p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[11px] text-muted-foreground">
              <span>{total} sessão(ões) total</span>
              <span className="text-green-600 font-medium">{attended} presença(s) confirmada(s)</span>
              <span>{completed} concluída(s)</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Barra de progresso de presenças */}
          <div className="flex gap-0.5" title={`${attended}/${total} presenças`}>
            {sessions.map(s => (
              <div
                key={s.apptId}
                className={`h-3 w-3 rounded-sm ${
                  s.confirmed ? "bg-green-500" : s.status === "cancelado" ? "bg-gray-200" : "bg-red-300"
                }`}
                title={`${formatDate(s.scheduledDate)} — ${s.confirmed ? "Presente" : "Não confirmado"}`}
              />
            ))}
          </div>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t divide-y bg-muted/10">
          {sessions.map((s, i) => {
            const si = STATUS_INFO[s.status] ?? STATUS_INFO.aguardando;
            return (
              <div key={s.apptId} className="flex flex-col px-3 py-2 text-xs gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-5 shrink-0 text-right">{i + 1}.</span>
                  <span className="text-muted-foreground w-24 shrink-0">{formatDate(s.scheduledDate)}</span>
                  {(() => {
                    const parts = [s.service, ...(s.extraServices ?? [])].filter(Boolean);
                    const label = parts.length > 0
                      ? parts.join(" + ")
                      : s.origin === "pacote" && s.packageName ? s.packageName : null;
                    return label ? (
                      <span className="text-muted-foreground flex-1 truncate">{label}</span>
                    ) : null;
                  })()}
                  <Badge className={`text-[10px] px-1 py-0 gap-0.5 shrink-0 ${si.color}`}>
                    {si.icon}{si.label}
                  </Badge>
                  {s.confirmed ? (
                    <span className="text-green-600 flex items-center gap-0.5 shrink-0 text-[11px]">
                      <CheckCircle2 className="h-3 w-3" /> Presente
                    </span>
                  ) : s.status !== "cancelado" ? (
                    <span className="text-red-400 flex items-center gap-0.5 shrink-0 text-[11px]">
                      <XCircle className="h-3 w-3" /> Não confirmado
                    </span>
                  ) : null}
                </div>
                {s.notes && (
                  <p className="text-[11px] text-muted-foreground italic pl-7 leading-snug">{s.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Formulário de pagamento ──────────────────────────────────────────────────
function PaymentForm({
  clientId, appointmentId, packageSaleId, maxAmount, onSuccess,
}: {
  clientId: number;
  appointmentId?: number;
  packageSaleId?: number;
  maxAmount?: number;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const createPayment = useCreatePayment();
  const [amount, setAmount]             = useState(maxAmount != null && maxAmount > 0 ? String(maxAmount) : "");
  const [paymentDate, setPaymentDate]   = useState(new Date().toISOString().substring(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes]               = useState("");
  const [open, setOpen]                 = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
        <Plus className="h-3 w-3" /> Registrar pagamento
      </button>
    );
  }

  const handleSave = async () => {
    const v = parseFloat(amount.replace(",", "."));
    if (isNaN(v) || v <= 0) { toast({ title: "Valor inválido", variant: "destructive" }); return; }
    try {
      await createPayment.mutateAsync({
        data: {
          clientId,
          appointmentId,
          packageSaleId,
          amount: v,
          paymentDate: new Date(paymentDate) as unknown as string,
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
          <Input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="h-7 text-xs" placeholder="0,00" />
        </div>
        <div>
          <Label className="text-xs">Data *</Label>
          <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="h-7 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Método</Label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="h-7 text-xs w-full rounded border border-input bg-background px-2">
            <option value="">Selecione</option>
            {METODOS_PAGAMENTO.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Obs.</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} className="h-7 text-xs" placeholder="Opcional" />
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

// ─── Avulso item ──────────────────────────────────────────────────────────────
function AvulsoItem({ item, clientId, onRefresh }: { item: Avulso; clientId: number; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const deletePayment = useDeletePayment();
  const pagInfo    = PAGAMENTO_INFO[item.statusPagamento] ?? PAGAMENTO_INFO.pendente;
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
      <button className="w-full flex items-center justify-between p-3 hover:bg-muted/30 text-left gap-2" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{formatDateTime(item.scheduledDate)}</span>
              {(item.service as { name?: string } | null)?.name && (
                <span className="text-xs text-muted-foreground">— {(item.service as { name: string }).name}</span>
              )}
              {(item.pet as { name?: string } | null)?.name && (
                <span className="text-xs text-muted-foreground">({(item.pet as { name: string }).name})</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge className={`text-[10px] px-1 py-0 gap-1 ${statusInfo.color}`}>{statusInfo.icon}{statusInfo.label}</Badge>
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
            <p className="text-sm font-semibold">{formatBRL(item.totalPrice as number)}</p>
            <p className="text-[10px] text-muted-foreground">
              Pago: {formatBRL(item.totalPago as number)} · Saldo: {formatBRL(item.saldo as number)}
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
                {(item.pagamentos as Payment[]).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs bg-card border rounded px-2 py-1">
                    <span className="text-muted-foreground">{formatDate(p.paymentDate)}</span>
                    <span>{p.paymentMethod ?? "—"}</span>
                    <span className="font-semibold text-green-700">{formatBRL(p.amount as unknown as number)}</span>
                    {p.notes && <span className="text-muted-foreground truncate max-w-[100px]">{p.notes}</span>}
                    <button onClick={() => handleDeletePayment(p.id)} className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(item.saldo as number) > 0 && (
            <PaymentForm clientId={clientId} appointmentId={item.id} maxAmount={item.saldo as number} onSuccess={onRefresh} />
          )}
          {(item.saldo as number) <= 0 && (item.pagamentos ?? []).length === 0 && (
            <PaymentForm clientId={clientId} appointmentId={item.id} onSuccess={onRefresh} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Pacote item ──────────────────────────────────────────────────────────────
function PacoteItem({ item, clientId, onRefresh }: { item: Pacote; clientId: number; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const deletePayment = useDeletePayment();
  const pagInfo = PAGAMENTO_INFO[item.statusPagamento] ?? PAGAMENTO_INFO.pendente;
  const agendamentos = (item.agendamentos ?? []) as PkgAgendamento[];

  const totalAppts    = agendamentos.length;
  const doneAppts     = agendamentos.filter(a => a.status === "concluido").length;
  const confirmedAppts = agendamentos.filter(a => a.confirmedAt).length;

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
      <button className="w-full flex items-center justify-between p-3 hover:bg-muted/30 text-left gap-2" onClick={() => setExpanded(e => !e)}>
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
            <p className="text-sm font-semibold">
              {item.totalPrice != null ? formatBRL(item.totalPrice as unknown as number) : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Pago: {formatBRL(item.totalPago as number)} · Saldo: {item.saldo != null ? formatBRL(item.saldo as unknown as number) : "—"}
            </p>
          </div>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t px-3 py-2 bg-muted/20 space-y-3">
          {agendamentos.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Sessões do pacote</p>
              <div className="space-y-1">
                {agendamentos.map((a, i) => {
                  const si = STATUS_INFO[a.status ?? "aguardando"] ?? STATUS_INFO.aguardando;
                  return (
                    <div key={a.id} className="flex items-center gap-2 text-xs px-2 py-1 bg-card border rounded">
                      <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                      <span className="text-muted-foreground">{formatDate(a.scheduledDate)}</span>
                      {a.service?.name && <span className="text-muted-foreground flex-1 truncate">{a.service.name}</span>}
                      <Badge className={`text-[10px] px-1 py-0 gap-1 shrink-0 ${si.color}`}>{si.icon}{si.label}</Badge>
                      {a.confirmedAt ? (
                        <span className="text-[10px] text-green-600 flex items-center gap-0.5 shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Presente
                        </span>
                      ) : a.status !== "cancelado" ? (
                        <span className="text-[10px] text-red-400 flex items-center gap-0.5 shrink-0">
                          <XCircle className="h-3 w-3" /> Não confirmado
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {(item.pagamentos ?? []).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Pagamentos</p>
              <div className="space-y-1">
                {(item.pagamentos as Payment[]).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs bg-card border rounded px-2 py-1">
                    <span className="text-muted-foreground">{formatDate(p.paymentDate)}</span>
                    <span>{p.paymentMethod ?? "—"}</span>
                    <span className="font-semibold text-green-700">{formatBRL(p.amount as unknown as number)}</span>
                    {p.notes && <span className="text-muted-foreground truncate max-w-[100px]">{p.notes}</span>}
                    <button onClick={() => handleDeletePayment(p.id)} className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600">
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

// ─── Modal principal ──────────────────────────────────────────────────────────
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
  const [activeTab, setActiveTab] = useState<"pets" | "avulsos" | "pacotes">("pets");

  const { data, isLoading } = useGetClientHistory(clientId ?? 0, {
    query: {
      queryKey: getGetClientHistoryQueryKey(clientId ?? 0),
      enabled: open && clientId != null,
    },
  });

  const handleRefresh = () => {
    if (clientId) queryClient.invalidateQueries({ queryKey: getGetClientHistoryQueryKey(clientId) });
  };

  const history = data as ClientHistory | undefined;

  const totalAvulsos  = history?.avulsos?.length ?? 0;
  const totalPacotes  = history?.pacotes?.length ?? 0;

  const totalPago =
    (history?.avulsos?.reduce((s, a) => s + ((a.totalPago as number) ?? 0), 0) ?? 0) +
    (history?.pacotes?.reduce((s, p) => s + ((p.totalPago as number) ?? 0), 0) ?? 0);

  const totalValor =
    (history?.avulsos?.reduce((s, a) => s + ((a.totalPrice as number) ?? 0), 0) ?? 0) +
    (history?.pacotes?.reduce((s, p) => s + ((p.totalPrice as unknown as number) ?? 0), 0) ?? 0);

  const totalSaldo = totalValor - totalPago;

  const petView = history ? buildPetView(history) : new Map();

  const TABS = [
    { key: "pets" as const,    label: `Por Cachorro (${petView.size})` },
    { key: "avulsos" as const, label: `Avulsos (${totalAvulsos})` },
    { key: "pacotes" as const, label: `Pacotes (${totalPacotes})` },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico — {clientName ?? "Cliente"}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !history ? (
          <p className="text-muted-foreground text-sm">Nenhum dado encontrado.</p>
        ) : (
          <div className="space-y-5">
            {/* Resumo financeiro */}
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
                <p className={`text-2xl font-bold ${totalSaldo > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {formatBRL(totalSaldo)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Saldo a receber</p>
              </div>
            </div>

            {/* Abas */}
            <div className="flex gap-1 border-b">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
                    activeTab === tab.key
                      ? "bg-background border border-b-background text-foreground -mb-px"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Aba: Por cachorro */}
            {activeTab === "pets" && (
              <div className="space-y-2">
                {petView.size === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">
                    Nenhuma sessão associada a um pet encontrada.
                  </p>
                ) : (
                  Array.from(petView.entries()).map(([petId, { petName, sessions }]) => (
                    <PetHistorySection key={petId} petName={petName} sessions={sessions} />
                  ))
                )}
              </div>
            )}

            {/* Aba: Avulsos */}
            {activeTab === "avulsos" && (
              <div className="space-y-2">
                {totalAvulsos === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">Nenhum agendamento avulso.</p>
                ) : (
                  (history.avulsos ?? []).map(item => (
                    <AvulsoItem key={item.id} item={item} clientId={clientId!} onRefresh={handleRefresh} />
                  ))
                )}
              </div>
            )}

            {/* Aba: Pacotes */}
            {activeTab === "pacotes" && (
              <div className="space-y-2">
                {totalPacotes === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">Nenhum pacote encontrado.</p>
                ) : (
                  (history.pacotes ?? []).map(item => (
                    <PacoteItem key={item.id} item={item} clientId={clientId!} onRefresh={handleRefresh} />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
