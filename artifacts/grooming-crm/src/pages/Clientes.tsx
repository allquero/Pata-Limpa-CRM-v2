import { useState, useRef } from "react";
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
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, PawPrint, Download, Upload, FileDown, AlertCircle, CheckCircle2 } from "lucide-react";
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
  senior?: boolean | null;
};

type ImportError = { line: number; message: string };
type ImportResult = {
  created: { clients: number; pets: number };
  skipped: { clients: number; pets: number };
  errors: ImportError[];
};

// ── Constantes ───────────────────────────────────────────────────────────────
const COAT_OPTIONS = [
  "Curta", "Longa", "Crespa / Encaracolada", "Dupla (undercoat)", "Lisa", "Áspera",
];

const emptyClient = { name: "", phone: "", email: "", address: "", notes: "" };

const emptyPet = {
  name: "", breed: "", size: "pequeno_curto", notes: "",
  sex: "", neutered: false,
  coat: "", behavior: "", healthNotes: "",
  photoUrl: "", groomingPreferences: "",
  senior: false,
};

const CSV_MODELO = `nome_cliente,telefone,email,endereco,notas_cliente,nome_pet,raca,porte,sexo,castrado,pelagem,comportamento,saude,preferencias_tosa,notas_pet
Maria Silva,(44) 99999-0001,maria@email.com,Rua das Flores 10,,Rex,Poodle,pequeno_longo,macho,nao,longa,agitado,,tosa curta no corpo,
Maria Silva,(44) 99999-0001,,,, Mel,Shih Tzu,mini_longo,femea,sim,longa,,alergia a shampoo forte,,
João Costa,(44) 99999-0002,,,,Thor,Labrador,grande_curto,macho,nao,curta,,,, 
`;

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

  // ── Import/Export state ──────────────────────────────────────────────────
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      senior: pet.senior ?? false,
    });
    setPetModalOpen(true);
  };

  const handleSavePet = async () => {
    if (!petClientId) return;
    const payload = {
      name: petForm.name,
      breed: petForm.breed || undefined,
      size: petForm.size as PetInputSize,
      notes: petForm.notes || undefined,
      sex: (petForm.sex || undefined) as "macho" | "femea" | undefined,
      neutered: petForm.neutered,
      coat: petForm.coat || undefined,
      behavior: petForm.behavior || undefined,
      healthNotes: petForm.healthNotes || undefined,
      photoUrl: petForm.photoUrl || undefined,
      groomingPreferences: petForm.groomingPreferences || undefined,
      senior: petForm.senior,
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

  // ── Handlers import/export ───────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const res = await fetch("/api/clients/export", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao exportar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clientes.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erro ao exportar clientes", variant: "destructive" });
    }
  };

  const handleDownloadModelo = () => {
    const blob = new Blob([CSV_MODELO], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_importacao.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/clients/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Erro ao importar", variant: "destructive" });
        return;
      }
      setImportResult(data as ImportResult);
      refetch();
    } catch {
      toast({ title: "Erro ao importar arquivo", variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 pl-[10px] pr-[10px] pt-[10px] pb-[10px] text-[14px]">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-[13px] text-[14px]">
        <div>
          <h1 className="font-bold text-[22px]">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes e pets</p>
        </div>
        <div className="flex items-center flex-wrap justify-start gap-[4px] text-[10px]">
          <Button variant="outline" onClick={handleExport} className="pl-[10px] pr-[10px] pt-[8px] pb-[8px] text-[14px]">
            <Download className="h-4 w-4 mr-2" />Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => { setImportResult(null); setImportModalOpen(true); }} className="pl-[10px] pr-[10px] text-[14px]">
            <Upload className="h-4 w-4 mr-2" />Importar CSV
          </Button>
          <Button onClick={openCreate} className="pl-[10px] pr-[10px] text-[14px]"><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
        </div>
      </div>
      <Input placeholder="Buscar por nome ou telefone..." value={search}
        onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      {isLoading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum cliente encontrado.</CardContent></Card>
      ) : (
        <div className="space-y-3 pt-[0px] pb-[0px]">
          {filtered.map(client => (
            <Card key={client.id}>
              <CardContent className="p-0">
                <div className="flex items-center p-4 pt-[6px] pb-[6px] justify-between text-left text-[14px] pl-[12px] pr-[12px]">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedClient(expandedClient === client.id ? null : client.id)}>
                    <p className="font-semibold truncate">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.phone}{client.email ? ` • ${client.email}` : ""}
                    </p>
                    {client.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{client.notes}</p>}
                  </div>
                  <div className="flex gap-[4px] items-center ml-[0px] pt-[0px] pb-[0px] pl-[0px] pr-[0px] flex-row mr-[0px] mb-[0px] justify-between text-left">
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
                  <div className="border-t px-4 py-3 bg-muted/30 pl-[6px] pr-[6px] pt-[6px] pb-[6px]">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Pets</p>
                    {(pets as Pet[]).filter(p => p.clientId === client.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum pet cadastrado.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(pets as Pet[]).filter(p => p.clientId === client.id).map(pet => (
                          <div key={pet.id} className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 pl-[10px] pr-[10px] pt-[4px] pb-[4px] ${pet.senior ? "bg-amber-50 border-amber-300" : "bg-card"}`}>
                            <PawPrint className={`h-3 w-3 ${pet.senior ? "text-amber-500" : "text-primary"}`} />
                            <span className="text-sm font-medium">{pet.name}</span>
                            {pet.senior && <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0">Idoso</Badge>}
                            {pet.breed && <span className="text-xs text-muted-foreground">{pet.breed}</span>}
                            <Badge variant="secondary" className="text-xs">
                              {PORTE_SIZES[pet.size as keyof typeof PORTE_SIZES] ?? pet.size}
                            </Badge>
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

            {/* Idoso */}
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${petForm.senior ? "bg-amber-50 border-amber-300" : "bg-muted/20"}`}
              onClick={() => setPetForm(f => ({ ...f, senior: !f.senior }))}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Pet Idoso</span>
                <span className="text-xs text-muted-foreground">Requer cuidados especiais</span>
              </div>
              <div className={`w-10 h-5 rounded-full transition-colors relative ${petForm.senior ? "bg-amber-400" : "bg-muted-foreground/30"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${petForm.senior ? "left-5" : "left-0.5"}`} />
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
      {/* ── Modal Importar CSV ── */}
      <Dialog open={importModalOpen} onOpenChange={v => { setImportModalOpen(v); if (!v) setImportResult(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Importar Clientes e Pets
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!importResult ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Faça upload de um arquivo CSV com os dados dos clientes e pets. Clientes duplicados
                  (mesmo nome + telefone) serão ignorados.
                </p>

                <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg border border-dashed">
                  <FileDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">Precisa do modelo?</p>
                    <p className="text-xs text-muted-foreground">Baixe o CSV de exemplo com os cabeçalhos corretos</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadModelo}>
                    Baixar modelo
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Arquivo CSV *</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleImport(file);
                    }}
                    disabled={importing}
                    className="cursor-pointer"
                  />
                  {importing && (
                    <p className="text-xs text-muted-foreground animate-pulse">Importando... aguarde.</p>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Campos aceitos:</p>
                  <p className="font-mono bg-muted rounded p-2 text-[10px] leading-relaxed break-all">
                    nome_cliente, telefone, email, endereco, notas_cliente,<br />
                    nome_pet, raca, porte, sexo, castrado, pelagem, comportamento,<br />
                    saude, preferencias_tosa, tipo_pet, frequencia, dia_semana,<br />
                    preco_por_visita, notas_pet
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {/* Resumo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-semibold text-green-700">Criados</span>
                    </div>
                    <p className="text-sm text-green-800">
                      <span className="font-bold">{importResult.created.clients}</span> cliente{importResult.created.clients !== 1 ? "s" : ""}
                    </p>
                    <p className="text-sm text-green-800">
                      <span className="font-bold">{importResult.created.pets}</span> pet{importResult.created.pets !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-700">Já existiam</span>
                    </div>
                    <p className="text-sm text-amber-800">
                      <span className="font-bold">{importResult.skipped.clients}</span> cliente{importResult.skipped.clients !== 1 ? "s" : ""}
                    </p>
                    <p className="text-sm text-amber-800">
                      <span className="font-bold">{importResult.skipped.pets}</span> pet{importResult.skipped.pets !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Erros */}
                {importResult.errors.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-destructive">
                      {importResult.errors.length} erro{importResult.errors.length !== 1 ? "s" : ""} encontrado{importResult.errors.length !== 1 ? "s" : ""}:
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {importResult.errors.map((e, i) => (
                        <div key={i} className="text-xs bg-red-50 border border-red-200 rounded px-2 py-1.5">
                          <span className="font-medium">Linha {e.line}:</span> {e.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setImportResult(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                >
                  Importar outro arquivo
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportModalOpen(false); setImportResult(null); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
