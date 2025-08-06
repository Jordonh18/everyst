import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface PermissionGateProps {
  permission: 'isOwner' | 'isAdmin' | 'isManager' | 'canManageUsers' | 'canManageSystem' | 'canManageNetwork' | 'canViewAllData' | 'canViewLogs';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * A component that conditionally renders its children based on the user's permissions
 */
const PermissionGate: React.FC<PermissionGateProps> = ({ 
  permission, 
  children, 
  fallback = null 
}) => {
  const auth = useAuth();
  
  if (auth[permission]) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

export default PermissionGate;
