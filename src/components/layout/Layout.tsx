import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export const Layout: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background text-foreground relative">
        {/* Sidebar */}
        <AppSidebar />
        
        {/* Main content area */}
        <SidebarInset>
          <TopBar />
          <main id="main-content" className="flex-1 overflow-y-auto relative z-10">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};