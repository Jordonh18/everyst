import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Search, ChevronDown, Settings, LogOut, Menu, Palette, Github, Award, User, BookOpen } from 'lucide-react';
import { NotificationsMenu } from '../ui/NotificationsMenu';
import { useNotificationsManager } from '../../hooks/state/useNotificationsManager';
import { ModalDialog } from '../ui/ModalDialog';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onMenuToggle 
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);

  // Format user's display name
  const userName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.first_name || user?.email?.split('@')[0] || 'User';

  // Get notifications manager
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification, 
    clearAllNotifications
  } = useNotificationsManager();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle logout
  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  // Handle navigation to account settings with specific tab
  const handleNavigateToAccountSettings = (tab: string) => {
    setProfileOpen(false);
    navigate(`/account?tab=${tab}`);
  };

  return (
    <header className="bg-[rgb(var(--color-card))] border-b border-[rgb(var(--color-border))] h-14 flex items-center justify-between px-4 lg:px-6 relative z-20">
      {/* Left side - Menu toggle and Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        {/* Menu toggle button */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="p-1 rounded-md hover:bg-[rgba(var(--color-primary),0.1)] transition-colors duration-200 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu size={20} className="text-[rgb(var(--color-text))]" />
          </button>
        )}
        
        {/* Search input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-[rgb(var(--color-text-secondary))]" />
          </div>
          <input
            type="search"
            placeholder="Search..."
            className="w-full bg-[rgb(var(--color-search-bg))] border border-[rgb(var(--color-border))] rounded-md py-1.5 pl-10 pr-3 text-[rgb(var(--color-text))] placeholder-[rgb(var(--color-text-secondary))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--color-primary))]"
            aria-label="Search everyst"
          />
        </div>
      </div>

      {/* Middle - Empty space for balance (optional) */}
      <div className="flex-1"></div>

      {/* Right side - GitHub, Credits, Notifications and User profile */}
      <div className="flex items-center gap-3">
        {/* GitHub link button */}
        <a 
          href="https://github.com/Jordonh18/everyst"
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md hover:bg-[rgba(var(--color-primary),0.1)] transition-colors duration-200 flex items-center justify-center group"
          aria-label="GitHub Repository"
          title="GitHub Repository"
        >
          <Github size={18} className="text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))] transition-colors duration-200" />
        </a>
        
        {/* Documentation link */}
        <a 
          href="https://docs.everyst.io/home"
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md hover:bg-[rgba(var(--color-primary),0.1)] transition-colors duration-200 flex items-center justify-center group"
          aria-label="Documentation"
          title="Documentation"
        >
          <BookOpen size={18} className="text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))] transition-colors duration-200" />
        </a>
        
        {/* Credits button */}
        <button 
          onClick={() => setCreditsModalOpen(true)}
          className="p-1.5 rounded-md hover:bg-[rgba(var(--color-primary),0.1)] transition-colors duration-200 flex items-center justify-center group"
          aria-label="View Credits"
          title="View Credits"
        >
          <Award size={18} className="text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))] transition-colors duration-200" />
        </button>
        
        {/* Notifications menu */}
        <NotificationsMenu 
          unreadCount={unreadCount}
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onRemoveNotification={removeNotification}
          onClearAll={clearAllNotifications}
        />
        
        {/* User profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button 
            ref={buttonRef}
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-[rgba(var(--color-primary),0.1)] transition-colors duration-200 group"
            aria-expanded={profileOpen}
            aria-haspopup="true"
            aria-label="User menu"
            title="Account Menu"
          >
            <User 
              size={18} 
              className="text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))] transition-colors duration-200" 
            />
            <ChevronDown 
              size={14} 
              className={`text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))] transition-colors duration-200 ${profileOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {profileOpen && (
            <div 
              className="absolute right-0 mt-1 border border-[rgb(var(--color-border))] rounded-lg shadow-lg z-50 w-48"
              style={{ 
                background: 'rgb(var(--color-card))',
                animation: 'dropdownFade 150ms ease-out',
                transformOrigin: 'top right',
              }}
            >
              <div className="p-3 border-b border-[rgb(var(--color-border))]">
                <div className="font-medium text-[rgb(var(--color-text))]">{userName}</div>
                <div className="text-xs text-[rgb(var(--color-text-secondary))]">
                  {user?.is_staff ? 'Administrator' : 'User'}
                </div>
              </div>
              <div className="py-1">
                <button 
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/account');
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-[rgb(var(--color-text))] hover:bg-[rgba(var(--color-primary),0.1)] transition-colors duration-150 group"
                >
                  <Settings 
                    size={16} 
                    className="mr-2 text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))] transition-colors duration-150" 
                  />
                  <span className="group-hover:text-[rgb(var(--color-primary))] transition-colors duration-150">Account settings</span>
                </button>
                
                {/* Theme settings button navigating to account page with theme tab */}
                <button 
                  onClick={() => handleNavigateToAccountSettings('appearance')}
                  className="flex items-center w-full px-4 py-2 text-sm text-[rgb(var(--color-text))] hover:bg-[rgba(var(--color-primary),0.1)] transition-colors duration-150 group"
                >
                  <Palette 
                    size={16} 
                    className="mr-2 text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))] transition-colors duration-150" 
                  />
                  <span className="group-hover:text-[rgb(var(--color-primary))] transition-colors duration-150">
                    Themes
                  </span>
                </button>
                
                <button 
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-[rgb(var(--color-text))] hover:bg-[rgba(var(--color-primary),0.1)] transition-colors duration-150 group"
                >
                  <LogOut 
                    size={16} 
                    className="mr-2 text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))] transition-colors duration-150" 
                  />
                  <span className="group-hover:text-[rgb(var(--color-primary))] transition-colors duration-150">Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Credits Modal */}
      <Modal 
        isOpen={creditsModalOpen}
        onClose={() => setCreditsModalOpen(false)}
        title="Credits">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-[rgb(var(--color-text))] mb-2">Logo Design</h3>
          <p className="text-[rgb(var(--color-text-secondary))]">
            The everyst logo was designed by{' '}
            {
              <a 
                href="" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary-light))] transition-colors"
                style={{
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px'
                }}
              >
                Katie Mckinlay
              </a>
            }. 
            We appreciate their contribution to making everyst look great!
          </p>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-[rgb(var(--color-text))] mb-2">Project Information</h3>
          <p className="text-[rgb(var(--color-text-secondary))] mb-3">
            everyst is an open-source project developed by Jordon Harrison.
          </p>
          <p className="text-[rgb(var(--color-text-secondary))]">
            Visit the{' '}
            <a 
              href="https://github.com/Jordonh18/everyst" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary-light))] transition-colors"
              style={{
                textDecoration: 'underline',
                textUnderlineOffset: '2px'
              }}
            >
              GitHub repository
            </a>{' '}
            to learn more about the project, contribute, or report issues.
          </p>
        </div>
      </Modal>
    </header>
  );
};