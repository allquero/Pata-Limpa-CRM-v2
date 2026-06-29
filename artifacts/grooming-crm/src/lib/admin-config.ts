import { useState, useEffect } from "react";

export const ADMIN_WHATSAPP_FALLBACK = import.meta.env.VITE_ADMIN_WHATSAPP ?? "5511999999999";
export const LANDING_MESSAGE_FALLBACK = "Olá! Quero conhecer o Pata Limpa CRM para meu pet shop.";

export function buildWhatsAppUrl(message: string, phone?: string): string {
  const p = phone ?? ADMIN_WHATSAPP_FALLBACK;
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
}

export interface LandingConfig {
  phone: string;
  message: string;
}

export function useLandingConfig(): LandingConfig & { loading: boolean } {
  const [config, setConfig] = useState<LandingConfig>({
    phone: ADMIN_WHATSAPP_FALLBACK,
    message: LANDING_MESSAGE_FALLBACK,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config/landing")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { phone: string; message: string } | null) => {
        if (data) {
          setConfig({
            phone: data.phone || ADMIN_WHATSAPP_FALLBACK,
            message: data.message || LANDING_MESSAGE_FALLBACK,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { ...config, loading };
}
