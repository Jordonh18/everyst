import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Lock} from 'lucide-react';
import { AuthNotification } from '../../components/auth/AuthNotification';
import { Button, Input } from '../../components/ui';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, error, usersExist, checkUsersExist } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the page that the user was trying to access
  // Always go to summit dashboard on successful login as default
  interface LocationState {
    from?: {
      pathname?: string;
    };
  }

  const from = (location.state as LocationState)?.from?.pathname || '/summit';
  
  // Check if users exist on component mount
  useEffect(() => {
    const checkForUsers = async () => {
      if (usersExist === null) {
        await checkUsersExist();
      }
    };
    
    checkForUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const success = await login(username, password);
      if (success) {
        // Redirect to the page the user was trying to access
        navigate(from, { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full px-6 py-8 bg-card shadow-xl rounded-lg border border-border">
        <div className="flex flex-col items-center mb-6">
          <img src="/Logo-white-no-text .svg" alt="Everyst Logo" className="h-16 mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Login to everyst</h1>
          <p className="text-muted-foreground font-medium">Enter your credentials</p>
        </div>

        {error && (
          <AuthNotification 
            type="error"
            message={error}
          />
        )}
        
        {usersExist === false && (
          <AuthNotification 
            type="info"
            message="No users exist. Redirecting to registration page..."
            onDismiss={() => navigate('/register', { replace: true })}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-foreground mb-2 block">
              Username
            </label>
            <div className="relative mt-1.5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={16} className="text-muted-foreground" />
              </div>
              <Input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between mb-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
            </div>
            <div className="relative mt-1.5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-muted-foreground" />
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10" 
                placeholder="Enter password"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              variant="default"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>

        {/* Register link only shows if no users exist in system, which is handled by route protection */}
      </div>
    </div>
  );
};
