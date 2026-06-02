import { useState } from "react";
import { useListClients, useCreateClient, useUpdateClient, useDeleteClient, useListPets, useCreatePet, useUpdatePet, useDeletePet, getListPetsQueryKey } from "@workspace/api-client-react";
import type { PetInputSize } from "@workspace/api-client-react";
import { PORTE_SIZES } from "@/lib/constants";
import { useAppAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, PawPrint } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ── Tipos ────────────────────────────────────────────────────────────────────
type Client = {
  id: number; name: string; phone: string;
  email?: string | null; address?: string | null; notes?: string | null;
};

type Pet = {
  id: number; clientId: number; name: string;
  breed?: string | null; size: string; notes?: string | null;
  sex?: string | null; neutered?: boolean | null;
  coat?: string | null; behavior?: string | null; healthNotes?: string | null;
  photoUrl?: string | null; groomingPreferences?: string | null;
  petType?: string | null; frequency?: string | null;
  appointmentDay?: number | null; pricePerVisit?: string | null;
  firstVisitDate?: string | null;
};

// ── Constantes ───────────────────────────────────────────────────────────────
const DIAS_SEMANA: Record<number, string> = {
  0: "Domingo", 1: "Segunda-feira", 2: "Terça-feira",
  3: "Quarta-feira", 4: "Quinta-feira", 5: "Sexta-feira", 6: "Sábado",
};

const COAT_OPTIONS = [
  "Curta", "Longa", "Crespa / Encaracolada", "Dupla (undercoat)", "Lisa", "Áspera",
];

const emptyClient = { name: "", phone: "", email: "", address: "", notes: "" };

const emptyPet = {
  name: "", breed: "", size: "pequeno_curto", notes: "",
  sex: "", neutered: false,
  coat: "", behavior: "", healthNotes: "",
  photoUrl: "", groomingPreferences: "",
  petType: "eventual", frequency: "semanal",
  appointmentDay: 2, pricePerVisit: "", firstVisitDate: "",
};

