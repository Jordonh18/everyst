import React from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';

export const TopBar: React.FC = () => {
  const location = useLocation();
  
  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/':
      case '/dashboard':
        return 'Dashboard';
      case '/network':
        return 'Network';
      case '/metrics':
        return 'Metrics';
      case '/security':
        return 'Security';
      case '/logs':
        return 'Logs';
      case '/alerts':
        return 'Alerts';
      case '/integrations':
        return 'Integrations';
      case '/tools':
        return 'Tools';
      case '/users':
        return 'Users';
      case '/settings':
        return 'Settings';
      case '/account':
        return 'Account';
      default:
        return 'everyst';
    }
  };

  return (
    <header className="h-16 flex items-center border-b bg-background px-4">
      <SidebarTrigger className="-ml-1 mr-2" />
      <h1 className="text-lg font-semibold">
        {getPageTitle()}
      </h1>
    </header>
  );
};
