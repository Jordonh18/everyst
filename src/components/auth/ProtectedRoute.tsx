import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layout } from '../../components/layout/Layout';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading, usersExist, checkUsersExist } = useAuth();
  const location = useLocation();
  const [checkingUsers, setCheckingUsers] = useState<boolean>(true);

  useEffect(() => {
    const checkUsers = async () => {
      if (usersExist === null) {
        await checkUsersExist();
      }
      setCheckingUsers(false);
    };
    
    checkUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || checkingUsers) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[rgb(var(--color-background))]">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-[rgb(var(--color-primary))] border-t-transparent"></div>
      </div>
    );
  }

  // If no users exist, redirect to registration
  if (usersExist === false) {
    return <Navigate to="/register" state={{ from: location }} replace />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If there are children, render them, otherwise render the outlet with Layout
  return children ? <>{children}</> : <Layout />;
  // The Layout component already includes an Outlet
};

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, usersExist, checkUsersExist } = useAuth();
  const location = useLocation();
  const [checkingUsers, setCheckingUsers] = useState<boolean>(true);
  
  useEffect(() => {
    const checkUsers = async () => {
      if (usersExist === null) {
        await checkUsersExist();
      }
      setCheckingUsers(false);
    };
    
    checkUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || checkingUsers) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[rgb(var(--color-background))]">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-[rgb(var(--color-primary))] border-t-transparent"></div>
      </div>
    );
  }
  
  // If no users exist and trying to access login, redirect to register
  if (usersExist === false && location.pathname === '/login') {
    return <Navigate to="/register" replace />;
  }
  
  // If users exist and trying to access register, redirect to login
  // This blocks the register page entirely if users exist
  if (usersExist === true && location.pathname === '/register') {
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated and trying to access login/register, redirect to dashboard
  if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/register')) {
    // Redirect to the page the user was trying to access or dashboard
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};
