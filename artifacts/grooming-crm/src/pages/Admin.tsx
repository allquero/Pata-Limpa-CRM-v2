import { useState, useEffect, useCallback } from "react";
import { PawPrint, LogOut, Building2, Users, DollarSign, Plus, Pencil, Trash2, Check, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAppAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

interface Tenant {
  id: number;
  userId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  accessStart: string | null;
  accessEnd: string | null;
  createdAt: string;
}

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

interface AdminSale {
  id: number;
  tenantId: number;
  description: string;
  amount: string;
  paidAt: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

interface SalesResponse {
  sales: AdminSale[];
  monthTotal: number;
  yearTotal: number;
  allTimeTotal: number;
}

function accessStatusLabel(tenant: Tenant) {
  const { accessStart, accessEnd } = tenant;
  if (!accessStart || !accessEnd) return { label: "Pendente", variant: "secondary" as const };
  const today = new Date().toISOString().slice(0, 10);
  if (today < accessStart) return { label: "Não iniciado", variant: "outline" as const };
  if (today > accessEnd) return { label: "Expirado", variant: "destructive" as const };
  return { label: "Ativo", variant: "default" as const };
}

function fmt(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("pt-BR");
}

function fmtCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Admin() {
  const { logout } = useAppAuth();
  const { toast } = useToast();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [salesData, setSalesData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", address: "", accessStart: "", accessEnd: "" });

  const [newTenantForm, setNewTenantForm] = useState({ userId: "", name: "", phone: "", email: "", address: "", accessStart: "", accessEnd: "" });
  const [showNewTenant, setShowNewTenant] = useState(false);

  const [newSaleForm, setNewSaleForm] = useState({ tenantId: "", description: "", amount: "", paidAt: "", periodStart: "", periodEnd: "" });
  const [showNewSale, setShowNewSale] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, u, s] = await Promise.all([
        fetch("/api/admin/tenants", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/admin/pending-users", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/admin/sales", { credentials: "include" }).then((r) => r.json()),
      ]);
      setTenants(t);
      setPendingUsers(u);
      setSalesData(s);
    } catch {
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleSaveTenant() {
    if (!editingTenant) return;
    const res = await fetch(`/api/admin/tenants/${editingTenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: editForm.name || undefined,
        phone: editForm.phone || null,
        email: editForm.email || null,
        address: editForm.address || null,
        accessStart: editForm.accessStart || null,
        accessEnd: editForm.accessEnd || null,
      }),
    });
    if (res.ok) {
      toast({ title: "Pet shop atualizado com sucesso" });
      setEditingTenant(null);
      fetchAll();
    } else {
      const err = await res.json();
      toast({ title: "Erro ao atualizar", description: err.error, variant: "destructive" });
    }
  }

  async function handleDeleteTenant(id: number) {
    if (!confirm("Tem certeza que deseja excluir este pet shop? Esta ação não pode ser desfeita.")) return;
    const res = await fetch(`/api/admin/tenants/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      toast({ title: "Pet shop excluído" });
      fetchAll();
    } else {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  }

  async function handleCreateTenant() {
    const res = await fetch("/api/admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        userId: newTenantForm.userId,
        name: newTenantForm.name,
        phone: newTenantForm.phone || undefined,
        email: newTenantForm.email || undefined,
        address: newTenantForm.address || undefined,
        accessStart: newTenantForm.accessStart || undefined,
        accessEnd: newTenantForm.accessEnd || undefined,
      }),
    });
    if (res.ok) {
      toast({ title: "Pet shop cadastrado com sucesso" });
      setShowNewTenant(false);
      setNewTenantForm({ userId: "", name: "", phone: "", email: "", address: "", accessStart: "", accessEnd: "" });
      fetchAll();
    } else {
      const err = await res.json();
      toast({ title: "Erro ao cadastrar", description: err.error, variant: "destructive" });
    }
  }

  async function handleCreateSale() {
    const res = await fetch("/api/admin/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        tenantId: Number(newSaleForm.tenantId),
        description: newSaleForm.description,
        amount: Number(newSaleForm.amount),
        paidAt: newSaleForm.paidAt,
        periodStart: newSaleForm.periodStart,
        periodEnd: newSaleForm.periodEnd,
      }),
    });
    if (res.ok) {
      toast({ title: "Venda registrada e período de acesso atualizado" });
      setShowNewSale(false);
      setNewSaleForm({ tenantId: "", description: "", amount: "", paidAt: "", periodStart: "", periodEnd: "" });
      fetchAll();
    } else {
      const err = await res.json();
      toast({ title: "Erro ao registrar venda", description: err.error, variant: "destructive" });
    }
  }

  async function handleDeleteSale(id: number) {
    if (!confirm("Excluir este lançamento?")) return;
    const res = await fetch(`/api/admin/sales/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      toast({ title: "Lançamento excluído" });
      fetchAll();
    } else {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  }

  function startEdit(t: Tenant) {
    setEditingTenant(t);
    setEditForm({
      name: t.name,
      phone: t.phone ?? "",
      email: t.email ?? "",
      address: t.address ?? "",
      accessStart: t.accessStart ?? "",
      accessEnd: t.accessEnd ?? "",
    });
  }

  function prefillFromUser(user: AdminUser) {
    setNewTenantForm((f) => ({ ...f, userId: user.id, name: user.firstName ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}` : "" }));
    setShowNewTenant(true);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <PawPrint className="h-6 w-6" />
          <span>Pata Limpa</span>
          <Badge variant="secondary" className="ml-2 text-xs">Admin</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <Tabs defaultValue="petshops">
          <TabsList className="mb-6">
            <TabsTrigger value="petshops">
              <Building2 className="h-4 w-4 mr-2" />
              Pet Shops ({tenants.length})
            </TabsTrigger>
            <TabsTrigger value="usuarios">
              <Users className="h-4 w-4 mr-2" />
              Usuários Pendentes ({pendingUsers.length})
            </TabsTrigger>
            <TabsTrigger value="financeiro">
              <DollarSign className="h-4 w-4 mr-2" />
              Financeiro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="petshops" className="flex flex-col gap-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowNewTenant(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Pet Shop
              </Button>
            </div>

            {showNewTenant && (
              <div className="bg-white border rounded-xl p-6 flex flex-col gap-4">
                <h2 className="font-semibold text-gray-900">Cadastrar novo pet shop</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>ID do usuário (Replit) *</Label>
                    <Input value={newTenantForm.userId} onChange={(e) => setNewTenantForm(f => ({ ...f, userId: e.target.value }))} placeholder="Replit User ID" />
                  </div>
                  <div>
                    <Label>Nome do pet shop *</Label>
                    <Input value={newTenantForm.name} onChange={(e) => setNewTenantForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome" />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={newTenantForm.phone} onChange={(e) => setNewTenantForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input value={newTenantForm.email} onChange={(e) => setNewTenantForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
                  </div>
                  <div>
                    <Label>Início do acesso</Label>
                    <Input type="date" value={newTenantForm.accessStart} onChange={(e) => setNewTenantForm(f => ({ ...f, accessStart: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Fim do acesso</Label>
                    <Input type="date" value={newTenantForm.accessEnd} onChange={(e) => setNewTenantForm(f => ({ ...f, accessEnd: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowNewTenant(false)}>Cancelar</Button>
                  <Button onClick={handleCreateTenant} disabled={!newTenantForm.userId || !newTenantForm.name}>Cadastrar</Button>
                </div>
              </div>
            )}

            {tenants.map((t) => {
              const status = accessStatusLabel(t);
              const isEditing = editingTenant?.id === t.id;
              return (
                <div key={t.id} className="bg-white border rounded-xl p-5">
                  {isEditing ? (
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Nome</Label>
                          <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Telefone</Label>
                          <Input value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                        </div>
                        <div>
                          <Label>E-mail</Label>
                          <Input value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Endereço</Label>
                          <Input value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Início do acesso</Label>
                          <Input type="date" value={editForm.accessStart} onChange={(e) => setEditForm(f => ({ ...f, accessStart: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Fim do acesso</Label>
                          <Input type="date" value={editForm.accessEnd} onChange={(e) => setEditForm(f => ({ ...f, accessEnd: e.target.value }))} />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setEditingTenant(null)}>
                          <X className="h-4 w-4 mr-1" /> Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSaveTenant}>
                          <Check className="h-4 w-4 mr-1" /> Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{t.name}</span>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        {t.email && <span className="text-sm text-muted-foreground">{t.email}</span>}
                        {t.phone && <span className="text-sm text-muted-foreground">{t.phone}</span>}
                        {(t.accessStart && t.accessEnd) && (
                          <span className="text-xs text-muted-foreground">
                            Acesso: {fmt(t.accessStart)} → {fmt(t.accessEnd)}
                          </span>
                        )}
                        {t.userId && <span className="text-xs text-muted-foreground font-mono">ID: {t.userId}</span>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteTenant(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {!loading && tenants.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">Nenhum pet shop cadastrado ainda.</div>
            )}
          </TabsContent>

          <TabsContent value="usuarios" className="flex flex-col gap-4">
            {pendingUsers.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">Nenhum usuário aguardando cadastro.</div>
            )}
            {pendingUsers.map((u) => (
              <div key={u.id} className="bg-white border rounded-xl p-5 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-gray-900">
                    {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "Sem nome"}
                  </span>
                  {u.email && <span className="text-sm text-muted-foreground">{u.email}</span>}
                  <span className="text-xs text-muted-foreground font-mono">{u.id}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => prefillFromUser(u)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Cadastrar pet shop
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="financeiro" className="flex flex-col gap-6">
            {salesData && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border rounded-xl p-5">
                  <p className="text-sm text-muted-foreground">Este mês</p>
                  <p className="text-2xl font-bold text-primary">{fmtCurrency(salesData.monthTotal)}</p>
                </div>
                <div className="bg-white border rounded-xl p-5">
                  <p className="text-sm text-muted-foreground">Este ano</p>
                  <p className="text-2xl font-bold text-primary">{fmtCurrency(salesData.yearTotal)}</p>
                </div>
                <div className="bg-white border rounded-xl p-5">
                  <p className="text-sm text-muted-foreground">Total acumulado</p>
                  <p className="text-2xl font-bold text-primary">{fmtCurrency(salesData.allTimeTotal)}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowNewSale(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar venda
              </Button>
            </div>

            {showNewSale && (
              <div className="bg-white border rounded-xl p-6 flex flex-col gap-4">
                <h2 className="font-semibold text-gray-900">Registrar nova venda</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Pet shop</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={newSaleForm.tenantId}
                      onChange={(e) => setNewSaleForm(f => ({ ...f, tenantId: e.target.value }))}
                    >
                      <option value="">Selecione um pet shop</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input value={newSaleForm.description} onChange={(e) => setNewSaleForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Plano mensal" />
                  </div>
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={newSaleForm.amount} onChange={(e) => setNewSaleForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
                  </div>
                  <div>
                    <Label>Data do pagamento</Label>
                    <Input type="date" value={newSaleForm.paidAt} onChange={(e) => setNewSaleForm(f => ({ ...f, paidAt: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Início do período</Label>
                    <Input type="date" value={newSaleForm.periodStart} onChange={(e) => setNewSaleForm(f => ({ ...f, periodStart: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Fim do período</Label>
                    <Input type="date" value={newSaleForm.periodEnd} onChange={(e) => setNewSaleForm(f => ({ ...f, periodEnd: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowNewSale(false)}>Cancelar</Button>
                  <Button
                    onClick={handleCreateSale}
                    disabled={!newSaleForm.tenantId || !newSaleForm.description || !newSaleForm.amount || !newSaleForm.paidAt || !newSaleForm.periodStart || !newSaleForm.periodEnd}
                  >
                    Registrar
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {salesData?.sales.map((s) => {
                const tenant = tenants.find((t) => t.id === s.tenantId);
                return (
                  <div key={s.id} className="bg-white border rounded-xl p-5 flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{s.description}</span>
                        <span className="text-primary font-bold">{fmtCurrency(Number(s.amount))}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {tenant?.name ?? `Tenant #${s.tenantId}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Pago em {fmt(s.paidAt)} · Período: {fmt(s.periodStart)} → {fmt(s.periodEnd)}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteSale(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {!loading && salesData?.sales.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">Nenhuma venda registrada ainda.</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
