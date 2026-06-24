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
  useGetTenant, useGetDashboard,
} from "@workspace/api-client-react";
import type {
  Client, Pet, Service, Package, SellPackageResult, PetInputSize, MessageTemplate, AppointmentFull,
} from "@workspace/api-client-react";
import { PORTE_SIZES } from "@/lib/constants";
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
  ChevronRight as ArrowNext, Search, X,
  Bell, CheckCheck, Pencil, Scissors, Plus,
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type AppStatus = "aguardando" | "em_atendimento" | "pet_pronto" | "concluido" | "cancelado";

function appointmentFromFull(af: AppointmentFull): Appointment {
  return {
    id: af.id,
    petId: af.petId,
    clientId: af.clientId,
    serviceId: af.serviceId,
    packageId: af.packageId,
    extraServiceIds: af.extraServiceIds ?? null,
    scheduledDate: af.scheduledDate,
    status: af.status as AppStatus,
    totalPrice: af.totalPrice,
    notes: af.notes,
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
};

const COLUMNS: { id: AppStatus; label: string; color: string; bg: string }[] = [
  { id: "aguardando", label: "Aguardando", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  { id: "em_atendimento", label: "Em Atendimento", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  { id: "pet_pronto", label: "Pet Pronto", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  { id: "concluido", label: "Concluído", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  { id: "cancelado", label: "Cancelado", color: "text-red-700", bg: "bg-red-50 border-red-200" },
];

const statusColors: Record<string, string> = {
  aguardando: "bg-yellow-100 text-yellow-800",
  em_atendimento: "bg-blue-100 text-blue-800",
  pet_pronto: "bg-purple-100 text-purple-800",
  concluido: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  aguardando: "Aguardando",
  em_atendimento: "Em Atendimento",
  pet_pronto: "Pet Pronto",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── AppointmentCard ──────────────────────────────────────────────────────────

function AppointmentCard({ appt, clients, pets, services, packages, onDelete, onPetPronto, onEditService, onChangeStatus, isDragging = false, isEditingDate, editDate, editTime, onStartEditDate, onChangeEditDate, onSaveEditDate, onCancelEditDate, isPeriodo = false }: {
  appt: Appointment;
  clients: Client[];
  pets: Pet[];
  services: Service[];
  packages: Package[];
  onDelete: (id: number) => void;
  onPetPronto?: (appt: Appointment) => void;
  onEditService?: (appt: Appointment) => void;
  onChangeStatus?: (appt: Appointment, newStatus: AppStatus) => void;
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
  const pet = pets.find(p => p.id === appt.petId);
  const client = clients.find(c => c.id === appt.clientId);
  const service = services.find(s => s.id === appt.serviceId);
  const pkg = packages.find(p => p.id === appt.packageId);
  const scheduledHour = new Date(appt.scheduledDate).getHours();
  const periodLabel = scheduledHour < 12 ? "Manhã" : "Tarde";
  const time = new Date(appt.scheduledDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = new Date(appt.scheduledDate).toISOString().substring(0, 10);

  return (
    <div className="bg-white rounded-lg border shadow-sm p-3 cursor-grab active:cursor-grabbing select-none hover:shadow-md transition-shadow pl-[5px] pr-[5px] pt-[5px] pb-[5px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <PawPrint className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-semibold text-sm truncate">{pet?.name ?? "Pet"}</span>
            {pet?.size && <Badge variant="secondary" className="text-xs px-1 py-0">{PORTE_SIZES[pet.size] ?? pet.size}</Badge>}
            {isPeriodo && <Badge variant="outline" className="text-xs px-1 py-0 text-amber-700 border-amber-300">{periodLabel}</Badge>}
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
      {(isEditingDate || !isPeriodo) && (
        <div className="flex items-center mt-2 pt-2 border-t border-dashed">
          {isEditingDate ? (
            <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
              <Input type="date" value={editDate ?? dateStr} onChange={e => onChangeEditDate?.(e.target.value, editTime ?? time)} className="h-6 text-[10px] px-1 py-0 w-[110px]" />
              {!isPeriodo && <Input type="time" value={editTime ?? time} onChange={e => onChangeEditDate?.(editDate ?? dateStr, e.target.value)} className="h-6 text-[10px] px-1 py-0 w-[70px]" />}
              <button onClick={e => { e.stopPropagation(); onSaveEditDate?.(); }} className="p-0.5 rounded hover:bg-green-50 text-green-600" title="Salvar"><CalendarCheck className="h-3 w-3" /></button>
              <button onClick={e => { e.stopPropagation(); onCancelEditDate?.(); }} className="p-0.5 rounded hover:bg-red-50 text-red-500" title="Cancelar"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <button onClick={e => { e.stopPropagation(); onStartEditDate?.(); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors" title="Editar data/hora">
              <Clock className="h-3 w-3" />{time}
            </button>
          )}
        </div>
      )}
      {onChangeStatus && appt.status !== "concluido" && appt.status !== "cancelado" && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-dashed" onClick={e => e.stopPropagation()}>
          {appt.status === "aguardando" && (
            <button onClick={e => { e.stopPropagation(); onChangeStatus(appt, "em_atendimento"); }} className="flex-1 flex items-center justify-center gap-1 text-xs py-1 px-2 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
              <ChevronRight className="h-3 w-3" /> Em Atendimento
            </button>
          )}
          {appt.status === "em_atendimento" && (
            <>
              <button onClick={e => { e.stopPropagation(); onPetPronto?.(appt); }} className="flex items-center justify-center gap-1 text-xs py-1 px-2 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
                <MessageSquare className="h-3 w-3" /> Pet pronto
              </button>
              <button onClick={e => { e.stopPropagation(); onChangeStatus(appt, "concluido"); }} className="flex-1 flex items-center justify-center gap-1 text-xs py-1 px-2 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                <CheckCheck className="h-3 w-3" /> Concluído
              </button>
            </>
          )}
          {appt.status === "pet_pronto" && (
            <button onClick={e => { e.stopPropagation(); onChangeStatus(appt, "concluido"); }} className="flex-1 flex items-center justify-center gap-1 text-xs py-1 px-2 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
              <CheckCheck className="h-3 w-3" /> Concluído
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onChangeStatus(appt, "cancelado"); }} className="flex items-center justify-center gap-1 text-xs py-1 px-2 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
            <X className="h-3 w-3" /> Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── DraggableCard ────────────────────────────────────────────────────────────

function DraggableCard({ appt, clients, pets, services, packages, onDelete, onPetPronto, onEditService, onChangeStatus, isEditingDate, editDate, editTime, onStartEditDate, onChangeEditDate, onSaveEditDate, onCancelEditDate, isPeriodo }: {
  appt: Appointment;
  clients: Client[];
  pets: Pet[];
  services: Service[];
  packages: Package[];
  onDelete: (id: number) => void;
  onPetPronto?: (appt: Appointment) => void;
  onEditService?: (appt: Appointment) => void;
  onChangeStatus?: (appt: Appointment, newStatus: AppStatus) => void;
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
      <AppointmentCard appt={appt} clients={clients} pets={pets} services={services} packages={packages} onDelete={onDelete} onPetPronto={onPetPronto} onEditService={onEditService} onChangeStatus={onChangeStatus} isDragging={isDragging} isEditingDate={isEditingDate} editDate={editDate} editTime={editTime} onStartEditDate={onStartEditDate} onChangeEditDate={onChangeEditDate} onSaveEditDate={onSaveEditDate} onCancelEditDate={onCancelEditDate} isPeriodo={isPeriodo} />
    </div>
  );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

function KanbanColumn({ status, label, color, bg, appointments, clients, pets, services, packages, onDelete, onPetPronto, onEditService, onChangeStatus, editingApptId, editDate, editTime, onStartEditDate, onChangeEditDate, onSaveEditDate, onCancelEditDate, isPeriodo }: {
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
  onPetPronto: (appt: Appointment) => void;
  onEditService: (appt: Appointment) => void;
  onChangeStatus: (appt: Appointment, newStatus: AppStatus) => void;
  editingApptId: number | null;
  editDate: string;
  editTime: string;
  onStartEditDate: (appt: Appointment) => void;
  onChangeEditDate: (date: string, time: string) => void;
  onSaveEditDate: (appt: Appointment) => void;
  onCancelEditDate: () => void;
  isPeriodo?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className={`flex flex-col rounded-xl border-2 ${bg} ${isOver ? "ring-2 ring-primary ring-offset-1" : ""} transition-all min-h-[200px]`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-current/10">
        <span className={`font-semibold text-sm ${color}`}>{label}</span>
        <Badge variant="secondary" className="text-xs">{appointments.length}</Badge>
      </div>
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2 overflow-y-auto">
        {appointments.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">Nenhum agendamento</div>
        )}
        {appointments.map(appt => (
          <DraggableCard key={appt.id} appt={appt} clients={clients} pets={pets} services={services} packages={packages} onDelete={onDelete} onPetPronto={onPetPronto} onEditService={onEditService} onChangeStatus={onChangeStatus} isEditingDate={editingApptId === appt.id} editDate={editDate} editTime={editTime} onStartEditDate={() => onStartEditDate(appt)} onChangeEditDate={onChangeEditDate} onSaveEditDate={() => onSaveEditDate(appt)} onCancelEditDate={onCancelEditDate} isPeriodo={isPeriodo} />
        ))}
      </div>
    </div>
  );
}

// ─── GerenciarServicosModal ───────────────────────────────────────────────────

function GerenciarServicosModal({ appt, services, pets, isSaving, onSave, onClose }: {
  appt: Appointment | null;
  services: Service[];
  pets: Pet[];
  isSaving: boolean;
  onSave: (serviceId: number | undefined, extraServiceIds: number[], totalPrice: number, notes: string) => void;
  onClose: () => void;
}) {
  const pet = appt ? pets.find(p => p.id === appt.petId) : null;
  const filteredServices = pet?.size ? services.filter(s => s.size === pet.size) : services;
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
    setNewExtraId(""); setAddingExtra(false);
  };

  const removeExtra = (id: number) => {
    const updated = extraServiceIds.filter(x => x !== id);
    setExtraServiceIds(updated);
    const autoPrice = calcAutoPrice(primaryServiceId, updated);
    if (autoPrice) setPrice(autoPrice);
  };

  const availableForExtra = filteredServices.filter(s => s.id !== Number(primaryServiceId) && !extraServiceIds.includes(s.id));

  return (
    <Dialog open={!!appt} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Scissors className="h-4 w-4 text-primary" />Gerenciar Serviços</DialogTitle>
        </DialogHeader>
        {appt && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg text-sm">
              <PawPrint className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium">{pet?.name ?? "Pet"}</span>
              {pet?.size && <span className="text-xs text-muted-foreground">({PORTE_SIZES[pet.size] ?? pet.size})</span>}
            </div>
            <div>
              <Label className="text-xs">Serviço principal</Label>
              <Select value={primaryServiceId} onValueChange={handlePrimaryChange}>
                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
                <SelectContent>
                  {filteredServices.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} — {formatBRL(s.price)}</SelectItem>)}
                  {filteredServices.length === 0 && <SelectItem value="_none" disabled>Nenhum serviço para este porte</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {extraServiceIds.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Serviços adicionais</Label>
                {extraServiceIds.map(id => {
                  const svc = services.find(s => s.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between bg-muted/30 rounded px-2 py-1.5 text-xs">
                      <span>{svc?.name ?? `#${id}`}{svc ? ` — ${formatBRL(svc.price)}` : ""}</span>
                      <button onClick={() => removeExtra(id)} className="text-red-500 hover:text-red-700 ml-2"><X className="h-3 w-3" /></button>
                    </div>
                  );
                })}
              </div>
            )}
            {addingExtra ? (
              <div className="flex gap-2 items-center">
                <Select value={newExtraId} onValueChange={setNewExtraId}>
                  <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Selecione serviço adicional" /></SelectTrigger>
                  <SelectContent>
                    {availableForExtra.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} — {formatBRL(s.price)}</SelectItem>)}
                    {availableForExtra.length === 0 && <SelectItem value="_none" disabled>Nenhum serviço disponível</SelectItem>}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={addExtra} disabled={!newExtraId} className="h-8">OK</Button>
                <button onClick={() => { setAddingExtra(false); setNewExtraId(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
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
          <Button size="sm" disabled={isSaving || !price || Number(price) <= 0} onClick={() => onSave(primaryServiceId ? Number(primaryServiceId) : undefined, extraServiceIds, Number(price), notes)}>
            {isSaving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ConfirmacaoWhatsAppModal ─────────────────────────────────────────────────

type ConfirmacaoMode = "agradecimento" | "conclusao" | "pet_pronto";

function ConfirmacaoWhatsAppModal({ appt, clients, pets, services, packages, mode = "conclusao", overridePrice, overrideClient, onClose, tenantId }: {
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
  const [templateId, setTemplateId] = useState("default");
  useEffect(() => { setTemplateId("default"); }, [appt?.id, mode]);

  const pet = appt ? pets.find(p => p.id === appt.petId) : null;
  const client = overrideClient ?? (appt ? clients.find(c => c.id === appt.clientId) : null);
  const service = appt ? services.find(s => s.id === appt.serviceId) : null;
  const pkg = appt ? packages.find(p => p.id === appt.packageId) : null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const clientApptParams = appt ? { tenantId: tenantId!, clientId: appt.clientId, startDate: todayStart.toISOString() } : undefined;
  const { data: clientAppts = [] } = useListAppointments(clientApptParams, { query: { queryKey: getListAppointmentsQueryKey(clientApptParams), enabled: !!appt } });
  const tmplParams = { tenantId: tenantId! };
  const { data: msgTemplates = [] } = useListMessageTemplates(tmplParams, { query: { queryKey: getListMessageTemplatesQueryKey(tmplParams), enabled: !!appt } });

  const templateType = mode === "pet_pronto" ? "pet_pronto" : (mode === "agradecimento" || mode === "conclusao") ? "agradecimento" : "confirmacao";
  const filteredTemplates = (msgTemplates as MessageTemplate[]).filter(t => t.type === templateType);

  const buildMessage = (): string => {
    if (!appt || !client) return "";
    const apptTime = new Date(appt.scheduledDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const apptDate = format(new Date(appt.scheduledDate), "dd/MM/yyyy");
    const extraNames = (appt.extraServiceIds ?? []).map(id => services.find(s => s.id === id)?.name).filter(Boolean) as string[];
    const serviceName = [service?.name ?? pkg?.name ?? "Serviço", ...extraNames].join(" + ");
    const price = formatBRL(overridePrice !== undefined ? overridePrice : Number(appt.totalPrice));

    const allAppts = (clientAppts as Appointment[]).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    const now = new Date();
    const datesForList = mode === "agradecimento"
      ? allAppts.filter(a => new Date(a.scheduledDate) >= now)
      : allAppts.filter(a => a.id !== appt.id && new Date(a.scheduledDate) > now);
    const datasStr = datesForList.length > 0
      ? datesForList.map(a => `📅 ${format(new Date(a.scheduledDate), "dd/MM/yyyy 'às' HH:mm")}`).join("\n")
      : apptDate + " às " + apptTime;

    const selectedTmpl = templateId !== "default" ? filteredTemplates.find(t => String(t.id) === templateId) : null;
    const defaultContent = mode === "pet_pronto"
      ? `Olá {nome_cliente}! 🐾\n\nO(a) {nome_pet} já está prontinho(a) para ser buscado!\n\nPassamos aqui para avisar que o serviço foi concluído. Pode vir buscar quando quiser! 😊`
      : mode === "agradecimento"
        ? `Olá {nome_cliente}! Obrigado por agendar com a gente! 🐾\n\n{nome_pet} está agendado nas seguintes datas:\n{datas}\n\nServiço: {servico}\nValor: {preco}\n\nQualquer dúvida, estamos à disposição!`
        : `Olá {nome_cliente}! Obrigado pela visita de {nome_pet} hoje! 🐾✨\n\nEsperamos que tenham gostado do serviço. Até a próxima! 😊`;

    const baseContent = selectedTmpl?.content ?? defaultContent;
    let msg = baseContent
      .replace(/\{nome_cliente\}/g, client.name)
      .replace(/\{nome_pet\}/g, pet?.name ?? "")
      .replace(/\{data\}/g, apptDate)
      .replace(/\{horario\}/g, apptTime)
      .replace(/\{servico\}/g, serviceName)
      .replace(/\{preco\}/g, price)
      .replace(/\{datas\}/g, datasStr);

    if (mode === "conclusao" && !baseContent.includes("{datas}") && datesForList.length > 0) {
      const datesList = datesForList.map(a => `📅 ${format(new Date(a.scheduledDate), "dd/MM/yyyy 'às' HH:mm")}`).join("\n");
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

  const modalTitle = mode === "pet_pronto" ? "🐾 Pet Pronto!" : mode === "agradecimento" ? "Agradecimento via WhatsApp" : mode === "conclusao" ? "Agradecimento após Atendimento" : "Confirmação de Presença via WhatsApp";
  const templateLabel = mode === "pet_pronto" ? "Template de aviso:" : mode === "agradecimento" ? "Template de agradecimento:" : "Template de conclusão:";

  if (!appt) return null;
  return (
    <Dialog open={!!appt} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{modalTitle}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg text-sm">
            <PawPrint className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium">{pet?.name ?? "Pet"}</span>
            <span className="text-xs text-muted-foreground">· {client?.name ?? "Cliente"}</span>
          </div>
          <div>
            <Label className="text-xs">{templateLabel}</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Mensagem padrão</SelectItem>
                {filteredTemplates.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Pré-visualização da mensagem</Label>
            <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-lg text-xs whitespace-pre-wrap font-mono text-green-900 max-h-40 overflow-y-auto">
              {buildMessage() || <span className="text-muted-foreground italic">Sem dados suficientes</span>}
            </div>
          </div>
          {!client?.phone && <p className="text-xs text-amber-600">⚠️ Cliente sem telefone cadastrado</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={handleSend} disabled={!client?.phone}>
            <MessageSquare className="h-4 w-4" /> Enviar WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── emptyCasual / emptySell / StepDots ───────────────────────────────────────

const emptyCasual = {
  clientName: "", clientPhone: "", petName: "", petBreed: "",
  petSize: "" as PetInputSize | "",
  serviceId: "", extraServiceIds: [] as number[],
  scheduledDate: new Date().toISOString().substring(0, 10),
  scheduledTime: "09:00", totalPrice: "", notes: "",
};

const emptySell = {
  packageId: "", clientId: "", petId: "",
  startDate: new Date().toISOString().substring(0, 10),
  startTime: "09:00", notes: "",
};

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? "bg-primary flex-1" : "bg-muted flex-[0.4]"}`} />
      ))}
    </div>
  );
}

// ─── Main Dashboard component ─────────────────────────────────────────────────

export default function Dashboard() {
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

  const [confirmacaoAppt, setConfirmacaoAppt] = useState<Appointment | null>(null);
  const [confirmacaoMode, setConfirmacaoMode] = useState<ConfirmacaoMode>("conclusao");
  const [confirmacaoOverridePrice, setConfirmacaoOverridePrice] = useState<number | undefined>(undefined);
  const [confirmacaoOverrideClient, setConfirmacaoOverrideClient] = useState<Pick<Client, "id" | "name" | "phone"> | undefined>(undefined);

  const [pendingPetProntoAppt, setPendingPetProntoAppt] = useState<Appointment | null>(null);

  const openConfirmacao = (appt: Appointment) => {
    setConfirmacaoMode("conclusao");
    setConfirmacaoOverridePrice(undefined);
    setConfirmacaoAppt(appt);
  };

  const openPetPronto = useCallback((appt: Appointment) => {
    setPendingPetProntoAppt(appt);
    setConfirmacaoMode("pet_pronto");
    setConfirmacaoOverridePrice(undefined);
    setConfirmacaoAppt(appt);
  }, []);

  const handleConfirmacaoClose = () => {
    const pending = pendingPetProntoAppt;
    setConfirmacaoAppt(null);
    setConfirmacaoOverrideClient(undefined);
    setPendingPetProntoAppt(null);
    if (pending) {
      handleStatusChange(pending, "pet_pronto");
    }
  };

  const tomorrow = addDays(new Date(), 1);
  const tomorrowKey = format(tomorrow, "yyyy-MM-dd");
  const [reminderTemplateId, setReminderTemplateId] = useState<string>("default");
  const [notifiedIds, setNotifiedIds] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(`reminders_notified_${tomorrowKey}`);
      return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
    } catch { return new Set<number>(); }
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  const tomorrowEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59);
  const { data: tomorrowAppts = [] } = useListAppointments({ tenantId: tenantId!, startDate: tomorrowStart.toISOString(), endDate: tomorrowEnd.toISOString() });
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

  const { data: dashboardData } = useGetDashboard({ tenantId: tenantId! });

  const { data: tenantData } = useGetTenant(tenantId!);
  const schedulingMethod = (tenantData as any)?.schedulingMethod ?? "hora";
  const isPeriodo = schedulingMethod === "periodo";

  const { data: clients = [] } = useListClients({ tenantId: tenantId! });
  const { data: allPets = [] } = useListPets({});
  const { data: services = [] } = useListServices({ tenantId: tenantId! });
  const { data: packages = [] } = useListPackages({ tenantId: tenantId! });

  const sellPetParams = sell.clientId ? { clientId: Number(sell.clientId) } : undefined;
  const { data: sellClientPets = [] } = useListPets(sellPetParams, { query: { queryKey: getListPetsQueryKey(sellPetParams), enabled: !!sell.clientId } });

  const casualClientPetParams = casualFoundClient ? { clientId: casualFoundClient.id } : undefined;
  const { data: casualClientPets = [], isFetched: casualClientPetsFetched } = useListPets(casualClientPetParams, { query: { queryKey: getListPetsQueryKey(casualClientPetParams), enabled: !!casualFoundClient } });

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
  const changeEditDate = (date: string, time: string) => { setEditDate(date); setEditTime(time); };
  const saveEditDate = async (appt: Appointment) => {
    if (!editDate || !editTime) return;
    const dt = new Date(`${editDate}T${editTime}:00`);
    try {
      await updateAppointment.mutateAsync({ id: appt.id, data: { scheduledDate: dt.toISOString() } });
      toast({ title: "Data/hora atualizada!" });
      setEditingApptId(null);
      refetch();
    } catch { toast({ title: "Erro ao atualizar data", variant: "destructive" }); }
  };
  const cancelEditDate = () => { setEditingApptId(null); setEditDate(""); setEditTime(""); };

  const casualFilteredServices = casual.petSize ? (services as Service[]).filter(s => s.size === casual.petSize) : (services as Service[]);
  const casualExtraAvailable = casualFilteredServices.filter(s => s.id !== Number(casual.serviceId) && !casual.extraServiceIds.includes(s.id));

  const selectedPkg = (packages as Package[]).find(p => p.id === Number(sell.packageId));
  const sellPet = (sellClientPets as Pet[]).find(p => p.id === Number(sell.petId));
  const sellPetSize = sellPet?.size;
  const priceForPet = sellPetSize && selectedPkg ? (selectedPkg.priceBySizes.find(p => p.size === sellPetSize)?.price ?? null) : null;

  const sellSessions = (() => {
    if (!selectedPkg) return [];
    const items = [...(selectedPkg.serviceItems ?? [])].sort((a, b) => b.quantity - a.quantity);
    const main = items[0];
    const extras = items.slice(1);
    if (!main) return [];
    return Array.from({ length: main.quantity }, (_, i) => ({
      index: i + 1,
      label: i === main.quantity - 1 && extras.length > 0 ? `${main.serviceName} + ${extras.map(e => e.serviceName).join(" + ")}` : main.serviceName,
      hasExtra: i === main.quantity - 1 && extras.length > 0,
    }));
  })();

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as number);

  const handleStatusChange = useCallback(async (appt: Appointment, newStatus: AppStatus) => {
    if (appt.status === newStatus) return;
    try {
      await updateStatus.mutateAsync({ id: appt.id, data: { status: newStatus } });
      refetch();
      if (newStatus === "concluido") openConfirmacao(appt);
    } catch { toast({ title: "Erro ao atualizar status", variant: "destructive" }); }
  }, [updateStatus, refetch, toast]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as AppStatus;
    const appt = (appointments as Appointment[]).find(a => a.id === active.id);
    if (!appt) return;
    if (newStatus === "pet_pronto") {
      openPetPronto(appt);
      return;
    }
    await handleStatusChange(appt, newStatus);
  }, [appointments, handleStatusChange, openPetPronto]);

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este agendamento?")) return;
    await deleteAppointment.mutateAsync({ id });
    refetch();
  };

  const openCasual = () => { setCasual(emptyCasual); setCasualStep(0); setCasualFoundClient(null); setCasualSearchQuery(""); setCasualSelectedPetId(""); setCasualOpen(true); };
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
  const casualPrevStep = () => { if (casualStep === 2 && casualFoundClient) { setCasualStep(0); } else { setCasualStep(s => s - 1); } };

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
          const newPet: Pet = await createPet.mutateAsync({ data: { clientId: resolvedClientId, name: casual.petName.trim(), breed: casual.petBreed.trim() || undefined, size: casual.petSize } });
          resolvedPetId = newPet.id;
        }
      } else {
        const newClient: Client = await createClient.mutateAsync({ data: { tenantId: tenantId!, name: casual.clientName.trim(), phone: casual.clientPhone.trim() } });
        resolvedClientId = newClient.id;
        setConfirmacaoOverrideClient({ id: newClient.id, name: newClient.name, phone: newClient.phone });
        const newPet: Pet = await createPet.mutateAsync({ data: { clientId: resolvedClientId, name: casual.petName.trim(), breed: casual.petBreed.trim() || undefined, size: casual.petSize } });
        resolvedPetId = newPet.id;
      }
      const dt = new Date(`${casual.scheduledDate}T${casual.scheduledTime}:00`);
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
      const result: SellPackageResult = await sellPackage.mutateAsync({ id: Number(sell.packageId), data: { tenantId: tenantId!, clientId: Number(sell.clientId), petId: Number(sell.petId), startDate: sell.startDate, startTime: sell.startTime, notes: sell.notes || null } });
      const count = result.appointments.length;
      const price = result.financialEntry.amount;
      toast({ title: "Pacote vendido com sucesso!", description: `${count} agendamento${count !== 1 ? "s" : ""} criado${count !== 1 ? "s" : ""} · Receita: ${formatBRL(price)}` });
      setSellOpen(false);
      refetch();
      const firstSell = result.appointments[0];
      if (firstSell) { setConfirmacaoMode("agradecimento"); setConfirmacaoOverridePrice(result.financialEntry.amount); setConfirmacaoAppt(appointmentFromFull(firstSell)); }
    } catch { toast({ title: "Erro ao vender pacote", variant: "destructive" }); }
  };

  const handleEditServicoSave = async (serviceId: number | undefined, extraServiceIds: number[], totalPrice: number, notes: string) => {
    if (!editServicoAppt) return;
    try {
      await updateAppointment.mutateAsync({ id: editServicoAppt.id, data: { serviceId, extraServiceIds: extraServiceIds.length > 0 ? extraServiceIds : undefined, totalPrice, notes: notes || undefined } });
      setEditServicoAppt(null);
      refetch();
      toast({ title: "Agendamento atualizado!" });
    } catch { toast({ title: "Erro ao atualizar agendamento", variant: "destructive" }); }
  };

  const markNotified = (apptId: number) => {
    setNotifiedIds(prev => {
      const next = new Set(prev);
      next.add(apptId);
      try { localStorage.setItem(`reminders_notified_${tomorrowKey}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const unmarkNotified = (apptId: number) => {
    setNotifiedIds(prev => {
      const next = new Set(prev);
      next.delete(apptId);
      try { localStorage.setItem(`reminders_notified_${tomorrowKey}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const fillReminderTemplate = (appt: Appointment): string => {
    const pet = (allPets as Pet[]).find(p => p.id === appt.petId);
    const client = (clients as Client[]).find(c => c.id === appt.clientId);
    const service = (services as Service[]).find(s => s.id === appt.serviceId);
    const pkg = (packages as Package[]).find(p => p.id === appt.packageId);
    const apptTime = new Date(appt.scheduledDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const apptDate = format(tomorrow, "dd/MM/yyyy");
    const serviceName = service?.name ?? pkg?.name ?? "Serviço";
    const selectedTmpl = reminderTemplateId !== "default" ? reminderTemplates.find(t => String(t.id) === reminderTemplateId) : null;
    const content = selectedTmpl?.content ?? `Olá {nome_cliente}! Lembramos que {nome_pet} tem agendamento amanhã, dia {data}${!isPeriodo ? " às {horario}" : ""}. Serviço: {servico}. Aguardamos vocês! 🐾`;
    return content
      .replace(/\{nome_cliente\}/g, client?.name ?? "").replace(/\{nome_pet\}/g, pet?.name ?? "")
      .replace(/\{data\}/g, apptDate).replace(/\{horario\}/g, apptTime)
      .replace(/\{servico\}/g, serviceName).replace(/\{preco\}/g, formatBRL(Number(appt.totalPrice)));
  };

  const sendReminder = (appt: Appointment) => {
    const client = (clients as Client[]).find(c => c.id === appt.clientId);
    if (!client?.phone) { toast({ title: "Cliente sem telefone cadastrado", variant: "destructive" }); return; }
    const message = fillReminderTemplate(appt);
    const cleaned = client.phone.replace(/\D/g, "");
    const number = cleaned.length === 11 ? `55${cleaned}` : cleaned;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank");
    markNotified(appt.id);
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

  const kanbanColProps = {
    clients: clients as Client[],
    pets: allPets as Pet[],
    services: services as Service[],
    packages: packages as Package[],
    onDelete: handleDelete,
    onPetPronto: openPetPronto,
    onEditService: setEditServicoAppt,
    onChangeStatus: handleStatusChange,
    editingApptId,
    editDate,
    editTime,
    onStartEditDate: startEditDate,
    onChangeEditDate: changeEditDate,
    onSaveEditDate: saveEditDate,
    onCancelEditDate: cancelEditDate,
    isPeriodo,
  };

  return (
    <div className="p-3 space-y-3 pt-[10px] pb-[10px]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard | Agenda de Hoje</h1>
          <p className="text-muted-foreground text-sm">Visão geral do pet shop</p>
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

      {/* ── Date navigation ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
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

      {/* ── Week day picker ─────────────────────────────────────────────────── */}
      {view === "week" && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {weekDays.map(d => (
            <button key={d.toISOString()} onClick={() => { setSelectedDate(d); setView("day"); }}
              className={`flex flex-col items-center px-3 py-2 rounded-lg text-sm min-w-[70px] transition-colors ${isSameDay(d, selectedDate) ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              <span className="text-xs opacity-70">{format(d, "EEE", { locale: ptBR })}</span>
              <span className="font-bold">{format(d, "d")}</span>
              <span className="text-xs opacity-70">{filterForDay(d).length} agend.</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Kanban ─────────────────────────────────────────────────────────── */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

        {/* Row 1: Aguardando | Em Atendimento | Pet Pronto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {COLUMNS.slice(0, 3).map(col => (
            <KanbanColumn key={col.id} status={col.id} label={col.label} color={col.color} bg={col.bg}
              appointments={filterByStatus(col.id).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())}
              {...kanbanColProps}
            />
          ))}
        </div>

        {/* Row 2: Concluído | Cancelado | Lembretes de amanhã */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {COLUMNS.slice(3).map(col => (
            <KanbanColumn key={col.id} status={col.id} label={col.label} color={col.color} bg={col.bg}
              appointments={filterByStatus(col.id).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())}
              {...kanbanColProps}
            />
          ))}

          {/* Lembretes de amanhã panel */}
          <div className="flex flex-col rounded-xl border-2 bg-amber-50 border-amber-200 min-h-[200px]">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-200">
              <Bell className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="font-semibold text-sm text-amber-700">Lembretes de amanhã</span>
              <span className="text-xs text-muted-foreground hidden sm:block truncate">{format(tomorrow, "EEE, d 'de' MMM", { locale: ptBR })}</span>
              {sortedTomorrowAppts.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-auto shrink-0">{sortedTomorrowAppts.length - notifiedIds.size}/{sortedTomorrowAppts.length}</Badge>
              )}
            </div>
            <div className="p-2 border-b border-amber-200">
              <Select value={reminderTemplateId} onValueChange={setReminderTemplateId}>
                <SelectTrigger className="h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Mensagem padrão</SelectItem>
                  {reminderTemplates.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sortedTomorrowAppts.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">Nenhum agendamento amanhã 🎉</div>
              ) : (
                <div className="divide-y divide-amber-100">
                  {sortedTomorrowAppts.map(appt => {
                    const pet = (allPets as Pet[]).find(p => p.id === appt.petId);
                    const client = (clients as Client[]).find(c => c.id === appt.clientId);
                    const isNotified = notifiedIds.has(appt.id);
                    return (
                      <div key={appt.id} className={`flex items-center gap-2 px-2 py-2 transition-all ${isNotified ? "opacity-40" : "hover:bg-amber-100/50"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <PawPrint className="h-3 w-3 text-primary shrink-0" />
                            <span className="font-semibold text-xs truncate">{pet?.name ?? "Pet"}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{client?.name ?? ""}</p>
                        </div>
                        {isNotified ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-green-600 flex items-center gap-0.5"><CheckCheck className="h-3 w-3" />ok</span>
                            <button onClick={() => unmarkNotified(appt.id)} className="text-[10px] text-muted-foreground hover:text-foreground underline">desfazer</button>
                          </div>
                        ) : (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1 h-6 text-[10px] px-2 shrink-0" onClick={() => sendReminder(appt)} disabled={!client?.phone}>
                            <MessageSquare className="h-3 w-3" />Lembrete
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeAppt && (
            <div className="shadow-2xl rotate-1 scale-105">
              <AppointmentCard appt={activeAppt} clients={clients as Client[]} pets={allPets as Pet[]} services={services as Service[]} packages={packages as Package[]} onDelete={() => {}} isPeriodo={isPeriodo} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* ── Agendamentos Recentes ──────────────────────────────────────────── */}
      {(dashboardData?.recentAppointments as any[] | undefined)?.length ? (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Agendamentos Recentes</span>
          </div>
          <div className="divide-y">
            {(dashboardData!.recentAppointments as any[]).map((appt: any) => (
              <div key={appt.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{appt.pet?.name ?? "–"}</p>
                  <p className="text-xs text-muted-foreground truncate">{appt.client?.name ?? "–"} · {appt.service?.name ?? appt.package?.name ?? "Serviço"}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                  {new Date(appt.scheduledDate).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
                <Badge className={`${statusColors[appt.status] ?? ""} shrink-0`} variant="outline">
                  {statusLabels[appt.status] ?? appt.status}
                </Badge>
                <span className="font-semibold text-sm shrink-0">{formatBRL(Number(appt.totalPrice))}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Modal: Gerenciar Serviços ──────────────────────────────────────── */}
      <GerenciarServicosModal appt={editServicoAppt} services={services as Service[]} pets={allPets as Pet[]} isSaving={updateAppointment.isPending} onSave={handleEditServicoSave} onClose={() => setEditServicoAppt(null)} />

      {/* ── Modal: WhatsApp ────────────────────────────────────────────────── */}
      <ConfirmacaoWhatsAppModal
        appt={confirmacaoAppt}
        clients={clients as Client[]}
        pets={allPets as Pet[]}
        services={services as Service[]}
        packages={packages as Package[]}
        mode={confirmacaoMode}
        overridePrice={confirmacaoOverridePrice}
        overrideClient={confirmacaoOverrideClient}
        onClose={handleConfirmacaoClose}
        tenantId={tenantId!}
      />

      {/* ── Modal: Novo Agendamento ────────────────────────────────────────── */}
      <Dialog open={casualOpen} onOpenChange={open => { if (!open) setCasualOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Novo Agendamento</DialogTitle>
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
                  <Select value={casual.petSize} onValueChange={v => setCasual(f => ({ ...f, petSize: v as PetInputSize, serviceId: "", totalPrice: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione o porte" /></SelectTrigger>
                    <SelectContent>{(Object.entries(PORTE_SIZES) as [PetInputSize, string][]).map(([val, lbl]) => <SelectItem key={val} value={val}>{lbl}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            {casualStep === 2 && (
              <>
                {casualFoundClient && (
                  <div className="space-y-1.5">
                    <Label>Pet *</Label>
                    <Select value={casualSelectedPetId} onValueChange={v => { setCasualSelectedPetId(v); if (v !== "new") { const pet = (casualClientPets as Pet[]).find(p => p.id === Number(v)); if (pet) setCasual(f => ({ ...f, petSize: pet.size as PetInputSize, serviceId: "", totalPrice: "" })); } else { setCasual(f => ({ ...f, petSize: "" as PetInputSize | "", serviceId: "", totalPrice: "" })); } }}>
                      <SelectTrigger><SelectValue placeholder="Selecione o pet" /></SelectTrigger>
                      <SelectContent>
                        {(casualClientPets as Pet[]).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name} — {PORTE_SIZES[p.size] ?? p.size}</SelectItem>)}
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
                      <Select value={casual.petSize} onValueChange={v => setCasual(f => ({ ...f, petSize: v as PetInputSize, serviceId: "", totalPrice: "" }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione o porte" /></SelectTrigger>
                        <SelectContent>{(Object.entries(PORTE_SIZES) as [PetInputSize, string][]).map(([val, lbl]) => <SelectItem key={val} value={val}>{lbl}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label>Serviço *</Label>
                  <Select value={casual.serviceId} onValueChange={v => { const svc = (services as Service[]).find(s => s.id === Number(v)); setCasual(f => ({ ...f, serviceId: v, totalPrice: svc ? String(svc.price) : f.totalPrice })); }}>
                    <SelectTrigger><SelectValue placeholder={casual.petSize ? "Selecione o serviço" : "Selecione o porte primeiro"} /></SelectTrigger>
                    <SelectContent>
                      {casualFilteredServices.length === 0 && <SelectItem value="_none" disabled>Nenhum serviço para este porte</SelectItem>}
                      {casualFilteredServices.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} — {formatBRL(s.price)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {casual.petSize && <p className="text-xs text-muted-foreground">Serviços filtrados para porte: <span className="font-medium">{PORTE_SIZES[casual.petSize]}</span></p>}
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
                        <SelectContent>{casualExtraAvailable.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} — {formatBRL(s.price)}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Data *</Label><Input type="date" value={casual.scheduledDate} onChange={e => setCasual(f => ({ ...f, scheduledDate: e.target.value }))} /></div>
                  {isPeriodo ? (
                    <div className="space-y-1.5">
                      <Label>Período *</Label>
                      <Select value={casual.scheduledTime === "14:00" ? "tarde" : "manha"} onValueChange={v => setCasual(f => ({ ...f, scheduledTime: v === "tarde" ? "14:00" : "08:00" }))}>
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
            {casualStep > 0 && <Button variant="outline" onClick={casualPrevStep}>Voltar</Button>}
            <Button variant="outline" onClick={() => setCasualOpen(false)}>Cancelar</Button>
            {casualStep < 2 ? (
              <Button onClick={casualNextStep}>Próximo <ArrowNext className="h-4 w-4 ml-1" /></Button>
            ) : (
              <Button onClick={handleCasualSave} disabled={isCasualSaving}>{isCasualSaving ? "Salvando..." : "Confirmar Agendamento"}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Vender Pacote ───────────────────────────────────────────── */}
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
                  {(packages as Package[]).map(p => { const prices = p.priceBySizes.map(x => x.price).filter(x => x > 0); const min = prices.length ? Math.min(...prices) : 0; const max = prices.length ? Math.max(...prices) : 0; const range = min === max ? formatBRL(min) : `${formatBRL(min)} – ${formatBRL(max)}`; return <SelectItem key={p.id} value={String(p.id)}>{p.name} ({range})</SelectItem>; })}
                </SelectContent>
              </Select>
              {selectedPkg && <div className="flex flex-wrap gap-1 mt-1">{selectedPkg.serviceItems.map((item, i) => <Badge key={i} variant="outline" className="text-xs">{item.quantity}× {item.serviceName}</Badge>)}</div>}
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
                  <Input className="pl-9" placeholder="Buscar por nome..." value={sellClientSearch} onChange={e => setSellClientSearch(e.target.value)} autoFocus />
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
                    ) : <p className="text-xs text-muted-foreground mt-1">Nenhum cliente encontrado.</p>;
                  })()}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Pet *</Label>
              <Select value={sell.petId} onValueChange={v => setSell(f => ({ ...f, petId: v }))} disabled={!sell.clientId}>
                <SelectTrigger><SelectValue placeholder={sell.clientId ? "Selecione o pet" : "Selecione um cliente primeiro"} /></SelectTrigger>
                <SelectContent>{(sellClientPets as Pet[]).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name} — {PORTE_SIZES[p.size] ?? p.size}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {sell.petId && sell.packageId && (
              <div className="rounded-lg bg-muted/40 border px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor do pacote</span>
                {priceForPet !== null ? <span className="text-lg font-bold text-primary">{formatBRL(priceForPet)}</span> : <span className="text-sm text-amber-600">Sem preço para este porte</span>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Data do 1º agend. *</Label><Input type="date" value={sell.startDate} onChange={e => setSell(f => ({ ...f, startDate: e.target.value }))} /></div>
              {isPeriodo ? (
                <div className="space-y-1.5">
                  <Label>Período *</Label>
                  <Select value={sell.startTime === "14:00" ? "tarde" : "manha"} onValueChange={v => setSell(f => ({ ...f, startTime: v === "tarde" ? "14:00" : "08:00" }))}>
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
                  {sellSessions.map((s, i) => { const d = new Date(`${sell.startDate}T${sell.startTime}`); d.setDate(d.getDate() + i * 7); return <div key={s.index} className="flex items-center justify-between px-3 py-2"><span className="text-muted-foreground">{d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} às {sell.startTime}</span><span className={s.hasExtra ? "font-medium text-primary text-xs" : "text-xs"}>{s.label}</span></div>; })}
                </div>
              </div>
            )}
            <div className="space-y-1.5"><Label>Observações</Label><Textarea placeholder="Observações para todos os agendamentos" value={sell.notes} onChange={e => setSell(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
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
