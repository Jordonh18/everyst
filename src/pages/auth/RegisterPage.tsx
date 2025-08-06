import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, CheckCircle, XCircle } from 'lucide-react';
import zxcvbn from 'zxcvbn';
import { AuthNotification } from '../../components/auth/AuthNotification';
import { Button } from '../../components/ui';

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
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: 'url("/images/everyst-bg.jpg")' }}>
      <div className="max-w-md w-full px-6 py-8 bg-[rgba(var(--color-card),0.97)] backdrop-blur-sm shadow-xl rounded-lg border border-[rgb(var(--color-border))]">
        <div className="flex flex-col items-center mb-6">
          <img src="/images/everyst-logo.svg" alt="Everyst Logo" className="h-16 mb-4" />
          <h1 className="text-3xl font-bold text-[rgb(var(--color-text))]">Create an Account</h1>
          <p className="text-[rgb(var(--color-text))] font-medium">Set up administrator account</p>
        </div>

        {(error || formError) && (
          <AuthNotification 
            type="error"
            message={formError || error || ''}
            onDismiss={() => setFormError(null)}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-[rgb(var(--color-text))] mb-2 block">
              Username
            </label>
            <div className="relative mt-1.5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={16} className="text-[rgb(var(--color-text))]" />
              </div>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md py-2 pl-10 pr-3 font-medium"
                placeholder="Enter username"
              />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium text-[rgb(var(--color-text))] mb-2 block">
                First Name
              </label>
              <div className="relative mt-1.5">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={16} className="text-[rgb(var(--color-text))]" />
                </div>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-md py-2 pl-10 pr-3 font-medium"
                  placeholder="First name"
                />
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium text-[rgb(var(--color-text))] mb-2 block">
                Last Name
              </label>
              <div className="relative mt-1.5">
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-md py-2 px-3 font-medium"
                  placeholder="Last name"
                />
              </div>
            </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-[rgb(var(--color-text))] mb-2 block">
              Email
            </label>
            <div className="relative mt-1.5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={16} className="text-[rgb(var(--color-text))]" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md py-2 pl-10 pr-3 font-medium"
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-[rgb(var(--color-text))] mb-2 block">
              Password
            </label>
            <div className="relative mt-1.5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-[rgb(var(--color-text))]" />
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md py-2 pl-10 pr-3 font-medium"
                placeholder="Enter password"
              />
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: getStrengthText().color }}>
                    {getStrengthText().text} password
                  </span>
                </div>
                <div className="h-2 w-full bg-[rgba(var(--color-border),0.3)] rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300 ease-out"
                    style={{ 
                      width: `${(passwordStrength + 1) * 20}%`,
                      backgroundColor: getStrengthText().color
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-[rgb(var(--color-text))] mb-2 block">
              Confirm Password
            </label>
            <div className="relative mt-1.5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-[rgb(var(--color-text))]" />
              </div>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md py-2 pl-10 pr-3 font-medium"
                placeholder="Confirm password"
              />
              {confirmPassword && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {passwordsMatch ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-red-500" />
                  )}
                </div>
              )}
            </div>
            {confirmPassword && (
              <div className="mt-1 text-sm">
                {passwordsMatch ? (
                  <span className="text-green-500">Passwords match</span>
                ) : (
                  <span className="text-red-500">Passwords don't match</span>
                )}
              </div>
            )}
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              variant="default"
              fullWidth
              isLoading={submitting}
              disabled={submitting}
            >
              Create Account
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          {/* Only show when no users exist */}
          <span className="text-[rgb(var(--color-text-secondary))]">Set up your first admin account to get started</span>
        </div>
      </div>
    </div>
  );
};
