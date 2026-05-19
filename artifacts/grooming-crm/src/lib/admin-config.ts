export const ADMIN_WHATSAPP = import.meta.env.VITE_ADMIN_WHATSAPP ?? "5511999999999";

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
