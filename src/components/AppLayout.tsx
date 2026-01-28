import { ReactNode } from "react";

import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => (
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <Header />
      <div className="flex flex-1 flex-col">{children}</div>
    </SidebarInset>
  </SidebarProvider>
);
