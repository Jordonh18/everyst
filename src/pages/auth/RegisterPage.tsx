import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, CheckCircle, XCircle, UserPlus, ArrowRight, Sparkles, Network } from 'lucide-react';
import zxcvbn from 'zxcvbn';
import { AuthNotification } from '../../components/auth/AuthNotification';
import { Button, Input } from '../../components/ui';
import { motion } from 'framer-motion';

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, error, usersExist, checkUsersExist } = useAuth();
  const navigate = useNavigate();

  // Check if users exist on component mount
  useEffect(() => {
    const checkForUsers = async () => {
      if (usersExist === null) {
        await checkUsersExist();
      }
      
      // If users exist, redirect to login
      if (usersExist === true) {
        navigate('/login', { replace: true });
      }
    };
    
    checkForUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersExist, navigate]);
  
  // Calculate password strength
  useEffect(() => {
    if (password) {
      // Calculate password strength using zxcvbn
      const result = zxcvbn(password);
      setPasswordStrength(result.score); // 0-4 (0 = weakest, 4 = strongest)
    } else {
      setPasswordStrength(0);
    }
  }, [password]);

  // Password match checking
  const passwordsMatch = password === confirmPassword && confirmPassword !== '';

  // Get text and color for password strength
  const getStrengthText = () => {
    switch(passwordStrength) {
      case 0: return { text: 'Very Weak', color: 'rgb(239, 68, 68)' }; // red-500
      case 1: return { text: 'Weak', color: 'rgb(249, 115, 22)' }; // orange-500
      case 2: return { text: 'Fair', color: 'rgb(234, 179, 8)' }; // yellow-500
      case 3: return { text: 'Good', color: 'rgb(34, 197, 94)' }; // green-500
      case 4: return { text: 'Strong', color: 'rgb(22, 163, 74)' }; // green-600
      default: return { text: 'Very Weak', color: 'rgb(239, 68, 68)' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!username) {
      setFormError("Username is required");
      return;
    }
    
    if (password !== confirmPassword) {
      setFormError("Passwords don't match");
      return;
    }
    
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long');
      return;
    }
    
    setFormError(null);
    setSubmitting(true);
    
    try {
      const success = await register(username, email, password, firstName, lastName);
      if (success) {
        // Redirect to summit dashboard after successful registration
        navigate('/summit', { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5" />
        <div className="relative z-10 flex flex-col justify-center px-16 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="flex items-center space-x-4">
              <img src="/Logo-white-no-text .svg" alt="Everyst Logo" className="h-16 w-16" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">everyst</h1>
                <p className="text-muted-foreground">Server Monitoring & Security Platform</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-foreground leading-tight">
                Setup your
                <span className="text-primary block">security command center</span>
              </h2>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                Create your administrator account to begin monitoring and securing 
                your server infrastructure with enterprise-grade tools.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-primary/60" />
                  <span className="text-foreground">Real-time server monitoring</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-primary/60" />
                  <span className="text-foreground">Advanced security analytics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-primary/60" />
                  <span className="text-foreground">Automated threat detection</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-primary/60" />
                  <span className="text-foreground">Centralized user management</span>
                </div>
              </div>
              
              <div className="p-6 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center space-x-3 mb-3">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">Administrator Setup</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  You're creating the first administrator account for this instance. 
                  This account will have full system privileges.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 opacity-20">
          <Network className="h-16 w-16 text-primary" />
        </div>
        <div className="absolute bottom-32 right-32 opacity-10">
          <Sparkles className="h-32 w-32 text-primary" />
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md mx-auto"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src="/Logo-white-no-text .svg" alt="Everyst Logo" className="h-16 w-16 mb-4" />
            <h1 className="text-2xl font-bold text-foreground">everyst</h1>
            <p className="text-muted-foreground text-sm">Server Monitoring & Security Platform</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">Create account</h2>
              <p className="text-muted-foreground">
                Set up your administrator account
              </p>
            </div>

            {(error || formError) && (
              <AuthNotification 
                type="error"
                message={formError || error || ''}
                onDismiss={() => setFormError(null)}
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium text-foreground">
                    First Name
                  </label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11"
                    placeholder="First"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium text-foreground">
                    Last Name
                  </label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11"
                    placeholder="Last"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-foreground">
                  Username <span className="text-destructive">*</span>
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
                    className="pl-10 h-11"
                    placeholder="Choose a username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-muted-foreground" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password <span className="text-destructive">*</span>
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
                    className="pl-10 h-11"
                    placeholder="Create a strong password"
                  />
                </div>
                {password && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium" style={{ color: getStrengthText().color }}>
                        {getStrengthText().text}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {password.length}/8 min
                      </span>
                    </div>
                    <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full transition-all duration-300 ease-out rounded-full"
                        style={{ 
                          width: `${(passwordStrength + 1) * 20}%`,
                          backgroundColor: getStrengthText().color
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(passwordStrength + 1) * 20}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-muted-foreground" />
                  </div>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-11"
                    placeholder="Confirm your password"
                  />
                  {confirmPassword && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {passwordsMatch ? (
                        <CheckCircle size={18} className="text-green-500" />
                      ) : (
                        <XCircle size={18} className="text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {confirmPassword && (
                  <div className="text-sm">
                    {passwordsMatch ? (
                      <span className="text-green-600 flex items-center">
                        <CheckCircle size={14} className="mr-1" />
                        Passwords match
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center">
                        <XCircle size={14} className="mr-1" />
                        Passwords don't match
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={submitting || !passwordsMatch || password.length < 8}
              >
                {submitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-background border-t-transparent rounded-full mr-2"
                    />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Administrator Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              This will be your primary administrator account
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
