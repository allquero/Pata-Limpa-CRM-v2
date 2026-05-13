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
  Package
} from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/components/ui/sidebar";

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
  { href: "/empresas", label: "Empresas", icon: Building2 },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar>
          <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border">
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <Scissors className="h-6 w-6" />
              Pata Limpa
            </h1>
          </SidebarHeader>
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
        </Sidebar>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
