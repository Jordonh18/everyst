import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, ArrowRight } from 'lucide-react';
import { AuthNotification } from '../../components/auth/AuthNotification';
import { Button, Input } from '../../components/ui';
import { AnimatedMonitor, AnimatedNetwork } from '../../components/ui/AnimatedSVGs';
import { motion } from 'framer-motion';

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex">
      {/* Left Side - Welcome */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5" />
        <div className="relative z-10 flex flex-col h-full px-12 py-8">
          {/* Logo and Title - Top Left */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center space-x-3"
          >
            <img src="/Logo-white-no-text .svg" alt="Everyst Logo" className="h-12 w-12" />
            <h1 className="text-3xl font-bold text-foreground">everyst</h1>
          </motion.div>

          {/* Main Content - Natural Flow */}
          <div className="flex-1 flex flex-col justify-start pt-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-10 max-w-md"
            >
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-foreground">
                  Welcome back
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Continue monitoring your infrastructure and managing security operations.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-3 h-3 bg-primary rounded-full mt-1.5"></div>
                  <div>
                    <h3 className="font-medium text-foreground text-sm">Real-time Monitoring</h3>
                    <p className="text-muted-foreground text-sm">Track server performance and uptime</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-3 h-3 bg-primary rounded-full mt-1.5"></div>
                  <div>
                    <h3 className="font-medium text-foreground text-sm">Security Analysis</h3>
                    <p className="text-muted-foreground text-sm">Advanced threat detection and alerts</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-3 h-3 bg-primary rounded-full mt-1.5"></div>
                  <div>
                    <h3 className="font-medium text-foreground text-sm">Network Tools</h3>
                    <p className="text-muted-foreground text-sm">Diagnostic and management utilities</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 opacity-30">
          <AnimatedMonitor className="h-20 w-20 text-primary" />
        </div>
        <div className="absolute bottom-32 right-32 opacity-20">
          <AnimatedNetwork className="h-32 w-32 text-primary" />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-sm mx-auto"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src="/Logo-white-no-text .svg" alt="Everyst Logo" className="h-16 w-16 mb-4" />
            <h1 className="text-2xl font-bold text-foreground">everyst</h1>
            <p className="text-muted-foreground text-sm">Server Monitoring & Security Platform</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">Sign in</h2>
              <p className="text-muted-foreground">
                Access your dashboard
              </p>
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

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-foreground">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-muted-foreground" />
                  </div>
                  <Input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-12 text-base"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-muted-foreground" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 text-base" 
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-background border-t-transparent rounded-full mr-2"
                    />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              Secure access to your server infrastructure
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
