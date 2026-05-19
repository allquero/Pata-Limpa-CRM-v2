import { useState } from "react";
import { useListMessageTemplates, useCreateMessageTemplate, useUpdateMessageTemplate, useDeleteMessageTemplate } from "@workspace/api-client-react";
import { DEFAULT_TENANT_ID, MESSAGE_TEMPLATE_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, MessageSquare, Copy } from "lucide-react";

type Template = { id: number; name: string; type: string; content: string };
const emptyForm = { name: "", type: "confirmacao", content: "" };

const typeColors: Record<string, string> = {
  confirmacao: "bg-blue-100 text-blue-800",
  lembrete: "bg-yellow-100 text-yellow-800",
  leads: "bg-purple-100 text-purple-800",
  agradecimento: "bg-green-100 text-green-800",
};

const variables = ["{nome_cliente}", "{nome_pet}", "{data}", "{horario}", "{servico}", "{preco}", "{datas}"];

export default function Mensagens() {
  const { toast } = useToast();
  const { data: templates = [], isLoading, refetch } = useListMessageTemplates({ tenantId: DEFAULT_TENANT_ID });
  const createTemplate = useCreateMessageTemplate();
  const updateTemplate = useUpdateMessageTemplate();
  const deleteTemplate = useDeleteMessageTemplate();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (t: Template) => { setEditing(t); setForm({ name: t.name, type: t.type, content: t.content }); setModalOpen(true); };

  const handleSave = async () => {
    try {
      const payload = { ...form, tenantId: DEFAULT_TENANT_ID, type: form.type as any };
      if (editing) {
        await updateTemplate.mutateAsync({ id: editing.id, data: payload });
        toast({ title: "Template atualizado!" });
      } else {
        await createTemplate.mutateAsync({ data: payload });
        toast({ title: "Template criado!" });
      }
      setModalOpen(false);
      refetch();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este template?")) return;
    await deleteTemplate.mutateAsync({ id });
    refetch();
  };

  const insertVar = (v: string) => {
    setForm(f => ({ ...f, content: f.content + v }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates de Mensagem</h1>
          <p className="text-muted-foreground">Mensagens para WhatsApp — confirmações, lembretes e leads</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo Template</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : (templates as Template[]).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum template cadastrado.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(templates as Template[]).map(t => (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      {t.name}
                    </CardTitle>
                    <div className="mt-1">
                      <Badge className={typeColors[t.type] ?? ""} variant="outline">
                        {MESSAGE_TEMPLATE_TYPES[t.type as keyof typeof MESSAGE_TEMPLATE_TYPES] ?? t.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(t.content)}><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap font-mono text-muted-foreground">{t.content}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Template" : "Novo Template"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Confirmação padrão" /></div>
            <div>
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(MESSAGE_TEMPLATE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mensagem *</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={5}
                placeholder="Digite a mensagem aqui..."
                className="font-mono text-sm"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Clique para inserir variáveis:</p>
              <div className="flex flex-wrap gap-2">
                {variables.map(v => (
                  <Button key={v} variant="outline" size="sm" className="h-7 text-xs font-mono" onClick={() => insertVar(v)}>{v}</Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.content}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
