import { useState, useCallback, useEffect } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import {
  useListAppointments, useUpdateAppointment, useUpdateAppointmentStatus, useCreateAppointment,
  useDeleteAppointment, useListClients, useListPets, useListServices,
  useListPackages, useCreateClient, useCreatePet, useSellPackage,
  getListPetsQueryKey, useListMessageTemplates,
  getListAppointmentsQueryKey, getListMessageTemplatesQueryKey,
  useGetTenant,
  useConfirmAppointmentPresence,
  useRegisterAppointmentPayment,
} from "@workspace/api-client-react";
import type {
  Client, Pet, Service, Package, SellPackageResult, MessageTemplate, AppointmentFull,
} from "@workspace/api-client-react";
import { DEFAULT_PORTE_ORDER, DEFAULT_COAT_LABELS, getPorteLabel, getCoatLabel } from "@/lib/constants";
import { useAppAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2, ChevronLeft, ChevronRight, Clock, PawPrint,
  MessageSquare, UserPlus, ShoppingCart, CalendarCheck,
  ChevronRight as ArrowNext, Search, X, CalendarDays,
  Bell, ChevronDown, ChevronUp, CheckCheck, Pencil,
  Scissors, Plus, UserCheck, DollarSign,
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type AppStatus = "aguardando" | "em_atendimento" | "concluido" | "cancelado";

function appointmentFromFull(af: AppointmentFull): Appointment {
  return {
    id: af.id,
    petId: af.petId,
    clientId: af.clientId,
    serviceId: af.serviceId,
    packageId: af.packageId,
    scheduledDate: af.scheduledDate,
    status: af.status as AppStatus,
    totalPrice: af.totalPrice,
    notes: af.notes,
    confirmedAt: af.confirmedAt,
  };
}

type Appointment = {
  id: number;
  petId: number;
  clientId: number;
  serviceId?: number | null;
  packageId?: number | null;
  extraServiceIds?: number[] | null;
  scheduledDate: string;
  status: AppStatus;
  totalPrice: string | number;
  notes?: string | null;
  confirmedAt?: string | null;
};

const COLUMNS: { id: AppStatus; label: string; color: string; bg: string }[] = [
  { id: "aguardando", label: "Aguardando", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  { id: "em_atendimento", label: "Em Atendimento", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  { id: "concluido", label: "Concluído", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  { id: "cancelado", label: "Cancelado", color: "text-red-700", bg: "bg-red-50 border-red-200" },
];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Card components ──────────────────────────────────────────────────────────

function AppointmentCard({ appt, clients, pets, services, packages, onDelete, onWhatsapp, onPetPronto, onEditService, onChangeStatus, onConfirm, isDragging = false, isEditingDate, editDate, editTime, onStartEditDate, onChangeEditDate, onSaveEditDate, onCancelEditDate, isPeriodo = false }: {
  appt: Appointment;
  clients: Client[];
  pets: Pet[];
  services: Service[];
  packages: Package[];
  onDelete: (id: number) => void;
  onWhatsapp?: (appt: Appointment) => void;
  onPetPronto?: (appt: Appointment) => void;
  onEditService?: (appt: Appointment) => void;
  onChangeStatus?: (appt: Appointment, newStatus: AppStatus) => void;
  onConfirm?: (appt: Appointment) => void;
  isDragging?: boolean;
  isEditingDate?: boolean;
  editDate?: string;
  editTime?: string;
  onStartEditDate?: () => void;
  onChangeEditDate?: (date: string, time: string) => void;
  onSaveEditDate?: () => void;
  onCancelEditDate?: () => void;
  isPeriodo?: boolean;
}) {
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const { toast } = useToast();
  const registerPayment = useRegisterAppointmentPayment();

  const handleRegisterPayment = async () => {
    const amount = parseFloat(payAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Informe um valor válido", variant: "destructive" });
      return;
    }
    try {
      await registerPayment.mutateAsync({ id: appt.id, data: { amount, notes: payNotes || undefined } });
      toast({ title: "Pagamento registrado!", description: `R$ ${amount.toFixed(2).replace(".", ",")} lançado no financeiro` });
      setPayDialogOpen(false);
      setPayAmount("");
      setPayNotes("");
    } catch {
      toast({ title: "Erro ao registrar pagamento", variant: "destructive" });
    }
  };

  const pet = pets.find(p => p.id === appt.petId);
  const client = clients.find(c => c.id === appt.clientId);
  const service = services.find(s => s.id === appt.serviceId);
  const pkg = packages.find(p => p.id === appt.packageId);
  const time = new Date(appt.scheduledDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const price = Number(appt.totalPrice);
  const dateStr = new Date(appt.scheduledDate).toISOString().substring(0, 10);

  return (
    <div className="bg-white rounded-lg border shadow-sm p-3 cursor-grab active:cursor-grabbing select-none hover:shadow-md transition-shadow pl-[5px] pr-[5px] pt-[5px] pb-[5px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <PawPrint className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-semibold text-sm truncate">{pet?.name ?? "Pet"}</span>
            {pet?.size && <Badge variant="secondary" className="text-xs px-1 py-0">{getPorteLabel(pet.size)}{pet.coat ? ` · ${getCoatLabel(pet.coat)}` : ""}</Badge>}
            {appt.status !== "concluido" && appt.status !== "cancelado" && (
              appt.confirmedAt ? (
                <Badge className="text-[10px] px-1 py-0 bg-green-100 text-green-700 border border-green-300 font-medium gap-0.5">
                  <UserCheck className="h-2.5 w-2.5" />Confirmado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground gap-0.5">
                  <UserCheck className="h-2.5 w-2.5" />Não confirmado
                </Badge>
              )
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{client?.name ?? "Cliente"}</p>
          <p className="text-xs text-muted-foreground">
            {[
              service?.name ?? pkg?.name ?? "Serviço",
              ...(appt.extraServiceIds ?? []).map(id => services.find(s => s.id === id)?.name).filter(Boolean),
            ].join(" + ")}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          {onConfirm && appt.status !== "concluido" && appt.status !== "cancelado" && (
            <button
              onClick={e => { e.stopPropagation(); onConfirm(appt); }}
              className={`p-1 rounded transition-colors ${
                appt.confirmedAt
                  ? "bg-green-50 text-green-600 hover:bg-red-50 hover:text-red-500"
                  : "hover:bg-green-50 text-muted-foreground hover:text-green-600"
              }`}
              title={appt.confirmedAt ? "Desfazer confirmação de presença" : "Confirmar presença"}
            >
              <UserCheck className="h-3.5 w-3.5" />
            </button>
          )}
          {onEditService && (
            <button
              onClick={e => { e.stopPropagation(); onEditService(appt); }}
              className="p-1 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"
              title="Editar serviço"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(appt.id); }}
            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
        {isEditingDate ? (
          <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
            <Input
              type="date"
              value={editDate ?? dateStr}
              onChange={e => onChangeEditDate?.(e.target.value, editTime ?? time)}
              className="h-6 text-[10px] px-1 py-0 w-[110px]"
            />
            {isPeriodo ? (
              <Select
                value={(editTime ?? time) >= "12:00" ? "tarde" : "manha"}
                onValueChange={v => onChangeEditDate?.(editDate ?? dateStr, v === "tarde" ? "14:00" : "08:00")}
              >
                <SelectTrigger className="h-6 text-[10px] px-1 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="time"
                value={editTime ?? time}
                onChange={e => onChangeEditDate?.(editDate ?? dateStr, e.target.value)}
                className="h-6 text-[10px] px-1 py-0 w-[70px]"
              />
            )}
            <button
              onClick={e => { e.stopPropagation(); onSaveEditDate?.(); }}
              className="p-0.5 rounded hover:bg-green-50 text-green-600"
              title="Salvar"
            >
              <CalendarCheck className="h-3 w-3" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onCancelEditDate?.(); }}
              className="p-0.5 rounded hover:bg-red-50 text-red-500"
              title="Cancelar"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onStartEditDate?.(); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            title="Editar data/hora"
          >
            <Clock className="h-3 w-3" />
            {time}
          </button>
        )}
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-primary">{formatBRL(price)}</span>
        </div>
      </div>
      {/* Status buttons — always visible on mobile, hidden on desktop */}
      {onChangeStatus && appt.status !== "concluido" && appt.status !== "cancelado" && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-dashed" onClick={e => e.stopPropagation()}>
          {appt.status === "aguardando" && (
            <button
              onClick={e => { e.stopPropagation(); onChangeStatus(appt, "em_atendimento"); }}
              className="flex-1 flex items-center justify-center gap-1 text-xs py-1 px-2 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <ChevronRight className="h-3 w-3" /> Em Atendimento
            </button>
          )}
          {appt.status === "em_atendimento" && (
            <>
              {/* Botão Pet Pronto — abre WhatsApp antes de concluir */}
              <button
                onClick={e => { e.stopPropagation(); onPetPronto?.(appt); }}
                className="flex items-center justify-center gap-1 text-xs py-1 px-2 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <MessageSquare className="h-3 w-3" /> Pet pronto
              </button>
              <button
                onClick={e => { e.stopPropagation(); onChangeStatus(appt, "concluido"); }}
                className="flex-1 flex items-center justify-center gap-1 text-xs py-1 px-2 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
              >
                <CheckCheck className="h-3 w-3" /> Concluído
              </button>
            </>
          )}
          <button
            onClick={e => { e.stopPropagation(); onChangeStatus(appt, "cancelado"); }}
            className="flex items-center justify-center gap-1 text-xs py-1 px-2 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            <X className="h-3 w-3" /> Cancelar
          </button>
        </div>
      )}
      {appt.status === "concluido" && (
        <div className="mt-2 pt-2 border-t border-dashed" onClick={e => e.stopPropagation()}>
          <button
            onClick={e => { e.stopPropagation(); setPayAmount(String(Number(appt.totalPrice) || "")); setPayDialogOpen(true); }}
            className="w-full flex items-center justify-center gap-1 text-xs py-1 px-2 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
          >
            <DollarSign className="h-3 w-3" /> Registrar pagamento
          </button>
        </div>
      )}
      <Dialog open={payDialogOpen} onOpenChange={o => { if (!o) setPayDialogOpen(false); }}>
        <DialogContent className="max-w-xs" onClick={e => e.stopPropagation()}>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-600" />Registrar pagamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Valor recebido (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="0,00"
                autoFocus
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
                placeholder="Ex: Banho + tosa do Thor"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleRegisterPayment} disabled={registerPayment.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {registerPayment.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DraggableCard({ appt, clients, pets, services, packages, onDelete, onWhatsapp, onPetPronto, onEditService, onChangeStatus, onConfirm, isEditingDate, editDate, editTime, onStartEditDate, onChangeEditDate, onSaveEditDate, onCancelEditDate, isPeriodo }: {
  appt: Appointment;
  clients: Client[];
  pets: Pet[];
  services: Service[];
  packages: Package[];
  onDelete: (id: number) => void;
  onWhatsapp?: (appt: Appointment) => void;
  onPetPronto?: (appt: Appointment) => void;
  onEditService?: (appt: Appointment) => void;
  onChangeStatus?: (appt: Appointment, newStatus: AppStatus) => void;
  onConfirm?: (appt: Appointment) => void;
  isEditingDate?: boolean;
  editDate?: string;
  editTime?: string;
  onStartEditDate?: () => void;
  onChangeEditDate?: (date: string, time: string) => void;
  onSaveEditDate?: () => void;
  onCancelEditDate?: () => void;
  isPeriodo?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: appt.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <AppointmentCard
        appt={appt}
        clients={clients}
        pets={pets}
        services={services}
        packages={packages}
        onDelete={onDelete}
        onWhatsapp={onWhatsapp}
        onPetPronto={onPetPronto}
        onEditService={onEditService}
        onChangeStatus={onChangeStatus}
        onConfirm={onConfirm}
        isDragging={isDragging}
        isEditingDate={isEditingDate}
        editDate={editDate}
        editTime={editTime}
        onStartEditDate={onStartEditDate}
        onChangeEditDate={onChangeEditDate}
        onSaveEditDate={onSaveEditDate}
        onCancelEditDate={onCancelEditDate}
        isPeriodo={isPeriodo}
      />
    </div>
  );
}

function KanbanColumn({ status, label, color, bg, appointments, clients, pets, services, packages, onDelete, onWhatsapp, onPetPronto, onEditService, onChangeStatus, onConfirm, editingApptId, editDate, editTime, onStartEditDate, onChangeEditDate, onSaveEditDate, onCancelEditDate, isPeriodo }: {
  status: AppStatus;
  label: string;
  color: string;
  bg: string;
  appointments: Appointment[];
  clients: Client[];
  pets: Pet[];
  services: Service[];
  packages: Package[];
  onDelete: (id: number) => void;
  onWhatsapp: (appt: Appointment) => void;
  onPetPronto: (appt: Appointment) => void;
  onEditService: (appt: Appointment) => void;
  onChangeStatus: (appt: Appointment, newStatus: AppStatus) => void;
  onConfirm: (appt: Appointment) => void;
  editingApptId: number | null;
  editDate: string;
  editTime: string;
  onStartEditDate: (appt: Appointment) => void;
  onChangeEditDate: (date: string, time: string) => void;
  onSaveEditDate: (appt: Appointment) => void;
  onCancelEditDate: () => void;
  isPeriodo: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className={`flex flex-col rounded-xl border-2 ${bg} ${isOver ? "ring-2 ring-primary ring-offset-1" : ""} transition-all min-h-[400px]`}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-current/10 pt-[4px] pb-[4px] text-center flex-row pl-[6px] pr-[6px] ml-[2px] mr-[2px]">
        <span className="font-semibold text-sm text-yellow-700 text-center">{label}</span>
        <Badge variant="secondary" className="text-xs">{appointments.length}</Badge>
      </div>
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2 overflow-y-auto pt-[3px] pb-[3px] pl-[3px] pr-[3px]">
        {appointments.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">Nenhum agendamento</div>
        )}
        {appointments.map(appt => (
          <DraggableCard
            key={appt.id}
            appt={appt}
            clients={clients}
            pets={pets}
            services={services}
            packages={packages}
            onDelete={onDelete}
            onWhatsapp={onWhatsapp}
            onPetPronto={onPetPronto}
            onEditService={onEditService}
            onChangeStatus={onChangeStatus}
            onConfirm={onConfirm}
            isEditingDate={editingApptId === appt.id}
            editDate={editDate}
            editTime={editTime}
            onStartEditDate={() => onStartEditDate(appt)}
            onChangeEditDate={onChangeEditDate}
            onSaveEditDate={() => onSaveEditDate(appt)}
            onCancelEditDate={onCancelEditDate}
            isPeriodo={isPeriodo}
          />
        ))}
      </div>
    </div>
  );
}

// ─── EditServicoModal ─────────────────────────────────────────────────────────

function GerenciarServicosModal({
  appt, services, pets, isSaving, onSave, onClose,
}: {
  appt: Appointment | null;
  services: Service[];
  pets: Pet[];
  isSaving: boolean;
  onSave: (serviceId: number | undefined, extraServiceIds: number[], totalPrice: number, notes: string) => void;
  onClose: () => void;
}) {
  const pet = appt ? pets.find(p => p.id === appt.petId) : null;
  const isPackageAppt = !!(appt?.packageId);
  const filteredServices = pet?.size
    ? services.filter(s => {
        if (s.size !== pet.size) return false;
        if (pet.coat && s.coat) return s.coat === pet.coat;
        return true;
      })
    : services;

  const [primaryServiceId, setPrimaryServiceId] = useState<string>("");
  const [extraServiceIds, setExtraServiceIds] = useState<number[]>([]);
  const [price, setPrice] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [addingExtra, setAddingExtra] = useState(false);
  const [newExtraId, setNewExtraId] = useState<string>("");

  useEffect(() => {
    if (appt) {
      setPrimaryServiceId(appt.serviceId != null ? String(appt.serviceId) : "");
      setExtraServiceIds(appt.extraServiceIds ?? []);
      setPrice(String(Number(appt.totalPrice)));
      setNotes(appt.notes ?? "");
      setAddingExtra(false);
      setNewExtraId("");
    }
  }, [appt?.id]);

  const calcAutoPrice = (primaryId: string, extras: number[]) => {
    let total = 0;
    const primary = services.find(s => s.id === Number(primaryId));
    if (primary) total += Number(primary.price);
    extras.forEach(id => { const svc = services.find(s => s.id === id); if (svc) total += Number(svc.price); });
    return total > 0 ? String(total) : "";
  };

  const handlePrimaryChange = (v: string) => {
    setPrimaryServiceId(v);
    const autoPrice = calcAutoPrice(v, extraServiceIds);
    if (autoPrice) setPrice(autoPrice);
  };

  const addExtra = () => {
    if (!newExtraId || extraServiceIds.includes(Number(newExtraId))) return;
    const updated = [...extraServiceIds, Number(newExtraId)];
    setExtraServiceIds(updated);
    const autoPrice = calcAutoPrice(primaryServiceId, updated);
    if (autoPrice) setPrice(autoPrice);
    setNewExtraId("");
    setAddingExtra(false);
  };

  const removeExtra = (id: number) => {
    const updated = extraServiceIds.filter(x => x !== id);
    setExtraServiceIds(updated);
    const autoPrice = calcAutoPrice(primaryServiceId, updated);
    if (autoPrice) setPrice(autoPrice);
  };

  const availableForExtra = filteredServices.filter(
    s => s.id !== Number(primaryServiceId) && !extraServiceIds.includes(s.id),
  );

  return (
    <Dialog open={!!appt} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary" />
            Gerenciar Serviços
          </DialogTitle>
        </DialogHeader>
        {appt && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg text-sm">
              <PawPrint className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium">{pet?.name ?? "Pet"}</span>
              {pet?.size && <span className="text-xs text-muted-foreground">({getPorteLabel(pet.size)}{pet.coat ? ` · ${getCoatLabel(pet.coat)}` : ""})</span>}
            </div>

            {!isPackageAppt && (
              <div>
                <Label className="text-xs">Serviço principal</Label>
                <Select value={primaryServiceId} onValueChange={handlePrimaryChange}>
                  <SelectTrigger className="h-8 text-sm mt-1">
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredServices.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name} — {formatBRL(s.price)}</SelectItem>
                    ))}
                    {filteredServices.length === 0 && (
                      <SelectItem value="_none" disabled>Nenhum serviço para este porte</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {extraServiceIds.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Serviços adicionais</Label>
                {extraServiceIds.map(id => {
                  const svc = services.find(s => s.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between bg-muted/30 rounded px-2 py-1.5 text-xs">
                      <span>{svc?.name ?? `#${id}`}{svc ? ` — ${formatBRL(svc.price)}` : ""}</span>
                      <button onClick={() => removeExtra(id)} className="text-red-500 hover:text-red-700 ml-2">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {addingExtra ? (
              <div className="flex gap-2 items-center">
                <Select value={newExtraId} onValueChange={setNewExtraId}>
                  <SelectTrigger className="h-8 text-sm flex-1">
                    <SelectValue placeholder="Selecione serviço adicional" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableForExtra.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name} — {formatBRL(s.price)}</SelectItem>
                    ))}
                    {availableForExtra.length === 0 && (
                      <SelectItem value="_none" disabled>Nenhum serviço disponível</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="default" onClick={addExtra} disabled={!newExtraId} className="h-8">OK</Button>
                <button onClick={() => { setAddingExtra(false); setNewExtraId(""); }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              availableForExtra.length > 0 && (
                <Button type="button" variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => setAddingExtra(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar serviço
                </Button>
              )
            )}

            <div>
              <Label className="text-xs">Valor total (R$)</Label>
              <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="h-8 text-sm mt-1" />
            </div>

            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observações opcionais..." className="text-sm mt-1" />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            disabled={isSaving || !price || Number(price) <= 0}
            onClick={() => onSave(primaryServiceId ? Number(primaryServiceId) : undefined, extraServiceIds, Number(price), notes)}
          >
            {isSaving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ConfirmacaoWhatsAppModal ─────────────────────────────────────────────────

// "pet_pronto" = aviso "seu pet está pronto para ser buscado"
type ConfirmacaoMode = "agradecimento" | "conclusao" | "pet_pronto";

function ConfirmacaoWhatsAppModal({
  appt, clients, pets, services, packages, mode = "conclusao", overridePrice, overrideClient, onClose, tenantId,
}: {
  appt: Appointment | null;
  clients: Client[];
  pets: Pet[];
  services: Service[];
  packages: Package[];
  mode?: ConfirmacaoMode;
  overridePrice?: number;
  overrideClient?: Pick<Client, "id" | "name" | "phone">;
  onClose: () => void;
  tenantId: number;
}) {
  const pet = appt ? pets.find(p => p.id === appt.petId) : null;
  const client = overrideClient ?? (appt ? clients.find(c => c.id === appt.clientId) : null);
  const service = appt ? services.find(s => s.id === appt.serviceId) : null;
  const pkg = appt ? packages.find(p => p.id === appt.packageId) : null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const clientApptParams = appt
    ? { tenantId: tenantId!, clientId: appt.clientId, startDate: todayStart.toISOString() }
    : undefined;
  const { data: clientAppts = [] } = useListAppointments(
    clientApptParams,
    { query: { queryKey: getListAppointmentsQueryKey(clientApptParams), enabled: !!appt } }
  );
  const tmplParams = { tenantId: tenantId! };
  const { data: msgTemplates = [] } = useListMessageTemplates(
    tmplParams,
    { query: { queryKey: getListMessageTemplatesQueryKey(tmplParams), enabled: !!appt } }
  );

  const templateType = mode === "pet_pronto"
    ? "pet_pronto"
    : (mode === "agradecimento" || mode === "conclusao") ? "agradecimento" : "confirmacao";
  const filteredTemplates = (msgTemplates as MessageTemplate[]).filter(t => t.type === templateType);

  const [templateId, setTemplateId] = useState<string>("");

  useEffect(() => {
    setTemplateId(prev => {
      const ids = filteredTemplates.map(t => String(t.id));
      if (ids.includes(prev)) return prev;
      return ids.length > 0 ? ids[0] : "";
    });
  }, [appt?.id, mode, filteredTemplates.length]);

  const { data: tenantForMsg } = useGetTenant(tenantId);
  const schedulingMethodForMsg = (tenantForMsg as any)?.schedulingMethod ?? "hora";
  const isPeriodoMsg = schedulingMethodForMsg === "periodo";
  const utcOffsetForMsg: number = (tenantForMsg as any)?.utcOffset ?? -3;

  const buildMessage = (): string => {
    if (!appt || !client) return "";
    const d = new Date(appt.scheduledDate);
    const rawTime = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const periodoLabel = (d.getUTCHours() + utcOffsetForMsg) < 12 ? "Manhã" : "Tarde";
    const apptTime = isPeriodoMsg ? periodoLabel : rawTime;
    const apptDate = format(d, "dd/MM/yyyy");
    const extraNames = (appt.extraServiceIds ?? [])
      .map(id => services.find(s => s.id === id)?.name)
      .filter(Boolean) as string[];
    const serviceName = [service?.name ?? pkg?.name ?? "Serviço", ...extraNames].join(" + ");
    const price = formatBRL(overridePrice !== undefined ? overridePrice : Number(appt.totalPrice));

    const allAppts = (clientAppts as Appointment[])
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    const now = new Date();
    const datesForList = mode === "agradecimento"
      ? allAppts.filter(a => new Date(a.scheduledDate) >= now)
      : allAppts.filter(a => a.id !== appt.id && new Date(a.scheduledDate) > now);

    const datasStr = datesForList.length > 0
      ? datesForList.map(a => {
          const ad = new Date(a.scheduledDate);
          if (isPeriodoMsg) {
            const p = (ad.getUTCHours() + utcOffsetForMsg) < 12 ? "Manhã" : "Tarde";
            return `📅 ${format(ad, "dd/MM/yyyy")} — ${p}`;
          }
          return `📅 ${format(ad, "dd/MM/yyyy 'às' HH:mm")}`;
        }).join("\n")
      : isPeriodoMsg ? `${apptDate} — ${apptTime}` : `${apptDate} às ${apptTime}`;

    const selectedTmpl = filteredTemplates.find(t => String(t.id) === templateId) ?? filteredTemplates[0];
    if (!selectedTmpl) return "";

    const baseContent = selectedTmpl.content;

    let msg = baseContent
      .replace(/\{nome_cliente\}/g, client.name)
      .replace(/\{nome_pet\}/g, pet?.name ?? "")
      .replace(/\{data\}/g, apptDate)
      .replace(/\{horario\}/g, apptTime)
      .replace(/\{periodo\}/g, periodoLabel)
      .replace(/\{servico\}/g, serviceName)
      .replace(/\{preco\}/g, price)
      .replace(/\{datas\}/g, datasStr);

    if (mode === "conclusao" && !baseContent.includes("{datas}") && datesForList.length > 0) {
      const datesList = datesForList
        .map(a => {
          const ad = new Date(a.scheduledDate);
          if (isPeriodoMsg) {
            const p = (ad.getUTCHours() + utcOffsetForMsg) < 12 ? "Manhã" : "Tarde";
            return `📅 ${format(ad, "dd/MM/yyyy")} — ${p}`;
          }
          return `📅 ${format(ad, "dd/MM/yyyy 'às' HH:mm")}`;
        })
        .join("\n");
      msg += `\n\nPróximos agendamentos:\n${datesList}`;
    }

    return msg;
  };

  const handleSend = () => {
    if (!client?.phone) return;
    const message = buildMessage();
    const cleaned = client.phone.replace(/\D/g, "");
    const number = cleaned.length === 11 ? `55${cleaned}` : cleaned;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank");
    onClose();
  };

  const modalTitle = mode === "pet_pronto"
    ? "🐾 Pet Pronto!"
    : mode === "agradecimento"
      ? "Agradecimento via WhatsApp"
      : mode === "conclusao"
        ? "Agradecimento após Atendimento"
        : "Confirmação de Presença via WhatsApp";

  const templateLabel = mode === "pet_pronto"
    ? "Template de pet pronto"
    : (mode === "agradecimento" || mode === "conclusao")
      ? "Template de agradecimento"
      : "Template de confirmação de presença";

  return (
    <Dialog open={!!appt} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            {modalTitle}
          </DialogTitle>
        </DialogHeader>
        {appt && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
              <PawPrint className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-sm">{pet?.name ?? "Pet"} — {client?.name ?? "Cliente"}</p>
                <p className="text-xs text-muted-foreground">
                  {service?.name ?? pkg?.name ?? "Serviço"} · {formatBRL(overridePrice !== undefined ? overridePrice : Number(appt.totalPrice))} · {format(new Date(appt.scheduledDate), "dd/MM 'às' HH:mm")}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{templateLabel}</Label>
              {filteredTemplates.length === 0 ? (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  ⚠️ Nenhum template cadastrado para este tipo. Crie um na página <strong>Mensagens</strong>.
                </p>
              ) : (
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTemplates.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {filteredTemplates.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Pré-visualização da mensagem</Label>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm whitespace-pre-wrap font-mono text-green-900 max-h-52 overflow-y-auto">
                  {buildMessage()}
                </div>
              </div>
            )}

            {!client?.phone && (
              <p className="text-xs text-amber-600">
                ⚠️ Cliente sem telefone cadastrado — não é possível enviar pelo WhatsApp.
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button
            className="bg-green-600 hover:bg-green-700 gap-2"
            onClick={handleSend}
            disabled={!client?.phone || filteredTemplates.length === 0}
          >
            <MessageSquare className="h-4 w-4" />
            Enviar pelo WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

const emptyCasual = {
  clientName: "",
  clientPhone: "",
  petName: "",
  petBreed: "",
  petSize: "",
  petCoat: "",
  serviceId: "",
  extraServiceIds: [] as number[],
  scheduledDate: new Date().toISOString().substring(0, 10),
  scheduledTime: "09:00",
  totalPrice: "",
  notes: "",
};

const emptySell = {
  packageId: "",
  clientId: "",
  petId: "",
  startDate: new Date().toISOString().substring(0, 10),
  startTime: "09:00",
  notes: "",
  paidNow: false,
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${i <= step ? "bg-primary flex-1" : "bg-muted flex-[0.4]"}`}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Agendamentos() {
  const { tenantId } = useAppAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeId, setActiveId] = useState<number | null>(null);

  const [casualOpen, setCasualOpen] = useState(false);
  const [casualStep, setCasualStep] = useState(0);
  const [casual, setCasual] = useState(emptyCasual);
  const [casualFoundClient, setCasualFoundClient] = useState<Client | null>(null);
  const [casualSearchQuery, setCasualSearchQuery] = useState("");
  const [casualSelectedPetId, setCasualSelectedPetId] = useState<string>("");

  const [sellOpen, setSellOpen] = useState(false);
  const [sell, setSell] = useState(emptySell);
  const [sellClientSearch, setSellClientSearch] = useState("");

  const [editingApptId, setEditingApptId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  const [editServicoAppt, setEditServicoAppt] = useState<Appointment | null>(null);

  const handleEditServicoSave = async (serviceId: number | undefined, extraServiceIds: number[], totalPrice: number, notes: string) => {
    if (!editServicoAppt) return;
    try {
      await updateAppointment.mutateAsync({
        id: editServicoAppt.id,
        data: { serviceId, extraServiceIds: extraServiceIds.length > 0 ? extraServiceIds : undefined, totalPrice, notes: notes || undefined },
      });
      setEditServicoAppt(null);
      refetch();
      toast({ title: "Agendamento atualizado!" });
    } catch {
      toast({ title: "Erro ao atualizar agendamento", variant: "destructive" });
    }
  };

  // WhatsApp confirmation modal
  const [confirmacaoAppt, setConfirmacaoAppt] = useState<Appointment | null>(null);
  const [confirmacaoMode, setConfirmacaoMode] = useState<ConfirmacaoMode>("conclusao");
  const [confirmacaoOverridePrice, setConfirmacaoOverridePrice] = useState<number | undefined>(undefined);
  const [confirmacaoOverrideClient, setConfirmacaoOverrideClient] = useState<Pick<Client, "id" | "name" | "phone"> | undefined>(undefined);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("09:00");
  const [reschedMode, setReschedMode] = useState<"cancel" | "resched">("cancel");

  const openConfirmacao = (appt: Appointment) => {
    setConfirmacaoMode("conclusao");
    setConfirmacaoOverridePrice(undefined);
    setConfirmacaoAppt(appt);
  };

  // Novo: abre o modal no modo "pet_pronto"
  const openPetPronto = useCallback((appt: Appointment) => {
    setConfirmacaoMode("pet_pronto");
    setConfirmacaoOverridePrice(undefined);
    setConfirmacaoAppt(appt);
  }, []);

  // Reminders panel
  const tomorrow = addDays(new Date(), 1);
  const tomorrowKey = format(tomorrow, "yyyy-MM-dd");
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [reminderTemplateId, setReminderTemplateId] = useState<string>("");
  const [notifiedIds, setNotifiedIds] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(`reminders_notified_${tomorrowKey}`);
      return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
    } catch { return new Set<number>(); }
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  const tomorrowEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59);
  const { data: tomorrowAppts = [] } = useListAppointments({
    tenantId: tenantId!,
    startDate: tomorrowStart.toISOString(),
    endDate: tomorrowEnd.toISOString(),
  });
  const { data: msgTemplates = [] } = useListMessageTemplates({ tenantId: tenantId! });
  const reminderTemplates = (msgTemplates as MessageTemplate[]).filter(t => t.type === "lembrete");

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const queryStart = view === "day" ? selectedDate : weekStart;
  const queryEnd = view === "day" ? selectedDate : addDays(weekStart, 6);

  const { data: appointments = [], refetch } = useListAppointments({
    tenantId: tenantId!,
    startDate: queryStart.toISOString(),
    endDate: new Date(queryEnd.getFullYear(), queryEnd.getMonth(), queryEnd.getDate(), 23, 59, 59).toISOString(),
  });

  const { data: tenantData } = useGetTenant(tenantId!);
  const schedulingMethod = (tenantData as any)?.schedulingMethod ?? "hora";
  const isPeriodo = schedulingMethod === "periodo";
  const tenantPortes: string[] = (tenantData as any)?.petSizes ?? DEFAULT_PORTE_ORDER;
  const tenantCoats: string[] = (tenantData as any)?.coatTypes ?? Object.keys(DEFAULT_COAT_LABELS);

  const { data: clients = [] } = useListClients({ tenantId: tenantId! });
  const { data: allPets = [] } = useListPets({});
  const { data: services = [] } = useListServices({ tenantId: tenantId! });
  const { data: packages = [] } = useListPackages({ tenantId: tenantId! });

  const sellPetParams = sell.clientId ? { clientId: Number(sell.clientId) } : undefined;
  const { data: sellClientPets = [] } = useListPets(sellPetParams, {
    query: { queryKey: getListPetsQueryKey(sellPetParams), enabled: !!sell.clientId },
  });

  const casualClientPetParams = casualFoundClient ? { clientId: casualFoundClient.id } : undefined;
  const { data: casualClientPets = [], isFetched: casualClientPetsFetched } = useListPets(casualClientPetParams, {
    query: { queryKey: getListPetsQueryKey(casualClientPetParams), enabled: !!casualFoundClient },
  });

  useEffect(() => {
    if (casualFoundClient && casualClientPetsFetched && (casualClientPets as Pet[]).length === 0) {
      setCasualSelectedPetId("new");
    }
  }, [casualFoundClient, casualClientPetsFetched, casualClientPets]);

  const casualSearchQuery_trimmed = casualSearchQuery.trim();
  const isPhoneQuery = casualSearchQuery_trimmed.length > 0 && /^[\d\s\-\(\)]+$/.test(casualSearchQuery_trimmed);
  const casualSearchResults = casualSearchQuery_trimmed.length >= 2
    ? (clients as Client[]).filter(c =>
        c.name.toLowerCase().includes(casualSearchQuery_trimmed.toLowerCase()) ||
        (isPhoneQuery && (c.phone ?? "").replace(/\D/g, "").includes(casualSearchQuery_trimmed.replace(/\D/g, "")))
      ).slice(0, 6)
    : [];

  const updateStatus = useUpdateAppointmentStatus();
  const updateAppointment = useUpdateAppointment();
  const createAppointment = useCreateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const createClient = useCreateClient();
  const createPet = useCreatePet();
  const sellPackage = useSellPackage();

  const startEditDate = (appt: Appointment) => {
    setEditingApptId(appt.id);
    setEditDate(new Date(appt.scheduledDate).toISOString().substring(0, 10));
    setEditTime(new Date(appt.scheduledDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }));
  };
  const changeEditDate = (date: string, time: string) => {
    setEditDate(date);
    setEditTime(time);
  };
  const saveEditDate = async (appt: Appointment) => {
    if (!editDate || !editTime) return;
    const dt = new Date(`${editDate}T${editTime}:00`);
    try {
      if (appt.confirmedAt) {
        await confirmPresence.mutateAsync({ id: appt.id, data: { confirmed: false } });
      }
      await updateAppointment.mutateAsync({
        id: appt.id,
        data: { scheduledDate: dt.toISOString() },
      });
      toast({ title: appt.confirmedAt ? "Data/hora atualizada. Confirmação removida." : "Data/hora atualizada!" });
      setEditingApptId(null);
      refetch();
    } catch {
      toast({ title: "Erro ao atualizar data", variant: "destructive" });
    }
  };
  const cancelEditDate = () => {
    setEditingApptId(null);
    setEditDate("");
    setEditTime("");
  };

  const casualFilteredServices = casual.petSize
    ? (services as Service[]).filter(s =>
        s.size === casual.petSize && (!casual.petCoat || s.coat === casual.petCoat)
      )
    : (services as Service[]);
  const casualExtraAvailable = casualFilteredServices.filter(
    s => s.id !== Number(casual.serviceId) && !casual.extraServiceIds.includes(s.id),
  );

  const selectedPkg = (packages as Package[]).find(p => p.id === Number(sell.packageId));
  const sellPet = (sellClientPets as Pet[]).find(p => p.id === Number(sell.petId));
  const sellPetSize = sellPet?.size;
  const sellPetCoat = sellPet?.coat;
  const priceForPet = sellPetSize && selectedPkg
    ? (
        selectedPkg.priceBySizes.find(p => p.size === sellPetSize && p.coat === sellPetCoat)?.price ??
        selectedPkg.priceBySizes.find(p => p.size === sellPetSize)?.price ??
        null
      )
    : null;

  const sellSessions = (() => {
    if (!selectedPkg) return [];
    const pkgSessions = (selectedPkg as any).sessions as Array<{ label: string; serviceNames: string[] }> | null | undefined;
    if (pkgSessions?.length) {
      return pkgSessions.map((s, i) => ({
        index: i + 1,
        label: s.label || `Sessão ${i + 1}`,
        serviceNames: s.serviceNames,
        hasExtra: s.serviceNames.length > 1,
      }));
    }
    const items = [...(selectedPkg.serviceItems ?? [])].sort((a, b) => b.quantity - a.quantity);
    const main = items[0];
    const extras = items.slice(1);
    if (!main) return [];
    return Array.from({ length: main.quantity }, (_, i) => {
      const isLast = i === main.quantity - 1;
      const names = isLast
        ? [main.serviceName, ...extras.map(e => e.serviceName)]
        : [main.serviceName];
      return {
        index: i + 1,
        label: `Semana ${i + 1}`,
        serviceNames: names,
        hasExtra: isLast && extras.length > 0,
      };
    });
  })();

  const confirmPresence = useConfirmAppointmentPresence();

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as number);

  const handleStatusChange = useCallback(async (appt: Appointment, newStatus: AppStatus) => {
    if (appt.status === newStatus) return;
    if (newStatus === "cancelado") {
      setCancellingAppt(appt);
      setReschedDate(new Date(appt.scheduledDate).toISOString().substring(0, 10));
      setReschedTime(new Date(appt.scheduledDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }));
      setReschedMode("cancel");
      setCancelDialogOpen(true);
      return;
    }
    try {
      if ((newStatus === "em_atendimento" || newStatus === "concluido") && !appt.confirmedAt) {
        await confirmPresence.mutateAsync({ id: appt.id, data: { confirmed: true } });
      }
      await updateStatus.mutateAsync({ id: appt.id, data: { status: newStatus } });
      refetch();
      if (newStatus === "concluido") {
        openConfirmacao(appt);
      }
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  }, [updateStatus, confirmPresence, refetch, toast, openConfirmacao]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as AppStatus;
    const appt = (appointments as Appointment[]).find(a => a.id === active.id);
    if (!appt) return;
    await handleStatusChange(appt, newStatus);
  }, [appointments, handleStatusChange]);

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este agendamento?")) return;
    await deleteAppointment.mutateAsync({ id });
    refetch();
  };

  const handleCancelConfirm = async () => {
    if (!cancellingAppt) return;
    if (reschedMode === "resched") {
      if (!reschedDate || !reschedTime) {
        toast({ title: "Informe a data e horário do reagendamento", variant: "destructive" });
        return;
      }
      try {
        const dt = new Date(`${reschedDate}T${reschedTime}:00`);
        await createAppointment.mutateAsync({
          data: {
            tenantId: tenantId!,
            petId: cancellingAppt.petId,
            clientId: cancellingAppt.clientId,
            ...(cancellingAppt.serviceId ? { serviceId: cancellingAppt.serviceId } : {}),
            ...(cancellingAppt.packageId ? { packageId: cancellingAppt.packageId } : {}),
            ...(cancellingAppt.extraServiceIds?.length ? { extraServiceIds: cancellingAppt.extraServiceIds } : {}),
            scheduledDate: dt.toISOString(),
            totalPrice: Number(cancellingAppt.totalPrice),
            ...(cancellingAppt.notes ? { notes: cancellingAppt.notes } : {}),
          },
        });
      } catch {
        toast({ title: "Erro ao criar reagendamento", variant: "destructive" });
        return;
      }
    }
    try {
      if (cancellingAppt.confirmedAt) {
        await confirmPresence.mutateAsync({ id: cancellingAppt.id, data: { confirmed: false } });
      }
      await updateStatus.mutateAsync({ id: cancellingAppt.id, data: { status: "cancelado" } });
      refetch();
      toast({ title: reschedMode === "resched" ? "Reagendado com sucesso!" : "Agendamento cancelado." });
    } catch {
      toast({ title: "Erro ao cancelar agendamento", variant: "destructive" });
    }
    setCancelDialogOpen(false);
    setCancellingAppt(null);
  };

  const handleConfirmPresence = useCallback(async (appt: Appointment) => {
    const newConfirmed = !appt.confirmedAt;
    try {
      await confirmPresence.mutateAsync({ id: appt.id, data: { confirmed: newConfirmed } });
      toast({ title: newConfirmed ? "Presença confirmada!" : "Confirmação desfeita" });
      refetch();
    } catch {
      toast({ title: "Erro ao atualizar confirmação", variant: "destructive" });
    }
  }, [confirmPresence, refetch, toast]);

  const openCasual = () => {
    setCasual(emptyCasual);
    setCasualStep(0);
    setCasualFoundClient(null);
    setCasualSearchQuery("");
    setCasualSelectedPetId("");
    setCasualOpen(true);
  };

  const casualNextStep = () => {
    if (casualStep === 0) {
      if (casualFoundClient) { setCasualStep(2); return; }
      if (!casual.clientName.trim()) { toast({ title: "Nome do cliente é obrigatório", variant: "destructive" }); return; }
      if (!casual.clientPhone.trim()) { toast({ title: "Telefone é obrigatório", variant: "destructive" }); return; }
    }
    if (casualStep === 1) {
      if (!casual.petName.trim()) { toast({ title: "Nome do pet é obrigatório", variant: "destructive" }); return; }
      if (!casual.petSize) { toast({ title: "Porte do pet é obrigatório", variant: "destructive" }); return; }
    }
    setCasualStep(s => s + 1);
  };

  const casualPrevStep = () => {
    if (casualStep === 2 && casualFoundClient) { setCasualStep(0); } else { setCasualStep(s => s - 1); }
  };

  const handleCasualSave = async () => {
    if (!casual.serviceId) { toast({ title: "Selecione um serviço", variant: "destructive" }); return; }
    if (!casual.scheduledDate || !casual.scheduledTime) { toast({ title: "Data e horário são obrigatórios", variant: "destructive" }); return; }
    if (!casual.totalPrice) { toast({ title: "Informe o valor", variant: "destructive" }); return; }
    if (!casual.petSize) { toast({ title: "Porte do pet é obrigatório", variant: "destructive" }); return; }
    if (casualFoundClient) {
      const usingExistingPet = casualSelectedPetId && casualSelectedPetId !== "new";
      if (!usingExistingPet && !casual.petName.trim()) { toast({ title: "Nome do pet é obrigatório", variant: "destructive" }); return; }
      if (!casualSelectedPetId) { toast({ title: "Selecione um pet", variant: "destructive" }); return; }
    }
    try {
      let resolvedClientId: number;
      let resolvedPetId: number;
      if (casualFoundClient) {
        resolvedClientId = casualFoundClient.id;
        if (casualSelectedPetId && casualSelectedPetId !== "new") {
          resolvedPetId = Number(casualSelectedPetId);
        } else {
          const newPet: Pet = await createPet.mutateAsync({ data: { clientId: resolvedClientId, name: casual.petName.trim(), breed: casual.petBreed.trim() || undefined, size: casual.petSize, coat: casual.petCoat || undefined } });
          resolvedPetId = newPet.id;
        }
      } else {
        const newClient: Client = await createClient.mutateAsync({ data: { tenantId: tenantId!, name: casual.clientName.trim(), phone: casual.clientPhone.trim() } });
        resolvedClientId = newClient.id;
        setConfirmacaoOverrideClient({ id: newClient.id, name: newClient.name, phone: newClient.phone });
        const newPet: Pet = await createPet.mutateAsync({ data: { clientId: resolvedClientId, name: casual.petName.trim(), breed: casual.petBreed.trim() || undefined, size: casual.petSize, coat: casual.petCoat || undefined } });
        resolvedPetId = newPet.id;
      }
      const effectiveCasualTime = isPeriodo ? (casual.scheduledTime >= "12:00" ? "14:00" : "08:00") : casual.scheduledTime;
      const dt = new Date(`${casual.scheduledDate}T${effectiveCasualTime}:00`);
      const createdAppts = await createAppointment.mutateAsync({ data: { tenantId: tenantId!, clientId: resolvedClientId, petId: resolvedPetId, serviceId: Number(casual.serviceId), extraServiceIds: casual.extraServiceIds.length > 0 ? casual.extraServiceIds : undefined, scheduledDate: dt.toISOString(), totalPrice: Number(casual.totalPrice), notes: casual.notes || undefined } });
      const clientName = casualFoundClient?.name ?? casual.clientName;
      const petName = casualSelectedPetId && casualSelectedPetId !== "new" ? (casualClientPets as Pet[]).find(p => p.id === Number(casualSelectedPetId))?.name ?? "" : casual.petName;
      toast({ title: "Agendamento criado!", description: `${clientName} · ${petName}` });
      setCasualOpen(false);
      refetch();
      const first = createdAppts[0];
      if (first) { setConfirmacaoMode("agradecimento"); setConfirmacaoOverridePrice(undefined); setConfirmacaoAppt(appointmentFromFull(first)); }
    } catch {
      setConfirmacaoOverrideClient(undefined);
      toast({ title: "Erro ao criar agendamento", variant: "destructive" });
    }
  };

  const isCasualSaving = createClient.isPending || createPet.isPending || createAppointment.isPending;

  const openSell = () => { setSell(emptySell); setSellClientSearch(""); setSellOpen(true); };

  const handleSellSave = async () => {
    if (!sell.packageId) { toast({ title: "Selecione o pacote", variant: "destructive" }); return; }
    if (!sell.clientId) { toast({ title: "Selecione o cliente", variant: "destructive" }); return; }
    if (!sell.petId) { toast({ title: "Selecione o pet", variant: "destructive" }); return; }
    if (!sell.startDate || !sell.startTime) { toast({ title: "Data e horário são obrigatórios", variant: "destructive" }); return; }
    try {
      const effectiveSellTime = isPeriodo ? (sell.startTime >= "12:00" ? "14:00" : "08:00") : sell.startTime;
      const result: SellPackageResult = await sellPackage.mutateAsync({ id: Number(sell.packageId), data: { tenantId: tenantId!, clientId: Number(sell.clientId), petId: Number(sell.petId), startDate: sell.startDate, startTime: effectiveSellTime, notes: sell.notes || null, paidNow: sell.paidNow || undefined } });
      const count = result.appointments.length;
      const price = result.financialEntry.amount;
      toast({ title: "Pacote vendido com sucesso!", description: `${count} agendamento${count !== 1 ? "s" : ""} criado${count !== 1 ? "s" : ""} · Receita: ${formatBRL(price)}` });
      setSellOpen(false);
      refetch();
      const firstSell = result.appointments[0];
      if (firstSell) { setConfirmacaoMode("agradecimento"); setConfirmacaoOverridePrice(result.financialEntry.amount); setConfirmacaoAppt(appointmentFromFull(firstSell)); }
    } catch {
      toast({ title: "Erro ao vender pacote", variant: "destructive" });
    }
  };

  const markNotified = (apptId: number) => {
    setNotifiedIds(prev => {
      const next = new Set(prev);
      next.add(apptId);
      try { localStorage.setItem(`reminders_notified_${tomorrowKey}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const utcOffsetReminder: number = (tenantData as any)?.utcOffset ?? -3;

  const fillReminderTemplate = (appt: Appointment): string => {
    const pet = (allPets as Pet[]).find(p => p.id === appt.petId);
    const client = (clients as Client[]).find(c => c.id === appt.clientId);
    const service = (services as Service[]).find(s => s.id === appt.serviceId);
    const pkg = (packages as Package[]).find(p => p.id === appt.packageId);
    const d = new Date(appt.scheduledDate);
    const rawTime = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const periodoLabel = (d.getUTCHours() + utcOffsetReminder) < 12 ? "Manhã" : "Tarde";
    const apptTime = isPeriodo ? periodoLabel : rawTime;
    const apptDate = format(tomorrow, "dd/MM/yyyy");
    const serviceName = service?.name ?? pkg?.name ?? "Serviço";
    const selectedTmpl = reminderTemplates.find(t => String(t.id) === reminderTemplateId) ?? reminderTemplates[0];
    if (!selectedTmpl) return "";
    return selectedTmpl.content
      .replace(/\{nome_cliente\}/g, client?.name ?? "")
      .replace(/\{nome_pet\}/g, pet?.name ?? "")
      .replace(/\{data\}/g, apptDate)
      .replace(/\{horario\}/g, apptTime)
      .replace(/\{periodo\}/g, periodoLabel)
      .replace(/\{servico\}/g, serviceName)
      .replace(/\{preco\}/g, formatBRL(Number(appt.totalPrice)));
  };

  const sendReminder = (appt: Appointment) => {
    const client = (clients as Client[]).find(c => c.id === appt.clientId);
    if (!client?.phone) { toast({ title: "Cliente sem telefone cadastrado", variant: "destructive" }); return; }
    const message = fillReminderTemplate(appt);
    if (!message) { toast({ title: "Nenhum template de lembrete cadastrado. Crie um na página Mensagens.", variant: "destructive" }); return; }
    const cleaned = client.phone.replace(/\D/g, "");
    const number = cleaned.length === 11 ? `55${cleaned}` : cleaned;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank");
    markNotified(appt.id);
  };

  const unmarkNotified = (apptId: number) => {
    setNotifiedIds(prev => {
      const next = new Set(prev);
      next.delete(apptId);
      try { localStorage.setItem(`reminders_notified_${tomorrowKey}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const sortedTomorrowAppts = [
    ...(tomorrowAppts as Appointment[]).filter(a => !notifiedIds.has(a.id)),
    ...(tomorrowAppts as Appointment[]).filter(a => notifiedIds.has(a.id)),
  ].sort((a, b) => {
    const aN = notifiedIds.has(a.id) ? 1 : 0;
    const bN = notifiedIds.has(b.id) ? 1 : 0;
    if (aN !== bN) return aN - bN;
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
  });

  const activeAppt = activeId ? (appointments as Appointment[]).find(a => a.id === activeId) : null;
  const filterForDay = (day: Date) => (appointments as Appointment[]).filter(a => isSameDay(new Date(a.scheduledDate), day));
  const filterByStatus = (status: AppStatus) =>
    (view === "day" ? filterForDay(selectedDate) : (appointments as Appointment[])).filter(a => a.status === status);

  const STEP_LABELS = ["Cliente", "Pet", "Agendamento"];

  return (
    <div className="p-6 space-y-4 pl-[12px] pr-[12px] pt-[12px] pb-[12px]">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-[8px]">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground">Kanban de atendimentos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openCasual} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Novo Agendamento
          </Button>
          <Button onClick={openSell} className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Vender Pacote
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-wrap mb-[8px]">
        <Tabs value={view} onValueChange={v => setView(v as "day" | "week")}>
          <TabsList>
            <TabsTrigger value="day">Dia</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSelectedDate(d => addDays(d, view === "day" ? -1 : -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-48 text-center">
            {view === "day"
              ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })
              : `${format(weekStart, "d MMM", { locale: ptBR })} – ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: ptBR })}`
            }
          </span>
          <Button variant="outline" size="icon" onClick={() => setSelectedDate(d => addDays(d, view === "day" ? 1 : 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
        </div>
      </div>
      {view === "week" && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {weekDays.map(d => (
            <button
              key={d.toISOString()}
              onClick={() => { setSelectedDate(d); setView("day"); }}
              className={`flex flex-col items-center px-3 py-2 rounded-lg text-sm min-w-[70px] transition-colors ${isSameDay(d, selectedDate) ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              <span className="text-xs opacity-70">{format(d, "EEE", { locale: ptBR })}</span>
              <span className="font-bold">{format(d, "d")}</span>
              <span className="text-xs opacity-70">{filterForDay(d).length} agend.</span>
            </button>
          ))}
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              status={col.id}
              label={col.label}
              color={col.color}
              bg={col.bg}
              appointments={filterByStatus(col.id).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())}
              clients={clients as Client[]}
              pets={allPets as Pet[]}
              services={services as Service[]}
              packages={packages as Package[]}
              onDelete={handleDelete}
              onWhatsapp={openConfirmacao}
              onPetPronto={openPetPronto}
              onEditService={setEditServicoAppt}
              onChangeStatus={handleStatusChange}
              onConfirm={handleConfirmPresence}
              editingApptId={editingApptId}
              editDate={editDate}
              editTime={editTime}
              onStartEditDate={startEditDate}
              onChangeEditDate={changeEditDate}
              onSaveEditDate={saveEditDate}
              onCancelEditDate={cancelEditDate}
              isPeriodo={isPeriodo}
            />
          ))}
        </div>
        <DragOverlay>
          {activeAppt && (
            <div className="shadow-2xl rotate-1 scale-105">
              <AppointmentCard
                appt={activeAppt}
                clients={clients as Client[]}
                pets={allPets as Pet[]}
                services={services as Service[]}
                packages={packages as Package[]}
                onDelete={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* ── Lembretes de amanhã ──────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors"
          onClick={() => setRemindersOpen(o => !o)}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-sm">Lembretes de amanhã</span>
            <span className="text-xs text-muted-foreground">{format(tomorrow, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
            {sortedTomorrowAppts.length > 0 && (
              <Badge variant="secondary" className="text-xs">{sortedTomorrowAppts.length - notifiedIds.size}/{sortedTomorrowAppts.length}</Badge>
            )}
          </div>
          {remindersOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {remindersOpen && (
          <div className="border-t">
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b flex-wrap">
              <Label className="text-xs whitespace-nowrap shrink-0">Template de lembrete:</Label>
              {reminderTemplates.length === 0 ? (
                <span className="text-xs text-amber-600">⚠️ Nenhum template de lembrete. Crie um na página <strong>Mensagens</strong>.</span>
              ) : (
                <Select value={reminderTemplateId} onValueChange={setReminderTemplateId}>
                  <SelectTrigger className="h-7 text-xs w-auto min-w-[200px]"><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                  <SelectContent>
                    {reminderTemplates.map(t => (<SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              )}
              {notifiedIds.size > 0 && (
                <span className="text-xs text-muted-foreground ml-auto">
                  <CheckCheck className="h-3.5 w-3.5 inline mr-1 text-green-600" />
                  {notifiedIds.size} notificado{notifiedIds.size !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {sortedTomorrowAppts.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Nenhum agendamento para amanhã 🎉</div>
            ) : (
              <div className="divide-y">
                {sortedTomorrowAppts.map(appt => {
                  const pet = (allPets as Pet[]).find(p => p.id === appt.petId);
                  const client = (clients as Client[]).find(c => c.id === appt.clientId);
                  const service = (services as Service[]).find(s => s.id === appt.serviceId);
                  const pkg = (packages as Package[]).find(p => p.id === appt.packageId);
                  const apptTime = new Date(appt.scheduledDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                  const isNotified = notifiedIds.has(appt.id);
                  return (
                    <div key={appt.id} className={`flex items-center gap-3 px-4 py-3 transition-all ${isNotified ? "opacity-40" : "hover:bg-accent/20"}`}>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground w-12 shrink-0">
                        <Clock className="h-3 w-3" />{apptTime}
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <PawPrint className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-semibold text-sm truncate">{pet?.name ?? "Pet"}</span>
                        {pet?.size && (<Badge variant="outline" className="text-xs px-1 py-0 shrink-0">{getPorteLabel(pet.size)}{pet.coat ? ` · ${getCoatLabel(pet.coat)}` : ""}</Badge>)}
                        <span className="text-xs text-muted-foreground truncate">· {client?.name ?? "Cliente"}</span>
                      </div>
                      <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[120px]">{service?.name ?? pkg?.name ?? ""}</span>
                      <span className="text-xs font-semibold text-primary shrink-0">{formatBRL(Number(appt.totalPrice))}</span>
                      {!client?.phone && (<span className="text-xs text-amber-600 shrink-0">sem telefone</span>)}
                      {isNotified ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-green-600 flex items-center gap-1"><CheckCheck className="h-3.5 w-3.5" />Enviado</span>
                          <button onClick={() => unmarkNotified(appt.id)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1">desfazer</button>
                        </div>
                      ) : (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5 h-7 text-xs shrink-0" onClick={() => sendReminder(appt)} disabled={!client?.phone || reminderTemplates.length === 0}>
                          <MessageSquare className="h-3.5 w-3.5" />Lembrete
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Gerenciar Serviços ─────────────────────────────────────── */}
      <GerenciarServicosModal
        appt={editServicoAppt}
        services={services as Service[]}
        pets={allPets as Pet[]}
        isSaving={updateAppointment.isPending}
        onSave={handleEditServicoSave}
        onClose={() => setEditServicoAppt(null)}
      />

      {/* ── Modal: Cancelamento ─────────────────────────────────────────────── */}
      <Dialog open={cancelDialogOpen} onOpenChange={v => { if (!v) { setCancelDialogOpen(false); setCancellingAppt(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              Cancelar Agendamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Haverá reagendamento para outra data?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setReschedMode("cancel")}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${reschedMode === "cancel" ? "bg-red-50 border-red-300 text-red-700" : "hover:bg-muted"}`}
              >
                Cancelar sem reagendar
              </button>
              <button
                onClick={() => setReschedMode("resched")}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${reschedMode === "resched" ? "bg-blue-50 border-blue-300 text-blue-700" : "hover:bg-muted"}`}
              >
                Reagendar
              </button>
            </div>
            {reschedMode === "resched" && (
              <div className="space-y-3 pt-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nova data e horário</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Data *</Label>
                    <Input type="date" value={reschedDate} onChange={e => setReschedDate(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">{isPeriodo ? "Período *" : "Horário *"}</Label>
                    {isPeriodo ? (
                      <Select
                        value={reschedTime >= "12:00" ? "tarde" : "manha"}
                        onValueChange={v => setReschedTime(v === "tarde" ? "14:00" : "08:00")}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manha">Manhã</SelectItem>
                          <SelectItem value="tarde">Tarde</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input type="time" value={reschedTime} onChange={e => setReschedTime(e.target.value)} className="h-8 text-sm" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCancelDialogOpen(false); setCancellingAppt(null); }}>Voltar</Button>
            <Button
              variant={reschedMode === "resched" ? "default" : "destructive"}
              onClick={handleCancelConfirm}
            >
              {reschedMode === "resched" ? "Confirmar Reagendamento" : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Confirmação / Pet Pronto / Agradecimento WhatsApp ─────── */}
      <ConfirmacaoWhatsAppModal
        appt={confirmacaoAppt}
        clients={clients as Client[]}
        pets={allPets as Pet[]}
        services={services as Service[]}
        packages={packages as Package[]}
        mode={confirmacaoMode}
        overridePrice={confirmacaoOverridePrice}
        overrideClient={confirmacaoOverrideClient}
        onClose={() => { setConfirmacaoAppt(null); setConfirmacaoOverrideClient(undefined); }}
        tenantId={tenantId!}
      />

      {/* ── Modal: Novo Agendamento ──────────────────────────────────────── */}
      <Dialog open={casualOpen} onOpenChange={open => { if (!open) setCasualOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Novo Agendamento
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-0 text-xs font-medium mb-1">
            {STEP_LABELS.map((lbl, i) => (
              <div key={i} className="flex items-center gap-0">
                <span className={`px-2 py-0.5 rounded-full text-xs ${i === casualStep ? "bg-primary text-primary-foreground" : i < casualStep ? "text-primary" : "text-muted-foreground"}`}>{lbl}</span>
                {i < STEP_LABELS.length - 1 && <span className="text-muted-foreground mx-0.5">›</span>}
              </div>
            ))}
          </div>
          <StepDots step={casualStep} total={3} />
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {casualStep === 0 && (
              <>
                {casualFoundClient ? (
                  <div className="rounded-lg border bg-green-50 border-green-200 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-0.5">Cliente encontrado</p>
                        <p className="font-semibold text-sm">{casualFoundClient.name}</p>
                        {casualFoundClient.phone && <p className="text-xs text-muted-foreground">{casualFoundClient.phone}</p>}
                      </div>
                      <button type="button" onClick={() => { setCasualFoundClient(null); setCasualSelectedPetId(""); setCasualSearchQuery(""); }} className="p-1 rounded hover:bg-green-100 text-green-700"><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label>Buscar cliente existente</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input className="pl-9" placeholder="Nome ou telefone..." value={casualSearchQuery} onChange={e => setCasualSearchQuery(e.target.value)} autoFocus />
                      </div>
                      {casualSearchResults.length > 0 && (
                        <div className="border rounded-md divide-y shadow-sm bg-white z-10">
                          {casualSearchResults.map(c => (
                            <button key={c.id} type="button" className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between gap-2" onClick={() => { setCasualFoundClient(c); setCasualSearchQuery(""); }}>
                              <span className="font-medium">{c.name}</span>
                              {c.phone && <span className="text-muted-foreground text-xs shrink-0">{c.phone}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      {casualSearchQuery.trim().length >= 2 && casualSearchResults.length === 0 && <p className="text-xs text-muted-foreground">Nenhum cliente encontrado. Preencha abaixo para cadastrar.</p>}
                    </div>
                    <div className="relative my-1">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">ou cadastrar novo</span></div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nome do cliente *</Label>
                      <Input placeholder="Ex: Maria Silva" value={casual.clientName} onChange={e => setCasual(f => ({ ...f, clientName: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telefone / WhatsApp *</Label>
                      <Input placeholder="Ex: 11 99999-0000" value={casual.clientPhone} onChange={e => setCasual(f => ({ ...f, clientPhone: e.target.value }))} />
                    </div>
                  </>
                )}
              </>
            )}
            {casualStep === 1 && (
              <>
                <div className="space-y-1.5"><Label>Nome do pet *</Label><Input placeholder="Ex: Thor" value={casual.petName} onChange={e => setCasual(f => ({ ...f, petName: e.target.value }))} autoFocus /></div>
                <div className="space-y-1.5"><Label>Raça</Label><Input placeholder="Ex: Labrador" value={casual.petBreed} onChange={e => setCasual(f => ({ ...f, petBreed: e.target.value }))} /></div>
                <div className="space-y-1.5">
                  <Label>Porte *</Label>
                  <Select value={casual.petSize} onValueChange={v => setCasual(f => ({ ...f, petSize: v, serviceId: "", totalPrice: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione o porte" /></SelectTrigger>
                    <SelectContent>{tenantPortes.map((val: string) => (<SelectItem key={val} value={val}>{getPorteLabel(val)}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Pelagem</Label>
                  <Select value={casual.petCoat} onValueChange={v => setCasual(f => ({ ...f, petCoat: v, serviceId: "", totalPrice: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione a pelagem" /></SelectTrigger>
                    <SelectContent>{tenantCoats.map((val: string) => (<SelectItem key={val} value={val}>{getCoatLabel(val)}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            {casualStep === 2 && (
              <>
                {casualFoundClient && (
                  <div className="space-y-1.5">
                    <Label>Pet *</Label>
                    <Select value={casualSelectedPetId} onValueChange={v => { setCasualSelectedPetId(v); if (v !== "new") { const pet = (casualClientPets as Pet[]).find(p => p.id === Number(v)); if (pet) setCasual(f => ({ ...f, petSize: pet.size, petCoat: pet.coat ?? "", serviceId: "", totalPrice: "" })); } else { setCasual(f => ({ ...f, petSize: "", petCoat: "", serviceId: "", totalPrice: "" })); } }}>
                      <SelectTrigger><SelectValue placeholder="Selecione o pet" /></SelectTrigger>
                      <SelectContent>
                        {(casualClientPets as Pet[]).map(p => (<SelectItem key={p.id} value={String(p.id)}>{p.name} — {getPorteLabel(p.size)}{p.coat ? ` · ${getCoatLabel(p.coat)}` : ""}</SelectItem>))}
                        <SelectItem value="new">+ Novo pet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(!casualFoundClient || casualSelectedPetId === "new") && (
                  <>
                    <div className="space-y-1.5"><Label>Nome do pet *</Label><Input placeholder="Ex: Thor" value={casual.petName} onChange={e => setCasual(f => ({ ...f, petName: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>Raça</Label><Input placeholder="Ex: Labrador" value={casual.petBreed} onChange={e => setCasual(f => ({ ...f, petBreed: e.target.value }))} /></div>
                    <div className="space-y-1.5">
                      <Label>Porte *</Label>
                      <Select value={casual.petSize} onValueChange={v => setCasual(f => ({ ...f, petSize: v, serviceId: "", totalPrice: "" }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione o porte" /></SelectTrigger>
                        <SelectContent>{tenantPortes.map((val: string) => (<SelectItem key={val} value={val}>{getPorteLabel(val)}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pelagem</Label>
                      <Select value={casual.petCoat} onValueChange={v => setCasual(f => ({ ...f, petCoat: v, serviceId: "", totalPrice: "" }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione a pelagem" /></SelectTrigger>
                        <SelectContent>{tenantCoats.map((val: string) => (<SelectItem key={val} value={val}>{getCoatLabel(val)}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label>Serviço *</Label>
                  <Select value={casual.serviceId} onValueChange={v => { const svc = (services as Service[]).find(s => s.id === Number(v)); setCasual(f => ({ ...f, serviceId: v, totalPrice: svc ? String(svc.price) : f.totalPrice })); }}>
                    <SelectTrigger><SelectValue placeholder={casual.petSize ? "Selecione o serviço" : "Selecione o porte primeiro"} /></SelectTrigger>
                    <SelectContent>
                      {casualFilteredServices.length === 0 && (<SelectItem value="_none" disabled>Nenhum serviço para este porte</SelectItem>)}
                      {casualFilteredServices.map(s => (<SelectItem key={s.id} value={String(s.id)}>{s.name} — {formatBRL(s.price)}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {casual.petSize && <p className="text-xs text-muted-foreground">Serviços filtrados: <span className="font-medium">{getPorteLabel(casual.petSize)}{casual.petCoat ? ` · ${getCoatLabel(casual.petCoat)}` : ""}</span></p>}
                </div>
                {casual.serviceId && (
                  <div className="space-y-1.5">
                    <Label>Serviços adicionais</Label>
                    {casual.extraServiceIds.map(id => {
                      const svc = (services as Service[]).find(s => s.id === id);
                      return (
                        <div key={id} className="flex items-center justify-between bg-muted/30 rounded px-2 py-1.5 text-xs">
                          <span>{svc?.name ?? `#${id}`}{svc ? ` — ${formatBRL(svc.price)}` : ""}</span>
                          <button onClick={() => { const updated = casual.extraServiceIds.filter(x => x !== id); const allSvcs = [Number(casual.serviceId), ...updated].map(sid => (services as Service[]).find(s => s.id === sid)); const total = allSvcs.reduce((sum, s) => sum + (s ? Number(s.price) : 0), 0); setCasual(f => ({ ...f, extraServiceIds: updated, totalPrice: total > 0 ? String(total) : f.totalPrice })); }} className="text-red-500 hover:text-red-700 ml-2"><X className="h-3 w-3" /></button>
                        </div>
                      );
                    })}
                    {casualExtraAvailable.length > 0 && (
                      <Select value="" onValueChange={v => { const updated = [...casual.extraServiceIds, Number(v)]; const allSvcs = [Number(casual.serviceId), ...updated].map(sid => (services as Service[]).find(s => s.id === sid)); const total = allSvcs.reduce((sum, s) => sum + (s ? Number(s.price) : 0), 0); setCasual(f => ({ ...f, extraServiceIds: updated, totalPrice: total > 0 ? String(total) : f.totalPrice })); }}>
                        <SelectTrigger className="h-8 text-xs border-dashed"><div className="flex items-center gap-1 text-muted-foreground"><Plus className="h-3 w-3" /> Adicionar serviço adicional</div></SelectTrigger>
                        <SelectContent>{casualExtraAvailable.map(s => (<SelectItem key={s.id} value={String(s.id)}>{s.name} — {formatBRL(s.price)}</SelectItem>))}</SelectContent>
                      </Select>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Data *</Label><Input type="date" value={casual.scheduledDate} onChange={e => setCasual(f => ({ ...f, scheduledDate: e.target.value }))} /></div>
                  {isPeriodo ? (
                    <div className="space-y-1.5">
                      <Label>Período *</Label>
                      <Select
                        value={casual.scheduledTime === "14:00" ? "tarde" : "manha"}
                        onValueChange={v => setCasual(f => ({ ...f, scheduledTime: v === "tarde" ? "14:00" : "08:00" }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manha">Manhã</SelectItem>
                          <SelectItem value="tarde">Tarde</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1.5"><Label>Horário *</Label><Input type="time" value={casual.scheduledTime} onChange={e => setCasual(f => ({ ...f, scheduledTime: e.target.value }))} /></div>
                  )}
                </div>
                <div className="space-y-1.5"><Label>Valor (R$) *</Label><Input type="number" step="0.01" min="0" placeholder="0,00" value={casual.totalPrice} onChange={e => setCasual(f => ({ ...f, totalPrice: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Observações</Label><Textarea placeholder="Observações adicionais" value={casual.notes} onChange={e => setCasual(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            {casualStep > 0 && (<Button variant="outline" onClick={casualPrevStep}>Voltar</Button>)}
            <Button variant="outline" onClick={() => setCasualOpen(false)}>Cancelar</Button>
            {casualStep < 2 ? (
              <Button onClick={casualNextStep}>Próximo <ArrowNext className="h-4 w-4 ml-1" /></Button>
            ) : (
              <Button onClick={handleCasualSave} disabled={isCasualSaving}>{isCasualSaving ? "Salvando..." : "Confirmar Agendamento"}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Vender Pacote ──────────────────────────────────────────── */}
      <Dialog open={sellOpen} onOpenChange={open => { if (!open) setSellOpen(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Vender Pacote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Pacote *</Label>
              <Select value={sell.packageId} onValueChange={v => setSell(f => ({ ...f, packageId: v, petId: "" }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o pacote" /></SelectTrigger>
                <SelectContent>
                  {(packages as Package[]).map(p => { const prices = p.priceBySizes.map(x => x.price).filter(x => x > 0); const min = prices.length ? Math.min(...prices) : 0; const max = prices.length ? Math.max(...prices) : 0; const range = min === max ? formatBRL(min) : `${formatBRL(min)} – ${formatBRL(max)}`; return (<SelectItem key={p.id} value={String(p.id)}>{p.name} ({range})</SelectItem>); })}
                </SelectContent>
              </Select>
              {selectedPkg && (() => {
                const pkgSessions = (selectedPkg as any).sessions as Array<{ label: string; serviceNames: string[] }> | null | undefined;
                return (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {pkgSessions?.length
                      ? <Badge variant="secondary" className="text-xs">{pkgSessions.length} sessão{pkgSessions.length !== 1 ? "ões" : ""} semanal{pkgSessions.length !== 1 ? "is" : ""}</Badge>
                      : selectedPkg.serviceItems.map((item, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{item.quantity}× {item.serviceName}</Badge>
                        ))
                    }
                  </div>
                );
              })()}
            </div>
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              {sell.clientId ? (
                <div className="rounded-lg border bg-green-50 border-green-200 p-2.5 flex items-center justify-between">
                  <span className="font-semibold text-sm">{(clients as Client[]).find(c => c.id === Number(sell.clientId))?.name ?? "—"}</span>
                  <button type="button" onClick={() => { setSell(f => ({ ...f, clientId: "", petId: "" })); setSellClientSearch(""); }} className="p-1 rounded hover:bg-green-100 text-green-700"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por nome..."
                    value={sellClientSearch}
                    onChange={e => setSellClientSearch(e.target.value)}
                    autoFocus
                  />
                  {sellClientSearch.trim().length >= 1 && (() => {
                    const q = sellClientSearch.trim().toLowerCase();
                    const results = (clients as Client[]).filter(c => c.name.toLowerCase().includes(q));
                    return results.length > 0 ? (
                      <div className="absolute z-10 w-full mt-1 border rounded-md shadow-sm bg-white divide-y max-h-48 overflow-y-auto">
                        {results.map(c => (
                          <button key={c.id} type="button" className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between gap-2" onClick={() => { setSell(f => ({ ...f, clientId: String(c.id), petId: "" })); setSellClientSearch(""); }}>
                            <span className="font-medium">{c.name}</span>
                            {c.phone && <span className="text-muted-foreground text-xs shrink-0">{c.phone}</span>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">Nenhum cliente encontrado.</p>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Pet *</Label>
              <Select value={sell.petId} onValueChange={v => setSell(f => ({ ...f, petId: v }))} disabled={!sell.clientId}>
                <SelectTrigger><SelectValue placeholder={sell.clientId ? "Selecione o pet" : "Selecione um cliente primeiro"} /></SelectTrigger>
                <SelectContent>{(sellClientPets as Pet[]).map(p => (<SelectItem key={p.id} value={String(p.id)}>{p.name} — {getPorteLabel(p.size)}{p.coat ? ` · ${getCoatLabel(p.coat)}` : ""}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {sell.petId && sell.packageId && (
              <div className="rounded-lg bg-muted/40 border px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor do pacote</span>
                {priceForPet !== null ? (<span className="text-lg font-bold text-primary">{formatBRL(priceForPet)}</span>) : (<span className="text-sm text-amber-600">Sem preço para este porte</span>)}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Data do 1º agend. *</Label><Input type="date" value={sell.startDate} onChange={e => setSell(f => ({ ...f, startDate: e.target.value }))} /></div>
              {isPeriodo ? (
                <div className="space-y-1.5">
                  <Label>Período *</Label>
                  <Select
                    value={sell.startTime === "14:00" ? "tarde" : "manha"}
                    onValueChange={v => setSell(f => ({ ...f, startTime: v === "tarde" ? "14:00" : "08:00" }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manha">Manhã</SelectItem>
                      <SelectItem value="tarde">Tarde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5"><Label>Horário *</Label><Input type="time" value={sell.startTime} onChange={e => setSell(f => ({ ...f, startTime: e.target.value }))} /></div>
              )}
            </div>
            {sellSessions.length > 0 && sell.startDate && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><CalendarCheck className="h-3.5 w-3.5" />Agendamentos que serão criados</p>
                <div className="rounded-lg border divide-y text-sm">
                  {sellSessions.map((s, i) => { const d = new Date(`${sell.startDate}T${sell.startTime}`); d.setDate(d.getDate() + i * 7); return (<div key={s.index} className="flex items-center justify-between px-3 py-2"><span className="text-muted-foreground text-xs">{d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} às {sell.startTime}</span><div className="text-right max-w-[50%]"><span className={`text-xs block truncate ${s.hasExtra ? "font-medium text-primary" : ""}`}>{s.serviceNames.join(" + ")}</span><span className="text-[11px] text-muted-foreground/60">{s.label}</span></div></div>); })}
                </div>
              </div>
            )}
            <div className="space-y-1.5"><Label>Observações</Label><Textarea placeholder="Observações para todos os agendamentos" value={sell.notes} onChange={e => setSell(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded"
                checked={sell.paidNow}
                onChange={e => setSell(f => ({ ...f, paidNow: e.target.checked }))}
              />
              <span className="text-sm">Pago agora — registrar pagamento imediatamente</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSellOpen(false)}>Cancelar</Button>
            <Button onClick={handleSellSave} disabled={sellPackage.isPending} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              {sellPackage.isPending ? "Criando..." : sellSessions.length > 0 ? `Confirmar Venda (${sellSessions.length} agend.)` : "Confirmar Venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
