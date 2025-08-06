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
      case '/summit':
        return 'Summit';
      case '/network-map':
        return 'Glacier';
      case '/metrics':
        return 'Altitude';
      case '/security':
        return 'IceWall';
      case '/logs':
        return 'TrekLog';
      case '/alerts':
        return 'Avalanche';
      case '/integrations':
        return 'Basecamp';
      case '/tools':
        return 'GearRoom';
      case '/climbers':
        return 'Climbers';
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
