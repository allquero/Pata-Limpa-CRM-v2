import { useState, useEffect, useCallback } from "react";
import {
  PawPrint,
  LogOut,
  Building2,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCw,
  KeyRound,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  loginEmail: string | null;
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
  if (!accessStart || !accessEnd)
    return { label: "Pendente", variant: "secondary" as const };
  const today = new Date().toISOString().slice(0, 10);
  if (today < accessStart)
    return { label: "Não iniciado", variant: "outline" as const };
  if (today > accessEnd)
    return { label: "Expirado", variant: "destructive" as const };
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
  const [salesData, setSalesData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    accessStart: "",
    accessEnd: "",
  });

  const [newTenantForm, setNewTenantForm] = useState({
    loginEmail: "",
    loginPassword: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    accessStart: "",
    accessEnd: "",
  });
  const [showNewTenant, setShowNewTenant] = useState(false);

  const [newSaleForm, setNewSaleForm] = useState({
    tenantId: "",
    description: "",
    amount: "",
    paidAt: "",
    periodStart: "",
    periodEnd: "",
  });
  const [showNewSale, setShowNewSale] = useState(false);

  const [resetPasswordTenantId, setResetPasswordTenantId] = useState<
    number | null
  >(null);
  const [newPassword, setNewPassword] = useState("");

  const [configPhone, setConfigPhone] = useState("");
  const [configMessage, setConfigMessage] = useState("");
  const [configSaving, setConfigSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/config", { credentials: "include" });
      if (r.ok) {
        const d = await r.json() as { landing_whatsapp_phone: string; landing_whatsapp_message: string };
        setConfigPhone(d.landing_whatsapp_phone ?? "");
        setConfigMessage(d.landing_whatsapp_message ?? "");
      }
    } catch {}
  }, []);

  async function handleSaveConfig() {
    setConfigSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          landing_whatsapp_phone: configPhone,
          landing_whatsapp_message: configMessage,
        }),
      });
      if (res.ok) {
        toast({ title: "Configurações salvas com sucesso" });
      } else {
        toast({ title: "Erro ao salvar configurações", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    } finally {
      setConfigSaving(false);
    }
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        fetch("/api/admin/tenants", { credentials: "include" }).then((r) =>
          r.json(),
        ),
        fetch("/api/admin/sales", { credentials: "include" }).then((r) =>
          r.json(),
        ),
      ]);
      setTenants(t);
      setSalesData(s);
    } catch {
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAll();
    fetchConfig();
  }, [fetchAll, fetchConfig]);

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
      toast({
        title: "Erro ao atualizar",
        description: err.error,
        variant: "destructive",
      });
    }
  }

  async function handleDeleteTenant(id: number) {
    if (
      !confirm(
        "Tem certeza que deseja excluir este pet shop? Esta ação não pode ser desfeita.",
      )
    )
      return;
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
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
        loginEmail: newTenantForm.loginEmail,
        loginPassword: newTenantForm.loginPassword,
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
      setNewTenantForm({
        loginEmail: "",
        loginPassword: "",
        name: "",
        phone: "",
        email: "",
        address: "",
        accessStart: "",
        accessEnd: "",
      });
      fetchAll();
    } else {
      const err = await res.json();
      toast({
        title: "Erro ao cadastrar",
        description: err.error,
        variant: "destructive",
      });
    }
  }

  async function handleResetPassword(tenantId: number) {
    if (!newPassword.trim()) return;
    const res = await fetch(`/api/admin/tenants/${tenantId}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newPassword }),
    });
    if (res.ok) {
      toast({ title: "Senha redefinida com sucesso" });
      setResetPasswordTenantId(null);
      setNewPassword("");
    } else {
      const err = await res.json();
      toast({
        title: "Erro ao redefinir senha",
        description: err.error,
        variant: "destructive",
      });
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
      setNewSaleForm({
        tenantId: "",
        description: "",
        amount: "",
        paidAt: "",
        periodStart: "",
        periodEnd: "",
      });
      fetchAll();
    } else {
      const err = await res.json();
      toast({
        title: "Erro ao registrar venda",
        description: err.error,
        variant: "destructive",
      });
    }
  }

  async function handleDeleteSale(id: number) {
    if (!confirm("Excluir este lançamento?")) return;
    const res = await fetch(`/api/admin/sales/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <PawPrint className="h-6 w-6" />
          <span>Pata Limpa</span>
          <Badge variant="secondary" className="ml-2 text-xs">
            Admin
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Painel Administrativo
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAll}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>

        <Tabs defaultValue="petshops">
          <TabsList className="mb-6">
            <TabsTrigger value="petshops">
              <Building2 className="h-4 w-4 mr-2" />
              Pet Shops ({tenants.length})
            </TabsTrigger>
            <TabsTrigger value="financeiro">
              <DollarSign className="h-4 w-4 mr-2" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="configuracoes">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
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
                <h2 className="font-semibold text-gray-900">
                  Cadastrar novo pet shop
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>E-mail de acesso *</Label>
                    <Input
                      type="email"
                      value={newTenantForm.loginEmail}
                      onChange={(e) =>
                        setNewTenantForm((f) => ({
                          ...f,
                          loginEmail: e.target.value,
                        }))
                      }
                      placeholder="email@petshop.com"
                    />
                  </div>
                  <div>
                    <Label>Senha de acesso *</Label>
                    <Input
                      type="password"
                      value={newTenantForm.loginPassword}
                      onChange={(e) =>
                        setNewTenantForm((f) => ({
                          ...f,
                          loginPassword: e.target.value,
                        }))
                      }
                      placeholder="Senha inicial"
                    />
                  </div>
                  <div>
                    <Label>Nome do pet shop *</Label>
                    <Input
                      value={newTenantForm.name}
                      onChange={(e) =>
                        setNewTenantForm((f) => ({
                          ...f,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Nome"
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={newTenantForm.phone}
                      onChange={(e) =>
                        setNewTenantForm((f) => ({
                          ...f,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label>E-mail de contato</Label>
                    <Input
                      value={newTenantForm.email}
                      onChange={(e) =>
                        setNewTenantForm((f) => ({
                          ...f,
                          email: e.target.value,
                        }))
                      }
                      placeholder="contato@petshop.com"
                    />
                  </div>
                  <div>
                    <Label>Endereço</Label>
                    <Input
                      value={newTenantForm.address}
                      onChange={(e) =>
                        setNewTenantForm((f) => ({
                          ...f,
                          address: e.target.value,
                        }))
                      }
                      placeholder="Rua, número, bairro"
                    />
                  </div>
                  <div>
                    <Label>Início do acesso</Label>
                    <Input
                      type="date"
                      value={newTenantForm.accessStart}
                      onChange={(e) =>
                        setNewTenantForm((f) => ({
                          ...f,
                          accessStart: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Fim do acesso</Label>
                    <Input
                      type="date"
                      value={newTenantForm.accessEnd}
                      onChange={(e) =>
                        setNewTenantForm((f) => ({
                          ...f,
                          accessEnd: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewTenant(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateTenant}
                    disabled={
                      !newTenantForm.loginEmail ||
                      !newTenantForm.loginPassword ||
                      !newTenantForm.name
                    }
                  >
                    Cadastrar
                  </Button>
                </div>
              </div>
            )}

            {tenants.map((t) => {
              const status = accessStatusLabel(t);
              const isEditing = editingTenant?.id === t.id;
              const isResetting = resetPasswordTenantId === t.id;
              return (
                <div key={t.id} className="bg-white border rounded-xl p-5">
                  {isEditing ? (
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Nome</Label>
                          <Input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                name: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Telefone</Label>
                          <Input
                            value={editForm.phone}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                phone: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>E-mail de contato</Label>
                          <Input
                            value={editForm.email}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                email: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Endereço</Label>
                          <Input
                            value={editForm.address}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                address: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Início do acesso</Label>
                          <Input
                            type="date"
                            value={editForm.accessStart}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                accessStart: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Fim do acesso</Label>
                          <Input
                            type="date"
                            value={editForm.accessEnd}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                accessEnd: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTenant(null)}
                        >
                          <X className="h-4 w-4 mr-1" /> Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSaveTenant}>
                          <Check className="h-4 w-4 mr-1" /> Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {t.name}
                            </span>
                            <Badge variant={status.variant}>
                              {status.label}
                            </Badge>
                          </div>
                          {t.loginEmail && (
                            <span className="text-sm text-muted-foreground">
                              Login:{" "}
                              <span className="font-mono">{t.loginEmail}</span>
                            </span>
                          )}
                          {t.email && (
                            <span className="text-sm text-muted-foreground">
                              Contato: {t.email}
                            </span>
                          )}
                          {t.phone && (
                            <span className="text-sm text-muted-foreground">
                              {t.phone}
                            </span>
                          )}
                          {t.accessStart && t.accessEnd && (
                            <span className="text-xs text-muted-foreground">
                              Acesso: {fmt(t.accessStart)} → {fmt(t.accessEnd)}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Redefinir senha"
                            onClick={() => {
                              setResetPasswordTenantId(t.id);
                              setNewPassword("");
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(t)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteTenant(t.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {isResetting && (
                        <div className="border-t pt-3 flex items-end gap-3">
                          <div className="flex flex-col gap-1 flex-1">
                            <Label className="text-xs">Nova senha</Label>
                            <Input
                              type="password"
                              placeholder="Nova senha"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleResetPassword(t.id)}
                            disabled={!newPassword.trim()}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Salvar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResetPasswordTenantId(null);
                              setNewPassword("");
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!loading && tenants.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum pet shop cadastrado ainda.
              </div>
            )}
          </TabsContent>

          <TabsContent value="financeiro" className="flex flex-col gap-6">
            {salesData && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border rounded-xl p-5">
                  <p className="text-sm text-muted-foreground">Este mês</p>
                  <p className="text-2xl font-bold text-primary">
                    {fmtCurrency(salesData.monthTotal)}
                  </p>
                </div>
                <div className="bg-white border rounded-xl p-5">
                  <p className="text-sm text-muted-foreground">Este ano</p>
                  <p className="text-2xl font-bold text-primary">
                    {fmtCurrency(salesData.yearTotal)}
                  </p>
                </div>
                <div className="bg-white border rounded-xl p-5">
                  <p className="text-sm text-muted-foreground">
                    Total acumulado
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {fmtCurrency(salesData.allTimeTotal)}
                  </p>
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
                <h2 className="font-semibold text-gray-900">
                  Registrar nova venda
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Pet shop</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={newSaleForm.tenantId}
                      onChange={(e) =>
                        setNewSaleForm((f) => ({
                          ...f,
                          tenantId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Selecione um pet shop</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input
                      value={newSaleForm.description}
                      onChange={(e) =>
                        setNewSaleForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Ex: Plano mensal"
                    />
                  </div>
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newSaleForm.amount}
                      onChange={(e) =>
                        setNewSaleForm((f) => ({
                          ...f,
                          amount: e.target.value,
                        }))
                      }
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label>Data do pagamento</Label>
                    <Input
                      type="date"
                      value={newSaleForm.paidAt}
                      onChange={(e) =>
                        setNewSaleForm((f) => ({
                          ...f,
                          paidAt: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Início do período</Label>
                    <Input
                      type="date"
                      value={newSaleForm.periodStart}
                      onChange={(e) =>
                        setNewSaleForm((f) => ({
                          ...f,
                          periodStart: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Fim do período</Label>
                    <Input
                      type="date"
                      value={newSaleForm.periodEnd}
                      onChange={(e) =>
                        setNewSaleForm((f) => ({
                          ...f,
                          periodEnd: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewSale(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateSale}
                    disabled={
                      !newSaleForm.tenantId ||
                      !newSaleForm.description ||
                      !newSaleForm.amount ||
                      !newSaleForm.paidAt ||
                      !newSaleForm.periodStart ||
                      !newSaleForm.periodEnd
                    }
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
                  <div
                    key={s.id}
                    className="bg-white border rounded-xl p-5 flex items-start justify-between"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {s.description}
                        </span>
                        <span className="text-primary font-bold">
                          {fmtCurrency(Number(s.amount))}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {tenant?.name ?? `Tenant #${s.tenantId}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Pago em {fmt(s.paidAt)} · Período: {fmt(s.periodStart)}{" "}
                        → {fmt(s.periodEnd)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteSale(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {!loading && salesData?.sales.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma venda registrada ainda.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="configuracoes">
            <div className="bg-white border rounded-xl p-6 flex flex-col gap-6 max-w-lg">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  WhatsApp da landing page
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Número e mensagem usados nos botões "Quero conhecer" e "Falar com a gente" da página inicial.
                </p>

                <div className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="cfg-phone">
                      Número de WhatsApp (somente dígitos, com DDI)
                    </Label>
                    <Input
                      id="cfg-phone"
                      placeholder="5511999999999"
                      value={configPhone}
                      onChange={(e) => setConfigPhone(e.target.value.replace(/\D/g, ""))}
                      className="mt-1 font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Exemplo: 5548999887766 (55 = Brasil, 48 = DDD, resto = número)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="cfg-message">Mensagem padrão dos botões</Label>
                    <Textarea
                      id="cfg-message"
                      placeholder="Olá! Quero conhecer o Pata Limpa CRM para meu pet shop."
                      value={configMessage}
                      onChange={(e) => setConfigMessage(e.target.value)}
                      className="mt-1 min-h-[100px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Esta mensagem será pré-preenchida ao abrir o WhatsApp.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveConfig} disabled={configSaving}>
                      <Check className="h-4 w-4 mr-2" />
                      {configSaving ? "Salvando..." : "Salvar configurações"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
