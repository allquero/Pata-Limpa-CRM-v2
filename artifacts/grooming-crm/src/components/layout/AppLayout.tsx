import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Scissors, 
  DollarSign, 
  BarChart3, 
  MessageSquare, 
  Magnet, 
  Building2,
  Package,
  LogOut,
  PawPrint,
} from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAppAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/agendamentos", label: "Agendamentos", icon: Calendar },
  { href: "/servicos", label: "Serviços", icon: Scissors },
  { href: "/pacotes", label: "Pacotes", icon: Package },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { href: "/leads", label: "Leads", icon: Magnet },
  { href: "/empresas", label: "Empresa", icon: Building2 },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, tenant, logout } = useAppAuth();

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((s) => s![0])
    .join("")
    .toUpperCase() || "U";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* ── Mobile top icon bar ───────────────────────────────────────── */}
        <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-12 flex items-center px-1 gap-0.5 overflow-x-auto">
          <span className="flex items-center px-2 flex-shrink-0">
            <PawPrint className="h-5 w-5 text-primary" />
          </span>
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                title={item.label}
              >
                <item.icon className="h-4 w-4" />
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-muted ml-1"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </nav>

        {/* ── Desktop sidebar ───────────────────────────────────────────── */}
        <Sidebar className="hidden md:flex">
          <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border">
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <PawPrint className="h-6 w-6" />
              Pata Limpa
            </h1>
          </SidebarHeader>

          {tenant && (
            <div className="px-4 py-2 border-b border-sidebar-border">
              <p className="text-xs text-muted-foreground truncate">{tenant.name}</p>
            </div>
          )}

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.href} className="flex items-center gap-3">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 flex-shrink-0">
                {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} />}
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.firstName || user?.email || "Usuário"}
                </p>
                {user?.email && (
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Sair"
                className="h-8 w-8 flex-shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto pt-12 md:pt-0">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
