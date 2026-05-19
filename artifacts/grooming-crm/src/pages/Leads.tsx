import { useState } from "react";
import { useListLeads, useListMessageTemplates } from "@workspace/api-client-react";
import type { Lead, MessageTemplate } from "@workspace/api-client-react";
import { DEFAULT_TENANT_ID } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Clock, PawPrint, ExternalLink } from "lucide-react";

export default function Leads() {
  const [minDays, setMinDays] = useState(30);
  const [whatsappModal, setWhatsappModal] = useState<{ lead: Lead; message: string } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");

  const { data: leads = [], isLoading } = useListLeads({ tenantId: DEFAULT_TENANT_ID, minDaysSince: minDays });
  const { data: templates = [] } = useListMessageTemplates({ tenantId: DEFAULT_TENANT_ID });

  const leadsTemplates = (templates as MessageTemplate[]).filter(t => t.type === "leads");

  const leadPhone = (lead: Lead) => lead.phone ?? "";
  const leadPetName = (lead: Lead) => lead.pets?.[0]?.name ?? "";

  const fillTemplate = (content: string, lead: Lead): string => {
    return content
      .replace("{nome_cliente}", lead.clientName)
      .replace("{nome_pet}", leadPetName(lead))
      .replace("{data}", "")
      .replace("{horario}", "")
      .replace("{servico}", "")
      .replace("{preco}", "");
  };

  const openWhatsapp = (lead: Lead) => {
    const tmpl = leadsTemplates.find(t => String(t.id) === selectedTemplateId);
    const days = lead.daysSinceLastAppointment ?? 0;
    const message = tmpl
      ? fillTemplate(tmpl.content, lead)
      : `Olá ${lead.clientName}! Faz ${days} dias que não vemos ${leadPetName(lead)}. Que tal agendar um banho? 🐾`;
    setWhatsappModal({ lead, message });
  };

  const sendWhatsapp = (phone: string, message: string) => {
    const cleaned = phone.replace(/\D/g, "");
    const number = cleaned.length === 11 ? `55${cleaned}` : cleaned;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const urgencyColor = (days: number) => {
    if (days >= 60) return "bg-red-100 text-red-800";
    if (days >= 45) return "bg-orange-100 text-orange-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads — Clientes Inativos</h1>
        <p className="text-muted-foreground">Clientes sem agendamento há mais de X dias</p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <Label>Sem agendamento há mais de</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input type="number" value={minDays} onChange={e => setMinDays(Number(e.target.value))} className="w-24" min={1} />
            <span className="text-sm text-muted-foreground">dias</span>
          </div>
        </div>
        <div>
          <Label>Template de mensagem</Label>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Selecionar template" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Mensagem padrão</SelectItem>
              {leadsTemplates.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : leads.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum lead encontrado para o período selecionado. 🎉</CardContent></Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{leads.length} cliente(s) inativo(s)</p>
          {[...leads].sort((a, b) => (b.daysSinceLastAppointment ?? 0) - (a.daysSinceLastAppointment ?? 0)).map(lead => (
            <Card key={`${lead.clientId}-${leadPetName(lead)}`}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <PawPrint className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{lead.clientName}</p>
                    <p className="text-sm text-muted-foreground">{leadPetName(lead)}{leadPhone(lead) ? ` • ${leadPhone(lead)}` : ""}</p>
                    {lead.lastAppointmentDate && (
                      <p className="text-xs text-muted-foreground">
                        Último: {new Date(lead.lastAppointmentDate).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge className={urgencyColor(lead.daysSinceLastAppointment ?? 0)} variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {lead.daysSinceLastAppointment ?? 0} dias
                  </Badge>
                  <Button size="sm" onClick={() => openWhatsapp(lead)} className="bg-green-600 hover:bg-green-700">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!whatsappModal} onOpenChange={() => setWhatsappModal(null)}>
        {whatsappModal && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar mensagem para {whatsappModal.lead.clientName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{whatsappModal.message}</p>
              </div>
              <p className="text-sm text-muted-foreground">📱 {leadPhone(whatsappModal.lead)}</p>
            </div>
            <div className="flex gap-3 mt-2">
              <DialogClose asChild>
                <Button variant="outline" className="flex-1">Cancelar</Button>
              </DialogClose>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  sendWhatsapp(leadPhone(whatsappModal.lead), whatsappModal.message);
                  setWhatsappModal(null);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir WhatsApp
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
