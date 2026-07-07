// ── Portes e pelagens (defaults — a empresa pode configurar os próprios) ──────
export const DEFAULT_PORTE_LABELS: Record<string, string> = {
  mini: "Mini",
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
  gigante: "Gigante",
};

export const DEFAULT_COAT_LABELS: Record<string, string> = {
  curto: "Pelagem Curta",
  longo: "Pelagem Longa",
};

// Ordem de exibição dos portes
export const DEFAULT_PORTE_ORDER = ["mini", "pequeno", "medio", "grande", "gigante"];

// Mantido para compatibilidade com código legado (será removido gradualmente)
export const PORTE_SIZES: Record<string, string> = {
  mini: "Mini",
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
  gigante: "Gigante",
  // legado — serão limpos pelo migrador
  mini_curto: "Mini Curto",
  mini_longo: "Mini Longo",
  pequeno_curto: "Pequeno Curto",
  pequeno_longo: "Pequeno Longo",
  medio_curto: "Médio Curto",
  medio_longo: "Médio Longo",
  grande_curto: "Grande Curto",
  grande_longo: "Grande Longo",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Retorna o label do porte, com fallback para o próprio valor */
export function getPorteLabel(size: string, customLabels?: Record<string, string>): string {
  if (customLabels?.[size]) return customLabels[size];
  return DEFAULT_PORTE_LABELS[size] ?? size;
}

/** Retorna o label da pelagem, com fallback para o próprio valor */
export function getCoatLabel(coat: string, customLabels?: Record<string, string>): string {
  if (customLabels?.[coat]) return customLabels[coat];
  return DEFAULT_COAT_LABELS[coat] ?? coat;
}

/** Gera o label combinado porte + pelagem */
export function getSizeCoatLabel(
  size: string,
  coat: string | null | undefined,
  customPorteLabels?: Record<string, string>,
  customCoatLabels?: Record<string, string>,
): string {
  const p = getPorteLabel(size, customPorteLabels);
  const c = coat ? getCoatLabel(coat, customCoatLabels) : null;
  return c ? `${p} · ${c}` : p;
}

// ── Outros ───────────────────────────────────────────────────────────────────
export const APPOINTMENT_STATUSES = {
  aguardando: "Aguardando",
  em_atendimento: "Em Atendimento",
  pet_pronto: "Pet Pronto",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const FINANCIAL_TYPES = {
  receita: "Receita",
  despesa: "Despesa",
  despesa_fixa: "Despesa Fixa",
};

export const MESSAGE_TEMPLATE_TYPES = {
  confirmacao: "Confirmação de Presença",
  lembrete: "Lembrete",
  leads: "Leads",
  agradecimento: "Agradecimento",
  pet_pronto: "Pet Pronto",
};

export const DEFAULT_TENANT_ID = 1;
