import { useState } from "react";
import { useGetRevenueReport, useGetAppointmentsReport, useGetTopClientsReport } from "@workspace/api-client-react";
import { useAppAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { DollarSign, Calendar, Users, TrendingUp } from "lucide-react";

const COLORS = ["#7c3aed", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Relatorios() {
  const { tenantId } = useAppAuth();
  const today = new Date();
  const [startDate, setStartDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().substring(0, 10));

  const params = { tenantId: tenantId!, startDate, endDate };
  const { data: revenue, isLoading: revLoading } = useGetRevenueReport(params);
  const { data: appointments, isLoading: apptLoading } = useGetAppointmentsReport(params);
  const { data: topClients, isLoading: topLoading } = useGetTopClientsReport({ tenantId: tenantId!, limit: 10 });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Análises e indicadores do negócio</p>
      </div>

      <div className="flex gap-4 items-end">
        <div>
          <Label>De</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label>Até</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {revLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold text-green-600">{fmt(revenue?.totalRevenue ?? 0)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Total Atendimentos</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {apptLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{appointments?.total ?? 0}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {revLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold text-blue-600">{fmt(revenue?.averageTicket ?? 0)}</div>}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receita">
        <TabsList>
          <TabsTrigger value="receita">Receita por Período</TabsTrigger>
          <TabsTrigger value="status">Agendamentos por Status</TabsTrigger>
          <TabsTrigger value="porte">Por Porte</TabsTrigger>
          <TabsTrigger value="clientes">Top Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="receita">
          <Card>
            <CardHeader><CardTitle>Receita por Mês</CardTitle></CardHeader>
            <CardContent>
              {revLoading ? <Skeleton className="h-64 w-full" /> : (revenue?.data?.length ?? 0) === 0 ? (
                <p className="text-center text-muted-foreground py-12">Sem dados no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenue?.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={v => `R$${v}`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Receita" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader><CardTitle>Agendamentos por Status</CardTitle></CardHeader>
            <CardContent>
              {apptLoading ? <Skeleton className="h-64 w-full" /> : (appointments?.byStatus?.length ?? 0) === 0 ? (
                <p className="text-center text-muted-foreground py-12">Sem dados no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={appointments?.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label={({ status, count }) => `${status}: ${count}`}>
                      {appointments?.byStatus?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="porte">
          <Card>
            <CardHeader><CardTitle>Atendimentos por Porte</CardTitle></CardHeader>
            <CardContent>
              {apptLoading ? <Skeleton className="h-64 w-full" /> : (appointments?.bySize?.length ?? 0) === 0 ? (
                <p className="text-center text-muted-foreground py-12">Sem dados no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={appointments?.bySize} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="size" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Qtd" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes">
          <Card>
            <CardHeader><CardTitle>Top 10 Clientes por Receita</CardTitle></CardHeader>
            <CardContent>
              {topLoading ? <Skeleton className="h-64 w-full" /> : (topClients as any[])?.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Sem dados.</p>
              ) : (
                <div className="space-y-3">
                  {(topClients as any[])?.map((c, i) => (
                    <div key={c.clientId} className="flex items-center gap-3">
                      <span className="w-6 text-sm font-bold text-muted-foreground">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{c.clientName}</span>
                          <span className="text-sm font-semibold text-green-600">{fmt(c.totalRevenue)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.round((c.totalRevenue / ((topClients as any[])[0]?.totalRevenue ?? 1)) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.totalAppointments} atendimento(s)</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
