import React, { useState } from 'react';
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
  Users,
  Search,
  User,
  ChevronUp,
  LogOut
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';


interface NavItem {
  path: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

export const AppSidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount, notifications, markAsRead } = useNotifications();
  const [searchOpen, setSearchOpen] = useState(false);
  
  const navItems: NavItem[] = [
    { 
      path: '/dashboard', 
      name: 'Dashboard', 
      icon: <LayoutDashboard />,
      description: 'Main overview'
    },
    { 
      path: '/network', 
      name: 'Network', 
      icon: <Network />,
      description: 'Network visualization'
    },
    { 
      path: '/metrics', 
      name: 'Metrics', 
      icon: <LineChart />,
      description: 'System metrics'
    },
    { 
      path: '/security', 
      name: 'Security', 
      icon: <Shield />,
      description: 'Security controls'
    },
    { 
      path: '/logs', 
      name: 'Logs', 
      icon: <ScrollText />,
      description: 'Log viewer'
    },
    { 
      path: '/alerts', 
      name: 'Alerts', 
      icon: <Bell />,
      description: 'Alert center'
    },
    { 
      path: '/integrations', 
      name: 'Integrations', 
      icon: <Layers />,
      description: 'Connect services'
    },
    { 
      path: '/tools', 
      name: 'Tools', 
      icon: <Wrench />,
      description: 'Utility tools'
    },
    { 
      path: '/users', 
      name: 'Users', 
      icon: <Users />,
      description: 'User management'
    }
  ];

  const getUserInitials = () => {
    if (!user) return 'U';
    const firstName = user.first_name?.charAt(0) || user.username?.charAt(0) || 'U';
    const lastName = user.last_name?.charAt(0) || '';
    return (firstName + lastName).toUpperCase();
  };

  const getDisplayName = () => {
    if (!user) return 'User';
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username || 'User';
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                asChild
              >
                <Link to="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                    <img 
                      src="/Logo-white-no-text.svg" 
                      alt="Everyst Logo" 
                      className="size-7" 
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-lg">
                      Everyst
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  // Special case for Dashboard to handle both / and /dashboard
                  const isActive = item.path === '/dashboard' 
                    ? (location.pathname === '/dashboard' || location.pathname === '/') 
                    : location.pathname === item.path;
                  
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton 
                        asChild
                        isActive={isActive}
                        tooltip={item.description}
                      >
                        <Link to={item.path}>
                          {item.icon}
                          <span>{item.name}</span>
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
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setSearchOpen(true)}
                tooltip="Search"
              >
                <Search />
                <span>Search</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Popover>
                <PopoverTrigger asChild>
                  <SidebarMenuButton
                    tooltip={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                  >
                    <Bell />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 left-6 h-2 w-2 bg-red-500 rounded-full" />
                    )}
                    <span>Notifications</span>
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-80 p-0" 
                  side="right" 
                  align="start"
                  sideOffset={8}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No notifications
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {notifications.slice(0, 5).map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-2 rounded-md text-sm cursor-pointer hover:bg-accent ${
                              !notification.read ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                            }`}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="font-medium">{notification.title}</div>
                            {notification.message && (
                              <div className="text-muted-foreground text-xs mt-1">
                                {notification.message}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {notifications.length > 0 && (
                      <div className="mt-3 border-t pt-3">
                        <Link 
                          to="/notifications" 
                          className="block w-full text-center text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          See All Notifications
                        </Link>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    tooltip={getDisplayName()}
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={undefined} alt={getDisplayName()} />
                      <AvatarFallback className="rounded-lg">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {getDisplayName()}
                      </span>
                      <span className="truncate text-xs">
                        {user?.first_name && user?.last_name 
                          ? `@${user.username} • ${user.email}` 
                          : user?.email || 'user@everyst.com'
                        }
                      </span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="right"
                  align="end"
                  sideOffset={8}
                >
                  <DropdownMenuItem asChild>
                    <Link to="/account">
                      <User />
                      Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <Settings />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>

          </SidebarMenu>
        </SidebarFooter>
        
        <SidebarRail />
      </Sidebar>
      
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {navItems.map((item) => (
              <CommandItem
                key={item.path}
                onSelect={() => {
                  setSearchOpen(false);
                  // Navigate to the item
                  window.location.href = item.path;
                }}
              >
                {item.icon}
                <span>{item.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {item.description}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                setSearchOpen(false);
                window.location.href = '/settings';
              }}
            >
              <Settings />
              <span>Settings</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setSearchOpen(false);
                logout();
              }}
            >
              <LogOut />
              <span>Sign out</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
};
