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
  ChevronRight as ArrowNext, Search, X, CalendarDays,
  Bell, ChevronDown, ChevronUp, CheckCheck,
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
  };
}

type Appointment = {
  id: number;
  petId: number;
  clientId: number;
  serviceId?: number | null;
  packageId?: number | null;
  scheduledDate: string;
  status: AppStatus;
  totalPrice: string | number;
  notes?: string | null;
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

function AppointmentCard({ appt, clients, pets, services, packages, onDelete, onWhatsapp, isDragging = false, isEditingDate, editDate, editTime, onStartEditDate, onChangeEditDate, onSaveEditDate, onCancelEditDate }: {
  appt: Appointment;
  clients: Client[];
  pets: Pet[];
  services: Service[];
  packages: Package[];
  onDelete: (id: number) => void;
  onWhatsapp?: (appt: Appointment) => void;
  isDragging?: boolean;
  isEditingDate?: boolean;
  editDate?: string;
  editTime?: string;
  onStartEditDate?: () => void;
  onChangeEditDate?: (date: string, time: string) => void;
  onSaveEditDate?: () => void;
  onCancelEditDate?: () => void;
}) {
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
            {pet?.size && <Badge variant="secondary" className="text-xs px-1 py-0">{PORTE_SIZES[pet.size] ?? pet.size}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground truncate">{client?.name ?? "Cliente"}</p>
          <p className="text-xs text-muted-foreground">{service?.name ?? pkg?.name ?? "Serviço"}</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(appt.id); }}
          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
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
            <Input
              type="time"
              value={editTime ?? time}
              onChange={e => onChangeEditDate?.(editDate ?? dateStr, e.target.value)}
              className="h-6 text-[10px] px-1 py-0 w-[70px]"
            />
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
    </div>
  );
}

function DraggableCard({ appt, clients, pets, services, packages, onDelete, onWhatsapp, isEditingDate, editDate, editTime, onStartEditDate, onChangeEditDate, onSaveEditDate, onCancelEditDate }: {
  appt: Appointment;
  clients: Client[];
  pets: Pet[];
  services: Service[];
  packages: Package[];
  onDelete: (id: number) => void;
  onWhatsapp?: (appt: Appointment) => void;
  isEditingDate?: boolean;
  editDate?: string;
  editTime?: string;
  onStartEditDate?: () => void;
  onChangeEditDate?: (date: string, time: string) => void;
  onSaveEditDate?: () => void;
  onCancelEditDate?: () => void;
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
        isDragging={isDragging}
        isEditingDate={isEditingDate}
        editDate={editDate}
        editTime={editTime}
        onStartEditDate={onStartEditDate}
        onChangeEditDate={onChangeEditDate}
        onSaveEditDate={onSaveEditDate}
        onCancelEditDate={onCancelEditDate}
      />
    </div>
  );
}

function KanbanColumn({ status, label, color, bg, appointments, clients, pets, services, packages, onDelete, onWhatsapp, editingApptId, editDate, editTime, onStartEditDate, onChangeEditDate, onSaveEditDate, onCancelEditDate }: {
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
  editingApptId: number | null;
  editDate: string;
  editTime: string;
  onStartEditDate: (appt: Appointment) => void;
  onChangeEditDate: (date: string, time: string) => void;
  onSaveEditDate: (appt: Appointment) => void;
  onCancelEditDate: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className={`flex flex-col rounded-xl border-2 ${bg} ${isOver ? "ring-2 ring-primary ring-offset-1" : ""} transition-all min-h-[400px]`}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-current/10 pt-[4px] pb-[4px] pl-[6px] pr-[6px]">
        <span className={`font-semibold text-sm ${color}`}>{label}</span>
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
            isEditingDate={editingApptId === appt.id}
            editDate={editDate}
            editTime={editTime}
            onStartEditDate={() => onStartEditDate(appt)}
            onChangeEditDate={onChangeEditDate}
            onSaveEditDate={() => onSaveEditDate(appt)}
            onCancelEditDate={onCancelEditDate}
          />
        ))}
      </div>
    </div>
  );
}

// ─── ConfirmacaoWhatsAppModal ─────────────────────────────────────────────────