// ── Componente principal ─────────────────────────────────────────────────────
export default function Clientes() {
  const { tenantId } = useAppAuth();
  const { toast } = useToast();
  const { data: clients = [], isLoading, refetch } = useListClients({ tenantId: tenantId! });
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyClient);
  const [expandedClient, setExpandedClient] = useState<number | null>(null);

  const [petModalOpen, setPetModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [petClientId, setPetClientId] = useState<number | null>(null);
  const [petForm, setPetForm] = useState(emptyPet);

  const petsParams = expandedClient ? { clientId: expandedClient } : { clientId: 0 };
  const { data: pets = [], refetch: refetchPets } = useListPets(petsParams, {
    query: { queryKey: getListPetsQueryKey(petsParams), enabled: !!expandedClient },
  });
  const createPet = useCreatePet();
  const updatePet = useUpdatePet();
  const deletePet = useDeletePet();

  const filtered = (clients as Client[]).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  // ── Handlers clientes ────────────────────────────────────────────────────
  const openCreate = () => { setEditingClient(null); setForm(emptyClient); setModalOpen(true); };
  const openEdit = (c: Client) => {
    setEditingClient(c);
    setForm({ name: c.name, phone: c.phone, email: c.email ?? "", address: c.address ?? "", notes: c.notes ?? "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingClient) {
        await updateClient.mutateAsync({ id: editingClient.id, data: form });
        toast({ title: "Cliente atualizado!" });
      } else {
        await createClient.mutateAsync({ data: { ...form, tenantId: tenantId! } });
        toast({ title: "Cliente criado!" });
      }
      setModalOpen(false);
      refetch();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este cliente e todos os seus pets?")) return;
    await deleteClient.mutateAsync({ id });
    refetch();
  };

  // ── Handlers pets ────────────────────────────────────────────────────────
  const openAddPet = (clientId: number) => {
    setEditingPet(null);
    setPetClientId(clientId);
    setPetForm(emptyPet);
    setPetModalOpen(true);
  };

  const openEditPet = (pet: Pet) => {
    setEditingPet(pet);
    setPetClientId(pet.clientId);
    setPetForm({
      name: pet.name,
      breed: pet.breed ?? "",
      size: pet.size,
      notes: pet.notes ?? "",
      sex: pet.sex ?? "",
      neutered: pet.neutered ?? false,
      coat: pet.coat ?? "",
      behavior: pet.behavior ?? "",
      healthNotes: pet.healthNotes ?? "",
      photoUrl: pet.photoUrl ?? "",
      groomingPreferences: pet.groomingPreferences ?? "",
      petType: pet.petType ?? "eventual",
      frequency: pet.frequency ?? "semanal",
      appointmentDay: pet.appointmentDay ?? 2,
      pricePerVisit: pet.pricePerVisit ?? "",
      firstVisitDate: pet.firstVisitDate ? pet.firstVisitDate.slice(0, 10) : "",
    });
    setPetModalOpen(true);
  };

  const handleSavePet = async () => {
    if (!petClientId) return;
    const isPacotista = petForm.petType === "pacotista";
    const payload = {
      name: petForm.name,
      breed: petForm.breed || null,
      size: petForm.size as PetInputSize,
      notes: petForm.notes || null,
      sex: petForm.sex || null,
      neutered: petForm.neutered,
      coat: petForm.coat || null,
      behavior: petForm.behavior || null,
      healthNotes: petForm.healthNotes || null,
      photoUrl: petForm.photoUrl || null,
      groomingPreferences: petForm.groomingPreferences || null,
      petType: petForm.petType,
      frequency: isPacotista ? petForm.frequency : null,
      appointmentDay: isPacotista ? Number(petForm.appointmentDay) : null,
      pricePerVisit: isPacotista && petForm.pricePerVisit ? petForm.pricePerVisit : null,
      firstVisitDate: isPacotista && petForm.frequency === "quinzenal" && petForm.firstVisitDate
        ? new Date(petForm.firstVisitDate).toISOString()
        : null,
      clientId: petClientId,
    };

    try {
      if (editingPet) {
        await updatePet.mutateAsync({ id: editingPet.id, data: payload });
        toast({ title: "Pet atualizado!" });
      } else {
        await createPet.mutateAsync({ data: payload });
        toast({ title: "Pet adicionado!" });
      }
      setPetModalOpen(false);
      setPetForm(emptyPet);
      setEditingPet(null);
      if (expandedClient === petClientId) refetchPets();
    } catch {
      toast({ title: "Erro ao salvar pet", variant: "destructive" });
    }
  };

  const handleDeletePet = async (id: number) => {
    if (!confirm("Excluir este pet?")) return;
    await deletePet.mutateAsync({ id });
    refetchPets();
  };

  const isPacotista = petForm.petType === "pacotista";

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes e pets</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
      </div>

      <Input placeholder="Buscar por nome ou telefone..." value={search}
        onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      {isLoading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum cliente encontrado.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(client => (
            <Card key={client.id}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.phone}{client.email ? ` • ${client.email}` : ""}
                    </p>
                    {client.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{client.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => openAddPet(client.id)}>
                      <PawPrint className="h-4 w-4 mr-1" />Pet
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(client)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    <Button variant="ghost" size="icon"
                      onClick={() => setExpandedClient(expandedClient === client.id ? null : client.id)}>
                      {expandedClient === client.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {expandedClient === client.id && (
                  <div className="border-t px-4 py-3 bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Pets</p>
                    {(pets as Pet[]).filter(p => p.clientId === client.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum pet cadastrado.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(pets as Pet[]).filter(p => p.clientId === client.id).map(pet => (
                          <div key={pet.id} className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5">
                            <PawPrint className="h-3 w-3 text-primary" />
                            <span className="text-sm font-medium">{pet.name}</span>
                            {pet.breed && <span className="text-xs text-muted-foreground">{pet.breed}</span>}
                            <Badge variant="secondary" className="text-xs">
                              {PORTE_SIZES[pet.size as keyof typeof PORTE_SIZES] ?? pet.size}
                            </Badge>
                            {pet.petType === "pacotista" ? (
                              <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                                Pacotista · {pet.frequency === "quinzenal" ? "Quinzenal" : "Semanal"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Eventual</Badge>
                            )}
                            <Button variant="ghost" size="icon" className="h-5 w-5"
                              onClick={() => openEditPet(pet)}><Pencil className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5"
                              onClick={() => handleDeletePet(pet.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Modal Cliente ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Telefone / WhatsApp *</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(44) 99999-9999" /></div>
            <div><Label>E-mail</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Endereço</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.phone}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Pet ── */}
      <Dialog open={petModalOpen} onOpenChange={setPetModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPet ? "Editar Pet" : "Adicionar Pet"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">

            {/* Tipo de cliente */}
            <div>
              <Label>Tipo *</Label>
              <Select value={petForm.petType} onValueChange={v => setPetForm(f => ({ ...f, petType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="eventual">Eventual (avulso)</SelectItem>
                  <SelectItem value="pacotista">Pacotista (plano mensal)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Identificação */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nome do Pet *</Label>
                <Input value={petForm.name} onChange={e => setPetForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div><Label>Raça</Label>
                <Input value={petForm.breed} onChange={e => setPetForm(f => ({ ...f, breed: e.target.value }))} />
              </div>
              <div>
                <Label>Porte / Pelagem *</Label>
                <Select value={petForm.size} onValueChange={v => setPetForm(f => ({ ...f, size: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PORTE_SIZES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sexo</Label>
                <Select value={petForm.sex} onValueChange={v => setPetForm(f => ({ ...f, sex: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="macho">Macho</SelectItem>
                    <SelectItem value="femea">Fêmea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Castrado?</Label>
                <Select value={petForm.neutered ? "sim" : "nao"} onValueChange={v => setPetForm(f => ({ ...f, neutered: v === "sim" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pelagem e saúde */}
            <div>
              <Label>Tipo de Pelagem</Label>
              <Select value={petForm.coat} onValueChange={v => setPetForm(f => ({ ...f, coat: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {COAT_OPTIONS.map(o => <SelectItem key={o} value={o.toLowerCase()}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Comportamento</Label>
              <Input placeholder="Ex: agitado, morde, assustado..." value={petForm.behavior}
                onChange={e => setPetForm(f => ({ ...f, behavior: e.target.value }))} />
            </div>
            <div><Label>Saúde / Alergias</Label>
              <Input placeholder="Ex: alergia a determinado shampoo..." value={petForm.healthNotes}
                onChange={e => setPetForm(f => ({ ...f, healthNotes: e.target.value }))} />
            </div>
            <div><Label>Preferências de Tosa</Label>
              <Input placeholder="Ex: tosa curta no corpo, franja longa..." value={petForm.groomingPreferences}
                onChange={e => setPetForm(f => ({ ...f, groomingPreferences: e.target.value }))} />
            </div>

            {/* Campos exclusivos de pacotista */}
            {isPacotista && (
              <div className="space-y-3 border rounded-lg p-3 bg-purple-50/50">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Configuração do Plano</p>

                <div>
                  <Label>Frequência *</Label>
                  <Select value={petForm.frequency} onValueChange={v => setPetForm(f => ({ ...f, frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal (toda semana)</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal (a cada 2 semanas — raças peludas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Dia fixo da semana *</Label>
                  <Select value={String(petForm.appointmentDay)}
                    onValueChange={v => setPetForm(f => ({ ...f, appointmentDay: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DIAS_SEMANA).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    O sistema calcula automaticamente quantas visitas cabem no mês.
                  </p>
                </div>

                <div>
                  <Label>Preço por visita (R$)</Label>
                  <Input type="number" step="0.01" placeholder="Ex: 45.00" value={petForm.pricePerVisit}
                    onChange={e => setPetForm(f => ({ ...f, pricePerVisit: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor cobrado por visita com desconto do pacote. Total do mês = visitas × preço.
                  </p>
                </div>

                {petForm.frequency === "quinzenal" && (
                  <div>
                    <Label>Data da primeira visita do pacote *</Label>
                    <Input type="date" value={petForm.firstVisitDate}
                      onChange={e => setPetForm(f => ({ ...f, firstVisitDate: e.target.value }))} />
                    <p className="text-xs text-muted-foreground mt-1">
                      Usado para calcular quais terças (ou dia fixo) são deste pet no calendário quinzenal.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div><Label>Observações gerais</Label>
              <Textarea value={petForm.notes} onChange={e => setPetForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setPetModalOpen(false); setEditingPet(null); }}>Cancelar</Button>
            <Button onClick={handleSavePet} disabled={!petForm.name}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}