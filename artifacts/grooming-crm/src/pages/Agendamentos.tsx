import { useState, useCallback } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import {
  useListAppointments, useUpdateAppointmentStatus, useCreateAppointment,
  useDeleteAppointment, useListClients, useListPets, useListServices,
  useListPackages, useCreateClient, useCreatePet, useSellPackage,
} from "@workspace/api-client-react";
import type {
  Client, Pet, Service, Package, SellPackageResult, PetInputSize,
} from "@workspace/api-client-react";
import { DEFAULT_TENANT_ID, PORTE_SIZES } from "@/lib/constants";
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
  ChevronRight as ArrowNext,
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type AppStatus = "aguardando" | "em_atendimento" | "concluido" | "cancelado";

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

function AppointmentCard({ appt, clients, pets, services, packages, onDelete, isDragging = false }: {
  appt: Appointment;
  clients: Client[];
  pets: Pet[];
  services: Service[];
  packages: Package[];
  onDelete: (id: number) => void;
  isDragging?: boolean;
}) {
  const pet = pets.find(p => p.id === appt.petId);
  const client = clients.find(c => c.id === appt.clientId);
  const service = services.find(s => s.id === appt.serviceId);
  const pkg = packages.find(p => p.id === appt.packageId);
  const time = new Date(appt.scheduledDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const price = Number(appt.totalPrice);

  const openWhatsapp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!client?.phone) return;
    const msg = `Olá ${client.name}! Confirmamos o agendamento de ${pet?.name ?? "seu pet"} para ${format(new Date(appt.scheduledDate), "dd/MM 'às' HH:mm")}. Serviço: ${service?.name ?? pkg?.name ?? "Serviço"}. Valor: ${formatBRL(price)}.`;
    const cleaned = client.phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleaned}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-3 cursor-grab active:cursor-grabbing select-none ${isDragging ? "opacity-50" : "hover:shadow-md"} transition-shadow`}>
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
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {time}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-primary">{formatBRL(price)}</span>
          {client?.phone && (
            <button onClick={openWhatsapp} className="p-1 rounded hover:bg-green-50 text-green-600 transition-colors" title="Enviar WhatsApp">
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DraggableCard({ appt, clients, pets, services, packages, onDelete }: {
  appt: Appointment;
  clients: Client[];
  pets: Pet[];
  services: Service[];
  packages: Package[];
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: appt.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <AppointmentCard appt={appt} clients={clients} pets={pets} services={services} packages={packages} onDelete={onDelete} isDragging={isDragging} />
    </div>
  );
}

function KanbanColumn({ status, label, color, bg, appointments, clients, pets, services, packages, onDelete }: {
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
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className={`flex flex-col rounded-xl border-2 ${bg} ${isOver ? "ring-2 ring-primary ring-offset-1" : ""} transition-all min-h-[400px]`}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-current/10">
        <span className={`font-semibold text-sm ${color}`}>{label}</span>
        <Badge variant="secondary" className="text-xs">{appointments.length}</Badge>
      </div>
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2 overflow-y-auto">
        {appointments.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">Nenhum agendamento</div>
        )}
        {appointments.map(appt => (
          <DraggableCard key={appt.id} appt={appt} clients={clients} pets={pets} services={services} packages={packages} onDelete={onDelete} />
        ))}
      </div>
    </div>
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
  const { toast } = useToast();
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeId, setActiveId] = useState<number | null>(null);

  // Casual modal
  const [casualOpen, setCasualOpen] = useState(false);
  const [casualStep, setCasualStep] = useState(0);
  const [casual, setCasual] = useState(emptyCasual);

  // Sell package modal
  const [sellOpen, setSellOpen] = useState(false);
  const [sell, setSell] = useState(emptySell);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const queryStart = view === "day" ? selectedDate : weekStart;
  const queryEnd = view === "day" ? selectedDate : addDays(weekStart, 6);

  const { data: appointments = [], refetch } = useListAppointments({
    tenantId: DEFAULT_TENANT_ID,
    startDate: queryStart.toISOString(),
    endDate: new Date(queryEnd.getFullYear(), queryEnd.getMonth(), queryEnd.getDate(), 23, 59, 59).toISOString(),
  });

  const { data: clients = [] } = useListClients({ tenantId: DEFAULT_TENANT_ID });
  const { data: allPets = [] } = useListPets({});
  const { data: services = [] } = useListServices({ tenantId: DEFAULT_TENANT_ID });
  const { data: packages = [] } = useListPackages({ tenantId: DEFAULT_TENANT_ID });

  // Pets for sell modal (filtered by selected client; clientId: 0 returns empty)
  const { data: sellClientPets = [] } = useListPets(
    sell.clientId ? { clientId: Number(sell.clientId) } : { clientId: 0 }
  );

  const updateStatus = useUpdateAppointmentStatus();
  const createAppointment = useCreateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const createClient = useCreateClient();
  const createPet = useCreatePet();
  const sellPackage = useSellPackage();

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
    setCasualOpen(true);
  };

  const casualNextStep = () => {
    if (casualStep === 0) {
      if (!casual.clientName.trim()) { toast({ title: "Nome do cliente é obrigatório", variant: "destructive" }); return; }
      if (!casual.clientPhone.trim()) { toast({ title: "Telefone é obrigatório", variant: "destructive" }); return; }
    }
    if (casualStep === 1) {
      if (!casual.petName.trim()) { toast({ title: "Nome do pet é obrigatório", variant: "destructive" }); return; }
      if (!casual.petSize) { toast({ title: "Porte do pet é obrigatório", variant: "destructive" }); return; }
    }
    setCasualStep(s => s + 1);
  };

  const handleCasualSave = async () => {
    if (!casual.serviceId) { toast({ title: "Selecione um serviço", variant: "destructive" }); return; }
    if (!casual.scheduledDate || !casual.scheduledTime) { toast({ title: "Data e horário são obrigatórios", variant: "destructive" }); return; }
    if (!casual.totalPrice) { toast({ title: "Informe o valor", variant: "destructive" }); return; }
    if (!casual.petSize) { toast({ title: "Porte do pet é obrigatório", variant: "destructive" }); return; }
    try {
      const newClient: Client = await createClient.mutateAsync({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          name: casual.clientName.trim(),
          phone: casual.clientPhone.trim(),
        },
      });
      const newPet: Pet = await createPet.mutateAsync({
        data: {
          clientId: newClient.id,
          name: casual.petName.trim(),
          breed: casual.petBreed.trim() || undefined,
          size: casual.petSize,
        },
      });
      const dt = new Date(`${casual.scheduledDate}T${casual.scheduledTime}:00`);
      await createAppointment.mutateAsync({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          clientId: newClient.id,
          petId: newPet.id,
          serviceId: Number(casual.serviceId),
          scheduledDate: dt.toISOString(),
          totalPrice: Number(casual.totalPrice),
          notes: casual.notes || undefined,
        },
      });
      toast({ title: "Agendamento criado!", description: `${casual.clientName} · ${casual.petName}` });
      setCasualOpen(false);
      refetch();
    } catch {
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
          tenantId: DEFAULT_TENANT_ID,
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
    } catch {
      toast({ title: "Erro ao vender pacote", variant: "destructive" });
    }
  };

  // ── Kanban helpers ────────────────────────────────────────────────────────
  const activeAppt = activeId ? (appointments as Appointment[]).find(a => a.id === activeId) : null;
  const filterForDay = (day: Date) => (appointments as Appointment[]).filter(a => isSameDay(new Date(a.scheduledDate), day));
  const filterByStatus = (status: AppStatus) =>
    (view === "day" ? filterForDay(selectedDate) : (appointments as Appointment[])).filter(a => a.status === status);

  const STEP_LABELS = ["Cliente", "Pet", "Agendamento"];

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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
                <div className="space-y-1.5">
                  <Label>Nome do cliente *</Label>
                  <Input
                    placeholder="Ex: Maria Silva"
                    value={casual.clientName}
                    onChange={e => setCasual(f => ({ ...f, clientName: e.target.value }))}
                    autoFocus
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
              <Button variant="outline" onClick={() => setCasualStep(s => s - 1)}>Voltar</Button>
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
