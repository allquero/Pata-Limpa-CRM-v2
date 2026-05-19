import { useState } from "react";
import { useListClients, useCreateClient, useUpdateClient, useDeleteClient, useListPets, useCreatePet, useDeletePet, getListPetsQueryKey } from "@workspace/api-client-react";
import type { PetInputSize } from "@workspace/api-client-react";
import { DEFAULT_TENANT_ID, PORTE_SIZES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, PawPrint } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Client = { id: number; name: string; phone: string; email?: string | null; address?: string | null; notes?: string | null };
type Pet = { id: number; clientId: number; name: string; breed?: string | null; size: string; notes?: string | null };

const emptyClient = { name: "", phone: "", email: "", address: "", notes: "" };
const emptyPet = { name: "", breed: "", size: "mini_longo", notes: "" };

export default function Clientes() {
  const { toast } = useToast();
  const { data: clients = [], isLoading, refetch } = useListClients({ tenantId: DEFAULT_TENANT_ID });
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyClient);
  const [expandedClient, setExpandedClient] = useState<number | null>(null);
  const [petModalOpen, setPetModalOpen] = useState(false);
  const [petClientId, setPetClientId] = useState<number | null>(null);
  const [petForm, setPetForm] = useState(emptyPet);

  const petsParams = expandedClient ? { clientId: expandedClient } : { clientId: 0 };
  const { data: pets = [], refetch: refetchPets } = useListPets(petsParams, {
    query: { queryKey: getListPetsQueryKey(petsParams), enabled: !!expandedClient },
  });
  const createPet = useCreatePet();
  const deletePet = useDeletePet();

  const filtered = (clients as Client[]).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const openCreate = () => { setEditingClient(null); setForm(emptyClient); setModalOpen(true); };
  const openEdit = (c: Client) => { setEditingClient(c); setForm({ name: c.name, phone: c.phone, email: c.email ?? "", address: c.address ?? "", notes: c.notes ?? "" }); setModalOpen(true); };

  const handleSave = async () => {
    try {
      if (editingClient) {
        await updateClient.mutateAsync({ id: editingClient.id, data: form });
        toast({ title: "Cliente atualizado!" });
      } else {
        await createClient.mutateAsync({ data: { ...form, tenantId: DEFAULT_TENANT_ID } });
        toast({ title: "Cliente criado!" });
      }
      setModalOpen(false);
      refetch();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este cliente?")) return;
    await deleteClient.mutateAsync({ id });
    refetch();
  };

  const handleSavePet = async () => {
    if (!petClientId) return;
    try {
      await createPet.mutateAsync({ data: { ...petForm, size: petForm.size as PetInputSize, clientId: petClientId } });
      toast({ title: "Pet adicionado!" });
      setPetModalOpen(false);
      setPetForm(emptyPet);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes e pets</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
      </div>

      <Input placeholder="Buscar por nome ou telefone..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

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
                    <p className="text-sm text-muted-foreground">{client.phone}{client.email ? ` • ${client.email}` : ""}</p>
                    {client.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{client.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => { setPetClientId(client.id); setPetModalOpen(true); }}>
                      <PawPrint className="h-4 w-4 mr-1" />Pet
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(client)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setExpandedClient(expandedClient === client.id ? null : client.id)}>
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
                            <Badge variant="secondary" className="text-xs">{PORTE_SIZES[pet.size as keyof typeof PORTE_SIZES] ?? pet.size}</Badge>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDeletePet(pet.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Telefone / WhatsApp *</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" /></div>
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

      <Dialog open={petModalOpen} onOpenChange={setPetModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Pet</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome do Pet *</Label><Input value={petForm.name} onChange={e => setPetForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Raça</Label><Input value={petForm.breed} onChange={e => setPetForm(f => ({ ...f, breed: e.target.value }))} /></div>
            <div>
              <Label>Porte / Pelagem *</Label>
              <Select value={petForm.size} onValueChange={v => setPetForm(f => ({ ...f, size: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PORTE_SIZES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Observações</Label><Textarea value={petForm.notes} onChange={e => setPetForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPetModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePet} disabled={!petForm.name}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
