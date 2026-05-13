import { useState, useCallback } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import {
  useListAppointments, useUpdateAppointmentStatus, useCreateAppointment,
  useDeleteAppointment, useListClients, useListPets, useListServices, useListPackages
} from "@workspace/api-client-react";
import { DEFAULT_TENANT_ID, APPOINTMENT_STATUSES, PORTE_SIZES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronLeft, ChevronRight, Clock, PawPrint, MessageSquare } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

type AppStatus = "aguardando" | "em_atendimento" | "concluido" | "cancelado";

type Appointment = {
  id: number;
  petId: number;
  clientId: number;
  serviceId?: number | null;
  packageId?: number | null;
  scheduledDate: string;
  status: AppStatus;
  totalPrice: string;
  notes?: string | null;
};

const COLUMNS: { id: AppStatus; label: string; color: string; bg: string }[] = [
  { id: "aguardando", label: "Aguardando", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  { id: "em_atendimento", label: "Em Atendimento", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  { id: "concluido", label: "Concluído", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  { id: "cancelado", label: "Cancelado", color: "text-red-700", bg: "bg-red-50 border-red-200" },
];

const statusDot: Record<string, string> = {
  aguardando: "bg-yellow-400",
  em_atendimento: "bg-blue-500",
  concluido: "bg-green-500",
  cancelado: "bg-red-400",
};

function AppointmentCard({ appt, clients, pets, services, packages, onDelete, isDragging = false }: {
  appt: Appointment;
  clients: any[];
  pets: any[];
  services: any[];
  packages: any[];
  onDelete: (id: number) => void;
  isDragging?: boolean;
}) {
  const pet = pets.find(p => p.id === appt.petId);
  const client = clients.find(c => c.id === appt.clientId);
  const service = services.find(s => s.id === appt.serviceId);
  const pkg = packages.find(p => p.id === appt.packageId);
  const time = new Date(appt.scheduledDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const openWhatsapp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!client?.phone) return;
    const msg = `Olá ${client.name}! Confirmamos o agendamento de ${pet?.name ?? "seu pet"} para ${format(new Date(appt.scheduledDate), "dd/MM 'às' HH:mm")}. Serviço: ${service?.name ?? pkg?.name ?? "Serviço"}. Valor: R$ ${Number(appt.totalPrice).toFixed(2)}.`;
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
            {pet?.size && <Badge variant="secondary" className="text-xs px-1 py-0">{PORTE_SIZES[pet.size as keyof typeof PORTE_SIZES] ?? pet.size}</Badge>}
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
          <span className="text-xs font-semibold text-primary">R$ {Number(appt.totalPrice).toFixed(2)}</span>
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
  clients: any[];
  pets: any[];
  services: any[];
  packages: any[];
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
  clients: any[];
  pets: any[];
  services: any[];
  packages: any[];
  onDelete: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className={`flex flex-col rounded-xl border-2 ${bg} ${isOver ? "ring-2 ring-primary ring-offset-1" : ""} transition-all min-h-[400px]`}>
      <div className={`flex items-center justify-between px-3 py-2.5 border-b border-current/10`}>
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

const emptyForm = {
  petId: "",
  clientId: "",
  serviceId: "",
  packageId: "",
  scheduledDate: new Date().toISOString().substring(0, 10),
  scheduledTime: "09:00",
  totalPrice: "",
  notes: "",
  recurringWeeks: "0",
  status: "aguardando" as AppStatus,
};

export default function Agendamentos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [usePackage, setUsePackage] = useState(false);

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

  const updateStatus = useUpdateAppointmentStatus();
  const createAppointment = useCreateAppointment();
  const deleteAppointment = useDeleteAppointment();

  const clientPets = (allPets as any[]).filter(p => p.clientId === Number(form.clientId));
  const selectedPet = (allPets as any[]).find(p => p.id === Number(form.petId));
  const petSize = selectedPet?.size ?? null;

  // Only show services that match the pet's size; if no pet selected, show all
  const filteredServices = petSize
    ? (services as any[]).filter(s => s.size === petSize)
    : (services as any[]);

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

  const handleSave = async () => {
    try {
      const dt = new Date(`${form.scheduledDate}T${form.scheduledTime}:00`);
      const payload: any = {
        tenantId: DEFAULT_TENANT_ID,
        petId: Number(form.petId),
        clientId: Number(form.clientId),
        scheduledDate: dt.toISOString(),
        status: form.status,
        totalPrice: form.totalPrice,
        notes: form.notes || undefined,
        recurringWeeks: Number(form.recurringWeeks) || undefined,
      };
      if (usePackage && form.packageId) payload.packageId = Number(form.packageId);
      else if (!usePackage && form.serviceId) payload.serviceId = Number(form.serviceId);

      await createAppointment.mutateAsync({ data: payload });
      toast({ title: Number(form.recurringWeeks) > 0 ? `${Number(form.recurringWeeks) + 1} agendamentos criados!` : "Agendamento criado!" });
      setModalOpen(false);
      setForm(emptyForm);
      refetch();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este agendamento?")) return;
    await deleteAppointment.mutateAsync({ id });
    refetch();
  };

  const activeAppt = activeId ? (appointments as Appointment[]).find(a => a.id === activeId) : null;

  const filterForDay = (day: Date) =>
    (appointments as Appointment[]).filter(a => isSameDay(new Date(a.scheduledDate), day));

  const filterByStatus = (status: AppStatus) =>
    (view === "day"
      ? filterForDay(selectedDate)
      : (appointments as Appointment[])
    ).filter(a => a.status === status);

  const autoFillPrice = (serviceId: string, packageId: string) => {
    if (usePackage && packageId) {
      const pkg = (packages as any[]).find(p => p.id === Number(packageId));
      if (pkg) setForm(f => ({ ...f, totalPrice: String(pkg.price) }));
    } else if (!usePackage && serviceId) {
      const svc = (services as any[]).find(s => s.id === Number(serviceId));
      if (svc) setForm(f => ({ ...f, totalPrice: String(svc.price) }));
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground">Kanban de atendimentos</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo Agendamento</Button>
      </div>

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
              clients={clients as any[]}
              pets={allPets as any[]}
              services={services as any[]}
              packages={packages as any[]}
              onDelete={handleDelete}
            />
          ))}
        </div>
        <DragOverlay>
          {activeAppt && (
            <div className="shadow-2xl rotate-1 scale-105">
              <AppointmentCard
                appt={activeAppt}
                clients={clients as any[]}
                pets={allPets as any[]}
                services={services as any[]}
                packages={packages as any[]}
                onDelete={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label>Cliente *</Label>
              <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v, petId: "" }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                <SelectContent>
                  {(clients as any[]).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pet *</Label>
              <Select
                value={form.petId}
                onValueChange={v => setForm(f => ({ ...f, petId: v, serviceId: "", totalPrice: "" }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar pet" /></SelectTrigger>
                <SelectContent>
                  {clientPets.length === 0 && <SelectItem value="_none" disabled>Selecione um cliente primeiro</SelectItem>}
                  {clientPets.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                      {p.size && <span className="text-muted-foreground"> · {PORTE_SIZES[p.size as keyof typeof PORTE_SIZES] ?? p.size}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {petSize && (
                <p className="text-xs text-muted-foreground mt-1">
                  Porte: <span className="font-medium text-foreground">{PORTE_SIZES[petSize as keyof typeof PORTE_SIZES] ?? petSize}</span> — serviços filtrados automaticamente
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={usePackage} onCheckedChange={setUsePackage} id="use-package" />
              <Label htmlFor="use-package">{usePackage ? "Usar pacote" : "Usar serviço avulso"}</Label>
            </div>
            {!usePackage ? (
              <div>
                <Label>Serviço *</Label>
                <Select
                  value={form.serviceId}
                  onValueChange={v => { setForm(f => ({ ...f, serviceId: v })); autoFillPrice(v, form.packageId); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={form.petId ? "Selecionar serviço" : "Selecione um pet primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredServices.length === 0 && (
                      <SelectItem value="_none" disabled>Nenhum serviço para este porte</SelectItem>
                    )}
                    {filteredServices.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} — R$ {Number(s.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Pacote *</Label>
                <Select value={form.packageId} onValueChange={v => { setForm(f => ({ ...f, packageId: v })); autoFillPrice(form.serviceId, v); }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar pacote" /></SelectTrigger>
                  <SelectContent>
                    {(packages as any[]).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name} — R$ {Number(p.price).toFixed(2)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data *</Label><Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} /></div>
              <div><Label>Horário *</Label><Input type="time" value={form.scheduledTime} onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))} /></div>
            </div>
            <div><Label>Valor Total (R$) *</Label><Input type="number" step="0.01" value={form.totalPrice} onChange={e => setForm(f => ({ ...f, totalPrice: e.target.value }))} /></div>
            <div>
              <Label>Repetir por quantas semanas? <span className="text-muted-foreground text-xs">(0 = sem recorrência)</span></Label>
              <Input type="number" min="0" max="52" value={form.recurringWeeks} onChange={e => setForm(f => ({ ...f, recurringWeeks: e.target.value }))} className="w-32" />
              {Number(form.recurringWeeks) > 0 && (
                <p className="text-xs text-primary mt-1">Serão criados {Number(form.recurringWeeks) + 1} agendamentos (1 hoje + {form.recurringWeeks} repetições semanais)</p>
              )}
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.clientId || !form.petId || !form.totalPrice}>
              {Number(form.recurringWeeks) > 0 ? `Criar ${Number(form.recurringWeeks) + 1} agendamentos` : "Criar Agendamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