type ConfirmacaoMode = "agradecimento" | "conclusao";

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
  const [templateId, setTemplateId] = useState("default");

  useEffect(() => { setTemplateId("default"); }, [appt?.id, mode]);

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

  const templateType = mode === "agradecimento" ? "agradecimento" : "confirmacao";
  const filteredTemplates = (msgTemplates as MessageTemplate[]).filter(t => t.type === templateType);

  const buildMessage = (): string => {
    if (!appt || !client) return "";
    const apptTime = new Date(appt.scheduledDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const apptDate = format(new Date(appt.scheduledDate), "dd/MM/yyyy");
    const serviceName = service?.name ?? pkg?.name ?? "Serviço";
    const price = formatBRL(overridePrice !== undefined ? overridePrice : Number(appt.totalPrice));

    // For agradecimento: include current appt + all future; for conclusao: only future (excl. current)
    const allAppts = (clientAppts as Appointment[])
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    const now = new Date();
    const datesForList = mode === "agradecimento"
      ? allAppts.filter(a => new Date(a.scheduledDate) >= now)
      : allAppts.filter(a => a.id !== appt.id && new Date(a.scheduledDate) > now);

    const datasStr = datesForList.length > 0
      ? datesForList.map(a => `📅 ${format(new Date(a.scheduledDate), "dd/MM/yyyy 'às' HH:mm")}`).join("\n")
      : apptDate + " às " + apptTime;

    const selectedTmpl = templateId !== "default"
      ? filteredTemplates.find(t => String(t.id) === templateId)
      : null;

    const defaultContent = mode === "agradecimento"
      ? `Olá {nome_cliente}! Obrigado por agendar com a gente! 🐾\n\n{nome_pet} está agendado nas seguintes datas:\n{datas}\n\nServiço: {servico}\nValor: {preco}\n\nQualquer dúvida, estamos à disposição!`
      : `Olá {nome_cliente}! Obrigado pela visita de {nome_pet} hoje! Serviço: {servico}. Valor pago: {preco}.`;

    const baseContent = selectedTmpl?.content ?? defaultContent;

    let msg = baseContent
      .replace(/\{nome_cliente\}/g, client.name)
      .replace(/\{nome_pet\}/g, pet?.name ?? "")
      .replace(/\{data\}/g, apptDate)
      .replace(/\{horario\}/g, apptTime)
      .replace(/\{servico\}/g, serviceName)
      .replace(/\{preco\}/g, price)
      .replace(/\{datas\}/g, datasStr);

    // For conclusao mode: append future dates if not already in template
    if (mode === "conclusao" && !baseContent.includes("{datas}") && datesForList.length > 0) {
      const datesList = datesForList
        .map(a => `📅 ${format(new Date(a.scheduledDate), "dd/MM/yyyy 'às' HH:mm")}`)
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

  const modalTitle = mode === "agradecimento" ? "Agradecimento via WhatsApp" : "Confirmação de Presença via WhatsApp";
  const templateLabel = mode === "agradecimento" ? "Template de agradecimento" : "Template de confirmação de presença";

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
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Mensagem padrão</SelectItem>
                  {filteredTemplates.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Pré-visualização da mensagem</Label>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm whitespace-pre-wrap font-mono text-green-900 max-h-52 overflow-y-auto">
                {buildMessage()}
              </div>
            </div>

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
            disabled={!client?.phone}
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
  petSize: "" as PetInputSize | "",
  serviceId: "",
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

  // Casual modal
  const [casualOpen, setCasualOpen] = useState(false);
  const [casualStep, setCasualStep] = useState(0);
  const [casual, setCasual] = useState(emptyCasual);
  const [casualFoundClient, setCasualFoundClient] = useState<Client | null>(null);
  const [casualSearchQuery, setCasualSearchQuery] = useState("");
  const [casualSelectedPetId, setCasualSelectedPetId] = useState<string>("");

  // Sell package modal
  const [sellOpen, setSellOpen] = useState(false);
  const [sell, setSell] = useState(emptySell);

  // Inline date edit in Kanban
  const [editingApptId, setEditingApptId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  // WhatsApp confirmation modal
  const [confirmacaoAppt, setConfirmacaoAppt] = useState<Appointment | null>(null);
  const [confirmacaoMode, setConfirmacaoMode] = useState<ConfirmacaoMode>("conclusao");
  const [confirmacaoOverridePrice, setConfirmacaoOverridePrice] = useState<number | undefined>(undefined);
  const [confirmacaoOverrideClient, setConfirmacaoOverrideClient] = useState<Pick<Client, "id" | "name" | "phone"> | undefined>(undefined);
  const openConfirmacao = (appt: Appointment) => {
    setConfirmacaoMode("conclusao");
    setConfirmacaoOverridePrice(undefined);
    setConfirmacaoAppt(appt);
  };

  // Reminders panel
  const tomorrow = addDays(new Date(), 1);
  const tomorrowKey = format(tomorrow, "yyyy-MM-dd");
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [reminderTemplateId, setReminderTemplateId] = useState<string>("default");
  const [notifiedIds, setNotifiedIds] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(`reminders_notified_${tomorrowKey}`);
      return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
    } catch { return new Set<number>(); }
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Tomorrow's appointments for reminders
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

  const { data: clients = [] } = useListClients({ tenantId: tenantId! });
  const { data: allPets = [] } = useListPets({});
  const { data: services = [] } = useListServices({ tenantId: tenantId! });
  const { data: packages = [] } = useListPackages({ tenantId: tenantId! });

  // Pets for sell modal — only fetched when a client is selected
  const sellPetParams = sell.clientId ? { clientId: Number(sell.clientId) } : undefined;
  const { data: sellClientPets = [] } = useListPets(sellPetParams, {
    query: { queryKey: getListPetsQueryKey(sellPetParams), enabled: !!sell.clientId },
  });

  // Pets for casual modal — only fetched when an existing client is found
  const casualClientPetParams = casualFoundClient ? { clientId: casualFoundClient.id } : undefined;
  const { data: casualClientPets = [], isFetched: casualClientPetsFetched } = useListPets(casualClientPetParams, {
    query: { queryKey: getListPetsQueryKey(casualClientPetParams), enabled: !!casualFoundClient },
  });

  // Auto-select "new" pet when found client has no registered pets
  useEffect(() => {
    if (casualFoundClient && casualClientPetsFetched && (casualClientPets as Pet[]).length === 0) {
      setCasualSelectedPetId("new");
    }
  }, [casualFoundClient, casualClientPetsFetched, casualClientPets]);

  // Live search results for casual modal (client-side, min 2 chars)
  // Phone matching is only applied when the query looks like a phone (only digits/spaces/dashes/parens)
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

  // ── Inline date editing handlers ───────────────────────────────────────────
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
      await updateAppointment.mutateAsync({
        id: appt.id,
        data: { scheduledDate: dt.toISOString() },
      });
      toast({ title: "Data/hora atualizada!" });
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

  // ── Casual: services filtered by pet size ──────────────────────────────────
  const casualFilteredServices = casual.petSize
    ? (services as Service[]).filter(s => s.size === casual.petSize)
    : (services as Service[]);

  // ── Sell: selected package & price for pet ────────────────────────────────
  const selectedPkg = (packages as Package[]).find(p => p.id === Number(sell.packageId));
  const sellPet = (sellClientPets as Pet[]).find(p => p.id === Number(sell.petId));
  const sellPetSize = sellPet?.size;
  const priceForPet = sellPetSize && selectedPkg
    ? (selectedPkg.priceBySizes.find(p => p.size === sellPetSize)?.price ?? null)
    : null;

  // ── Sell: sessions preview ────────────────────────────────────────────────
  const sellSessions = (() => {
    if (!selectedPkg) return [];
    const items = [...(selectedPkg.serviceItems ?? [])].sort((a, b) => b.quantity - a.quantity);
    const main = items[0];
    const extras = items.slice(1);
    if (!main) return [];
    return Array.from({ length: main.quantity }, (_, i) => ({
      index: i + 1,
      label: i === main.quantity - 1 && extras.length > 0
        ? `${main.serviceName} + ${extras.map(e => e.serviceName).join(" + ")}`
        : main.serviceName,
      hasExtra: i === main.quantity - 1 && extras.length > 0,
    }));
  })();

  // ── DnD ──────────────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as number);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as AppStatus;
    const appt = (appointments as Appointment[]).find(a => a.id === active.id);
    if (!appt || appt.status === newStatus) return;
    try {
      await updateStatus.mutateAsync({ id: appt.id, data: { status: newStatus } });
      refetch();
      if (newStatus === "concluido") {
        openConfirmacao(appt);
      }
    } catch {
      toast({ title: "Erro ao mover card", variant: "destructive" });
    }
  }, [appointments, updateStatus, refetch, toast]);

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este agendamento?")) return;
    await deleteAppointment.mutateAsync({ id });
    refetch();
  };

  // ── Casual modal ──────────────────────────────────────────────────────────
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
      if (casualFoundClient) {
        setCasualStep(2);
        return;
      }
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
    if (casualStep === 2 && casualFoundClient) {
      setCasualStep(0);
    } else {
      setCasualStep(s => s - 1);
    }
  };

  const handleCasualSave = async () => {
    if (!casual.serviceId) { toast({ title: "Selecione um serviço", variant: "destructive" }); return; }
    if (!casual.scheduledDate || !casual.scheduledTime) { toast({ title: "Data e horário são obrigatórios", variant: "destructive" }); return; }
    if (!casual.totalPrice) { toast({ title: "Informe o valor", variant: "destructive" }); return; }
    if (!casual.petSize) { toast({ title: "Porte do pet é obrigatório", variant: "destructive" }); return; }

    if (casualFoundClient) {
      const usingExistingPet = casualSelectedPetId && casualSelectedPetId !== "new";
      if (!usingExistingPet) {
        if (!casual.petName.trim()) { toast({ title: "Nome do pet é obrigatório", variant: "destructive" }); return; }
      }
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
          const newPet: Pet = await createPet.mutateAsync({
            data: {
              clientId: resolvedClientId,
              name: casual.petName.trim(),
              breed: casual.petBreed.trim() || undefined,
              size: casual.petSize,
            },
          });
          resolvedPetId = newPet.id;
        }
      } else {
        const newClient: Client = await createClient.mutateAsync({
          data: {
            tenantId: tenantId!,
            name: casual.clientName.trim(),
            phone: casual.clientPhone.trim(),
          },
        });
        resolvedClientId = newClient.id;
        // Store newly created client so the WhatsApp modal can use it immediately
        // without waiting for the clients list to be refetched
        setConfirmacaoOverrideClient({
          id: newClient.id,
          name: newClient.name,
          phone: newClient.phone,
        });
        const newPet: Pet = await createPet.mutateAsync({
          data: {
            clientId: resolvedClientId,
            name: casual.petName.trim(),
            breed: casual.petBreed.trim() || undefined,
            size: casual.petSize,
          },
        });
        resolvedPetId = newPet.id;
      }

      const dt = new Date(`${casual.scheduledDate}T${casual.scheduledTime}:00`);
      const createdAppts = await createAppointment.mutateAsync({
        data: {
          tenantId: tenantId!,
          clientId: resolvedClientId,
          petId: resolvedPetId,
          serviceId: Number(casual.serviceId),
          scheduledDate: dt.toISOString(),
          totalPrice: Number(casual.totalPrice),
          notes: casual.notes || undefined,
        },
      });

      const clientName = casualFoundClient?.name ?? casual.clientName;
      const petName = casualSelectedPetId && casualSelectedPetId !== "new"
        ? (casualClientPets as Pet[]).find(p => p.id === Number(casualSelectedPetId))?.name ?? ""
        : casual.petName;
      toast({ title: "Agendamento criado!", description: `${clientName} · ${petName}` });
      setCasualOpen(false);
      refetch();
      const first = createdAppts[0];
      if (first) {
        setConfirmacaoMode("agradecimento");
        setConfirmacaoOverridePrice(undefined);
        setConfirmacaoAppt(appointmentFromFull(first));
      }
    } catch {
      setConfirmacaoOverrideClient(undefined);
      toast({ title: "Erro ao criar agendamento", variant: "destructive" });
    }
  };

  const isCasualSaving = createClient.isPending || createPet.isPending || createAppointment.isPending;

  // ── Sell package modal ────────────────────────────────────────────────────
  const openSell = () => {
    setSell(emptySell);
    setSellOpen(true);
  };

  const handleSellSave = async () => {
    if (!sell.packageId) { toast({ title: "Selecione o pacote", variant: "destructive" }); return; }
    if (!sell.clientId) { toast({ title: "Selecione o cliente", variant: "destructive" }); return; }
    if (!sell.petId) { toast({ title: "Selecione o pet", variant: "destructive" }); return; }
    if (!sell.startDate || !sell.startTime) { toast({ title: "Data e horário são obrigatórios", variant: "destructive" }); return; }
    try {
      const result: SellPackageResult = await sellPackage.mutateAsync({
        id: Number(sell.packageId),
        data: {
          tenantId: tenantId!,
          clientId: Number(sell.clientId),
          petId: Number(sell.petId),
          startDate: sell.startDate,
          startTime: sell.startTime,
          notes: sell.notes || null,
        },
      });
      const count = result.appointments.length;
      const price = result.financialEntry.amount;
      toast({
        title: "Pacote vendido com sucesso!",
        description: `${count} agendamento${count !== 1 ? "s" : ""} criado${count !== 1 ? "s" : ""} · Receita: ${formatBRL(price)}`,
      });
      setSellOpen(false);
      refetch();
      const firstSell = result.appointments[0];
      if (firstSell) {
        setConfirmacaoMode("agradecimento");
        setConfirmacaoOverridePrice(result.financialEntry.amount);
        setConfirmacaoAppt(appointmentFromFull(firstSell));
      }
    } catch {
      toast({ title: "Erro ao vender pacote", variant: "destructive" });
    }
  };

  // ── Reminders helpers ─────────────────────────────────────────────────────
  const markNotified = (apptId: number) => {
    setNotifiedIds(prev => {
      const next = new Set(prev);
      next.add(apptId);
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

    const selectedTmpl = reminderTemplateId !== "default"
      ? reminderTemplates.find(t => String(t.id) === reminderTemplateId)
      : null;

    const content = selectedTmpl?.content
      ?? `Olá {nome_cliente}! Lembramos que {nome_pet} tem agendamento amanhã, dia {data} às {horario}. Serviço: {servico}. Valor: {preco}. Aguardamos vocês! 🐾`;

    return content
      .replace(/\{nome_cliente\}/g, client?.name ?? "")
      .replace(/\{nome_pet\}/g, pet?.name ?? "")
      .replace(/\{data\}/g, apptDate)
      .replace(/\{horario\}/g, apptTime)
      .replace(/\{servico\}/g, serviceName)
      .replace(/\{preco\}/g, formatBRL(Number(appt.totalPrice)));
  };

  const sendReminder = (appt: Appointment) => {
    const client = (clients as Client[]).find(c => c.id === appt.clientId);
    if (!client?.phone) {
      toast({ title: "Cliente sem telefone cadastrado", variant: "destructive" });
      return;
    }
    const message = fillReminderTemplate(appt);
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

  // Sort: un-notified first, notified (faded) at the end — both groups sorted by time
  const sortedTomorrowAppts = [
    ...(tomorrowAppts as Appointment[]).filter(a => !notifiedIds.has(a.id)),
    ...(tomorrowAppts as Appointment[]).filter(a => notifiedIds.has(a.id)),
  ].sort((a, b) => {
    const aN = notifiedIds.has(a.id) ? 1 : 0;
    const bN = notifiedIds.has(b.id) ? 1 : 0;
    if (aN !== bN) return aN - bN;
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
  });

  // ── Kanban helpers ────────────────────────────────────────────────────────
  const activeAppt = activeId ? (appointments as Appointment[]).find(a => a.id === activeId) : null;
  const filterForDay = (day: Date) => (appointments as Appointment[]).filter(a => isSameDay(new Date(a.scheduledDate), day));
  const filterByStatus = (status: AppStatus) =>
    (view === "day" ? filterForDay(selectedDate) : (appointments as Appointment[])).filter(a => a.status === status);

  const STEP_LABELS = ["Cliente", "Pet", "Agendamento"];

  return (
    <div className="p-6 space-y-4 pl-[12px] pr-[12px] pt-[12px] pb-[12px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-[8px]">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground">Kanban de atendimentos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openCasual} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Cliente Casual
          </Button>
          <Button onClick={openSell} className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Vender Pacote
          </Button>
        </div>
      </div>
      {/* Date navigation */}
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
      {/* Week strip */}
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
      {/* Kanban */}
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
              editingApptId={editingApptId}
              editDate={editDate}
              editTime={editTime}
              onStartEditDate={startEditDate}
              onChangeEditDate={changeEditDate}
              onSaveEditDate={saveEditDate}
              onCancelEditDate={cancelEditDate}
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
            <span className="font-semibold text-sm">
              Lembretes de amanhã
            </span>
            <span className="text-xs text-muted-foreground">
              {format(tomorrow, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
            {sortedTomorrowAppts.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {sortedTomorrowAppts.length - notifiedIds.size}/{sortedTomorrowAppts.length}
              </Badge>
            )}
          </div>
          {remindersOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {remindersOpen && (
          <div className="border-t">
            {/* Template selector */}
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b flex-wrap">
              <Label className="text-xs whitespace-nowrap shrink-0">Template de lembrete:</Label>
              <Select value={reminderTemplateId} onValueChange={setReminderTemplateId}>
                <SelectTrigger className="h-7 text-xs w-auto min-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Mensagem padrão</SelectItem>
                  {reminderTemplates.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {notifiedIds.size > 0 && (
                <span className="text-xs text-muted-foreground ml-auto">
                  <CheckCheck className="h-3.5 w-3.5 inline mr-1 text-green-600" />
                  {notifiedIds.size} notificado{notifiedIds.size !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Appointments list */}
            {sortedTomorrowAppts.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nenhum agendamento para amanhã 🎉
              </div>
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
                    <div
                      key={appt.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-all ${isNotified ? "opacity-40" : "hover:bg-accent/20"}`}
                    >
                      {/* Time */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground w-12 shrink-0">
                        <Clock className="h-3 w-3" />
                        {apptTime}
                      </div>

                      {/* Pet + client */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <PawPrint className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-semibold text-sm truncate">{pet?.name ?? "Pet"}</span>
                        {pet?.size && (
                          <Badge variant="outline" className="text-xs px-1 py-0 shrink-0">
                            {PORTE_SIZES[pet.size as keyof typeof PORTE_SIZES] ?? pet.size}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground truncate">· {client?.name ?? "Cliente"}</span>
                      </div>

                      {/* Service */}
                      <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[120px]">
                        {service?.name ?? pkg?.name ?? ""}
                      </span>

                      {/* Price */}
                      <span className="text-xs font-semibold text-primary shrink-0">
                        {formatBRL(Number(appt.totalPrice))}
                      </span>

                      {/* Phone warning */}
                      {!client?.phone && (
                        <span className="text-xs text-amber-600 shrink-0">sem telefone</span>
                      )}

                      {/* Actions */}
                      {isNotified ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCheck className="h-3.5 w-3.5" />
                            Enviado
                          </span>
                          <button
                            onClick={() => unmarkNotified(appt.id)}
                            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1"
                            title="Desmarcar como enviado"
                          >
                            desfazer
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-1.5 h-7 text-xs shrink-0"
                          onClick={() => sendReminder(appt)}
                          disabled={!client?.phone}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Lembrete
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

      {/* ── Modal: Confirmação WhatsApp ───────────────────────────────────── */}
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

      {/* ── Modal: Cliente Casual ─────────────────────────────────────────── */}
      <Dialog open={casualOpen} onOpenChange={open => { if (!open) setCasualOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Novo Agendamento — Cliente Casual
            </DialogTitle>
          </DialogHeader>

          {/* Step labels */}
          <div className="flex items-center gap-0 text-xs font-medium mb-1">
            {STEP_LABELS.map((lbl, i) => (
              <div key={i} className="flex items-center gap-0">
                <span className={`px-2 py-0.5 rounded-full text-xs ${i === casualStep ? "bg-primary text-primary-foreground" : i < casualStep ? "text-primary" : "text-muted-foreground"}`}>
                  {lbl}
                </span>
                {i < STEP_LABELS.length - 1 && <span className="text-muted-foreground mx-0.5">›</span>}
              </div>
            ))}
          </div>
          <StepDots step={casualStep} total={3} />

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Step 0: Cliente */}
            {casualStep === 0 && (
              <>
                {casualFoundClient ? (
                  <div className="rounded-lg border bg-green-50 border-green-200 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-0.5">Cliente encontrado</p>
                        <p className="font-semibold text-sm">{casualFoundClient.name}</p>
                        {casualFoundClient.phone && (
                          <p className="text-xs text-muted-foreground">{casualFoundClient.phone}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setCasualFoundClient(null); setCasualSelectedPetId(""); setCasualSearchQuery(""); }}
                        className="p-1 rounded hover:bg-green-100 text-green-700"
                        title="Remover seleção"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label>Buscar cliente existente</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          className="pl-9"
                          placeholder="Nome ou telefone..."
                          value={casualSearchQuery}
                          onChange={e => setCasualSearchQuery(e.target.value)}
                          autoFocus
                        />
                      </div>
                      {casualSearchResults.length > 0 && (
                        <div className="border rounded-md divide-y shadow-sm bg-white z-10">
                          {casualSearchResults.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between gap-2"
                              onClick={() => { setCasualFoundClient(c); setCasualSearchQuery(""); }}
                            >
                              <span className="font-medium">{c.name}</span>
                              {c.phone && <span className="text-muted-foreground text-xs shrink-0">{c.phone}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      {casualSearchQuery.trim().length >= 2 && casualSearchResults.length === 0 && (
                        <p className="text-xs text-muted-foreground">Nenhum cliente encontrado. Preencha abaixo para cadastrar.</p>
                      )}
                    </div>

                    <div className="relative my-1">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">ou cadastrar novo</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Nome do cliente *</Label>
                      <Input
                        placeholder="Ex: Maria Silva"
                        value={casual.clientName}
                        onChange={e => setCasual(f => ({ ...f, clientName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telefone / WhatsApp *</Label>
                      <Input
                        placeholder="Ex: 11 99999-0000"
                        value={casual.clientPhone}
                        onChange={e => setCasual(f => ({ ...f, clientPhone: e.target.value }))}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* Step 1: Pet */}
            {casualStep === 1 && (
              <>
                <div className="space-y-1.5">
                  <Label>Nome do pet *</Label>
                  <Input
                    placeholder="Ex: Thor"
                    value={casual.petName}
                    onChange={e => setCasual(f => ({ ...f, petName: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Raça</Label>
                  <Input
                    placeholder="Ex: Labrador"
                    value={casual.petBreed}
                    onChange={e => setCasual(f => ({ ...f, petBreed: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Porte *</Label>
                  <Select
                    value={casual.petSize}
                    onValueChange={v => setCasual(f => ({ ...f, petSize: v as PetInputSize, serviceId: "", totalPrice: "" }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione o porte" /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(PORTE_SIZES) as [PetInputSize, string][]).map(([val, lbl]) => (
                        <SelectItem key={val} value={val}>{lbl}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Step 2: Agendamento */}
            {casualStep === 2 && (
              <>
                {/* Pet selection — only when using existing client */}
                {casualFoundClient && (
                  <div className="space-y-1.5">
                    <Label>Pet *</Label>
                    <Select
                      value={casualSelectedPetId}
                      onValueChange={v => {
                        setCasualSelectedPetId(v);
                        if (v !== "new") {
                          const pet = (casualClientPets as Pet[]).find(p => p.id === Number(v));
                          if (pet) setCasual(f => ({ ...f, petSize: pet.size as PetInputSize, serviceId: "", totalPrice: "" }));
                        } else {
                          setCasual(f => ({ ...f, petSize: "" as PetInputSize | "", serviceId: "", totalPrice: "" }));
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione o pet" /></SelectTrigger>
                      <SelectContent>
                        {(casualClientPets as Pet[]).map(p => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} — {PORTE_SIZES[p.size] ?? p.size}
                          </SelectItem>
                        ))}
                        <SelectItem value="new">+ Novo pet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* New pet fields — shown when: new client OR "new" pet option selected */}
                {(!casualFoundClient || casualSelectedPetId === "new") && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Nome do pet *</Label>
                      <Input
                        placeholder="Ex: Thor"
                        value={casual.petName}
                        onChange={e => setCasual(f => ({ ...f, petName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Raça</Label>
                      <Input
                        placeholder="Ex: Labrador"
                        value={casual.petBreed}
                        onChange={e => setCasual(f => ({ ...f, petBreed: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Porte *</Label>
                      <Select
                        value={casual.petSize}
                        onValueChange={v => setCasual(f => ({ ...f, petSize: v as PetInputSize, serviceId: "", totalPrice: "" }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione o porte" /></SelectTrigger>
                        <SelectContent>
                          {(Object.entries(PORTE_SIZES) as [PetInputSize, string][]).map(([val, lbl]) => (
                            <SelectItem key={val} value={val}>{lbl}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label>Serviço *</Label>
                  <Select
                    value={casual.serviceId}
                    onValueChange={v => {
                      const svc = (services as Service[]).find(s => s.id === Number(v));
                      setCasual(f => ({ ...f, serviceId: v, totalPrice: svc ? String(svc.price) : f.totalPrice }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={casual.petSize ? "Selecione o serviço" : "Selecione o porte primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {casualFilteredServices.length === 0 && (
                        <SelectItem value="_none" disabled>Nenhum serviço para este porte</SelectItem>
                      )}
                      {casualFilteredServices.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name} — {formatBRL(s.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {casual.petSize && (
                    <p className="text-xs text-muted-foreground">
                      Serviços filtrados para porte: <span className="font-medium">{PORTE_SIZES[casual.petSize]}</span>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Data *</Label>
                    <Input type="date" value={casual.scheduledDate} onChange={e => setCasual(f => ({ ...f, scheduledDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Horário *</Label>
                    <Input type="time" value={casual.scheduledTime} onChange={e => setCasual(f => ({ ...f, scheduledTime: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Valor (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={casual.totalPrice}
                    onChange={e => setCasual(f => ({ ...f, totalPrice: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Observações adicionais"
                    value={casual.notes}
                    onChange={e => setCasual(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            {casualStep > 0 && (
              <Button variant="outline" onClick={casualPrevStep}>Voltar</Button>
            )}
            <Button variant="outline" onClick={() => setCasualOpen(false)}>Cancelar</Button>
            {casualStep < 2 ? (
              <Button onClick={casualNextStep}>
                Próximo <ArrowNext className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleCasualSave} disabled={isCasualSaving}>
                {isCasualSaving ? "Salvando..." : "Confirmar Agendamento"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Modal: Vender Pacote ──────────────────────────────────────────── */}
      <Dialog open={sellOpen} onOpenChange={open => { if (!open) setSellOpen(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Vender Pacote
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Pacote */}
            <div className="space-y-1.5">
              <Label>Pacote *</Label>
              <Select value={sell.packageId} onValueChange={v => setSell(f => ({ ...f, packageId: v, petId: "" }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o pacote" /></SelectTrigger>
                <SelectContent>
                  {(packages as Package[]).map(p => {
                    const prices = p.priceBySizes.map(x => x.price).filter(x => x > 0);
                    const min = prices.length ? Math.min(...prices) : 0;
                    const max = prices.length ? Math.max(...prices) : 0;
                    const range = min === max ? formatBRL(min) : `${formatBRL(min)} – ${formatBRL(max)}`;
                    return (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} ({range})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedPkg && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedPkg.serviceItems.map((item, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{item.quantity}× {item.serviceName}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Cliente */}
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select value={sell.clientId} onValueChange={v => setSell(f => ({ ...f, clientId: v, petId: "" }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {(clients as Client[]).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pet */}
            <div className="space-y-1.5">
              <Label>Pet *</Label>
              <Select
                value={sell.petId}
                onValueChange={v => setSell(f => ({ ...f, petId: v }))}
                disabled={!sell.clientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={sell.clientId ? "Selecione o pet" : "Selecione um cliente primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {(sellClientPets as Pet[]).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} — {PORTE_SIZES[p.size] ?? p.size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price preview */}
            {sell.petId && sell.packageId && (
              <div className="rounded-lg bg-muted/40 border px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor do pacote</span>
                {priceForPet !== null ? (
                  <span className="text-lg font-bold text-primary">{formatBRL(priceForPet)}</span>
                ) : (
                  <span className="text-sm text-amber-600">Sem preço para este porte</span>
                )}
              </div>
            )}

            {/* Data e hora */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data do 1º agend. *</Label>
                <Input type="date" value={sell.startDate} onChange={e => setSell(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Horário *</Label>
                <Input type="time" value={sell.startTime} onChange={e => setSell(f => ({ ...f, startTime: e.target.value }))} />
              </div>
            </div>

            {/* Sessions preview */}
            {sellSessions.length > 0 && sell.startDate && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Agendamentos que serão criados
                </p>
                <div className="rounded-lg border divide-y text-sm">
                  {sellSessions.map((s, i) => {
                    const d = new Date(`${sell.startDate}T${sell.startTime}`);
                    d.setDate(d.getDate() + i * 7);
                    return (
                      <div key={s.index} className="flex items-center justify-between px-3 py-2">
                        <span className="text-muted-foreground">
                          {d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} às {sell.startTime}
                        </span>
                        <span className={s.hasExtra ? "font-medium text-primary text-xs" : "text-xs"}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações para todos os agendamentos"
                value={sell.notes}
                onChange={e => setSell(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSellOpen(false)}>Cancelar</Button>
            <Button onClick={handleSellSave} disabled={sellPackage.isPending} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              {sellPackage.isPending
                ? "Criando..."
                : sellSessions.length > 0
                  ? `Confirmar Venda (${sellSessions.length} agend.)`
                  : "Confirmar Venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
