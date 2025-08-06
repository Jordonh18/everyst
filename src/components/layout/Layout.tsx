import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
// Import SVG backgrounds - using require to ensure they're loaded as URLs
import summitBg from '../../assets/backgrounds/summit.svg?raw';
import basecampBg from '../../assets/backgrounds/basecamp.svg?raw';

export const Layout: React.FC = () => {
  const location = useLocation();
  
  // Determine which background to show based on the current route
  const getBackgroundSvg = () => {
    if (location.pathname.includes('/basecamp') || location.pathname.includes('/integrations')) {
      // Add preserveAspectRatio and width/height 100% to ensure SVG fills container
      return basecampBg.replace('<svg', '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice"');
    }
    return summitBg.replace('<svg', '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice"');
  };
  
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background text-foreground relative">
        {/* Dynamic background using SVG from external files with improved sizing */}
        <div 
          className="fixed inset-0 overflow-hidden pointer-events-none z-0" 
          aria-hidden="true"
        >
          <div 
            className="w-full h-full text-muted-foreground opacity-[0.04] dark:opacity-[0.07]"
            dangerouslySetInnerHTML={{ __html: getBackgroundSvg() }}
          />
        </div>

        {/* Sidebar */}
        <AppSidebar />
        
        {/* Main content area */}
        <SidebarInset>
          {/* Main content with accessibility skip link */}
          <main id="main-content" className="flex-1 overflow-y-auto p-6 relative z-10">
            <a href="#main-content" className="skip-link">
              Skip to content
            </a>
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};