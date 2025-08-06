import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Network, 
  LineChart, 
  Shield, 
  ScrollText, 
  Bell, 
  Layers, 
  Wrench, 
  Settings, 
  Users
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

interface NavItem {
  path: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

export const AppSidebar: React.FC = () => {
  const location = useLocation();
  
  const navItems: NavItem[] = [
    { 
      path: '/summit', 
      name: 'Summit', 
      icon: <LayoutDashboard size={18} />,
      description: 'Dashboard overview'
    },
    { 
      path: '/network-map', 
      name: 'Glacier', 
      icon: <Network size={18} />,
      description: 'Network visualization'
    },
    { 
      path: '/metrics', 
      name: 'Altitude', 
      icon: <LineChart size={18} />,
      description: 'System metrics'
    },
    { 
      path: '/security', 
      name: 'IceWall', 
      icon: <Shield size={18} />,
      description: 'Security controls'
    },
    { 
      path: '/logs', 
      name: 'TrekLog', 
      icon: <ScrollText size={18} />,
      description: 'Log viewer'
    },
    { 
      path: '/alerts', 
      name: 'Avalanche', 
      icon: <Bell size={18} />,
      description: 'Alert center'
    },
    { 
      path: '/integrations', 
      name: 'Basecamp', 
      icon: <Layers size={18} />,
      description: 'Connect services'
    },
    { 
      path: '/tools', 
      name: 'GearRoom', 
      icon: <Wrench size={18} />,
      description: 'Utility tools'
    },
    { 
      path: '/climbers', 
      name: 'Climbers', 
      icon: <Users size={18} />,
      description: 'User management'
    },
    { 
      path: '/settings', 
      name: 'ControlRoom', 
      icon: <Settings size={18} />,
      description: 'System settings'
    }
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <img 
            src="/images/everyst-logo.svg" 
            alt="everyst" 
            className="h-8 w-8" 
          />
          <span className="text-lg font-bold tracking-wide text-primary group-data-[collapsible=icon]:hidden">
            everyst
          </span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                // Special case for Summit dashboard to handle both / and /summit
                const isActive = item.path === '/summit' 
                  ? (location.pathname === '/summit' || location.pathname === '/') 
                  : location.pathname === item.path;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton 
                      asChild
                      isActive={isActive}
                      tooltip={`${item.name} - ${item.description}`}
                    >
                      <Link to={item.path} className="flex items-center gap-2">
                        {item.icon}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium leading-tight">
                            {item.name}
                          </span>
                          <span className="text-xs text-muted-foreground opacity-80 truncate group-data-[collapsible=icon]:hidden">
                            {item.description}
                          </span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <div className="px-2 py-2 text-xs text-muted-foreground opacity-70">
          <span className="group-data-[collapsible=icon]:hidden">everyst v1.0.0-alpha</span>
          <span className="group-data-[collapsible=icon]:block hidden">v1.0</span>
        </div>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
};
