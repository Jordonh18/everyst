import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useLocation } from 'react-router-dom';
import { Panel } from '../../components/ui/Panel';
import { Button } from '../../components/ui';
import { 
  User, 
  Shield, 
  Key,
  Sun, 
  Moon, 
  Save, 
  X, 
  Upload,
  Palette
} from 'lucide-react';
import { useNotificationsManager } from '../../hooks/state/useNotificationsManager';

// Helper function to get API URL
const getApiUrl = () => {
  // Use relative URL to leverage Vite's proxy configuration
  return '/api';
};

const AccountSettingsPage: React.FC = () => {
  const { user, getAccessToken, refreshToken } = useAuth();
  const { colorMode, setColorMode, colorTheme, setColorTheme } = useTheme();
  const location = useLocation();
  const { sendUserNotification } = useNotificationsManager();
  
  // State for user data
  const [userData, setUserData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
  });
  
  // State for password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // State for profile image
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Get tab from URL query parameters or default to 'profile'
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  
  // Active tab state
  const [activeTab, setActiveTab] = useState(tabParam || 'profile');
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Update active tab when URL query parameter changes
  useEffect(() => {
    if (tabParam && ['profile', 'security', 'appearance'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  
  // Fetch user profile image if available
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!user?.id) return;
      
      try {
        const token = getAccessToken();
        // Add timestamp to URL as a cache-busting parameter
        const timestamp = new Date().getTime();
        const response = await fetch(`${getApiUrl()}/users/${user.id}/profile-image/?t=${timestamp}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          cache: 'no-cache', // Ensure no caching
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);
          setProfileImage(imageUrl);
        }
      } catch (error) {
        console.error('Error fetching profile image:', error);
      }
    };
    
    fetchProfileImage();
  }, [user?.id, getAccessToken]);
  
  // Handle input changes for user data
  const handleUserDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle input changes for password data
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle profile image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setProfileImage(URL.createObjectURL(file));
    }
  };
  
  // Handle form submission for profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = getAccessToken();
      
      // Update user data
      const response = await fetch(`${getApiUrl()}/users/${user?.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: userData.firstName,
          last_name: userData.lastName,
          email: userData.email,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }
      
      // If image file exists, upload it
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const imageResponse = await fetch(`${getApiUrl()}/users/${user?.id}/profile-image/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        if (!imageResponse.ok) {
          throw new Error('Failed to upload profile image');
        }
        
        // We've just uploaded the image so it's already in state and doesn't need to be refetched
        // This prevents any flickering or disappearance of the image
      }
      
      // Refresh user data
      await refreshToken();
      
      // Show success notification
      setSuccess('Profile updated successfully!');
      sendUserNotification(user?.id as string, 'Profile Updated', 'Your profile has been updated successfully.', 'success');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle password change
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setIsLoading(false);
      return;
    }
    
    try {
      const token = getAccessToken();
      
      const response = await fetch(`${getApiUrl()}/users/${user?.id}/change-password/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }
      
      // Clear form and show success
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      setSuccess('Password changed successfully!');
      sendUserNotification(user?.id as string, 'Security Update', 'Your password has been changed successfully.', 'success');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-[rgb(var(--color-text))]">Account Settings</h1>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar with tabs */}
        <div className="md:w-64">
          <nav className="flex flex-col space-y-2">
            <Button
              onClick={() => setActiveTab('profile')}
              className={`justify-start text-lg px-4 py-3.5 ${
                activeTab === 'profile'
                  ? 'bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))]'
                  : 'text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-hover))]'
              }`}
              variant="ghost"
              leftIcon={<User size={20} />}
              active={activeTab === 'profile'}
            >
              Profile Information
            </Button>
            
            <Button
              onClick={() => setActiveTab('security')}
              className={`justify-start text-lg px-4 py-3.5 ${
                activeTab === 'security'
                  ? 'bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))]'
                  : 'text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-hover))]'
              }`}
              variant="ghost"
              leftIcon={<Shield size={20} />}
              active={activeTab === 'security'}
            >
              Security
            </Button>
            
            <Button
              onClick={() => setActiveTab('appearance')}
              className={`justify-start text-lg px-4 py-3.5 ${
                activeTab === 'appearance'
                  ? 'bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))]'
                  : 'text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-hover))]'
              }`}
              variant="ghost"
              leftIcon={<Palette size={20} />}
              active={activeTab === 'appearance'}
            >
              Theme & Appearance
            </Button>
          </nav>
        </div>
        
        {/* Main content area */}
        <div className="flex-1">
          {/* Profile Information Tab */}
          {activeTab === 'profile' && (
            <Panel>
              <h2 className="text-xl font-semibold mb-6 text-[rgb(var(--color-text))]">Profile Information</h2>
              
              {/* Error/Success Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
                  <span>{error}</span>
                  <Button
                    onClick={() => setError(null)}
                    variant="ghost"
                    size="sm"
                    aria-label="Dismiss"
                    className="p-1"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
                  <span>{success}</span>
                  <Button
                    onClick={() => setSuccess(null)}
                    variant="ghost"
                    size="sm"
                    aria-label="Dismiss"
                    className="p-1"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
              
              <form onSubmit={handleProfileUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left column - User details */}
                  <div>
                    <div className="mb-4">
                      <label className="block text-[rgb(var(--color-text))] text-sm font-medium mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={userData.firstName}
                        onChange={handleUserDataChange}
                        className="w-full px-3 py-2 border border-[rgb(var(--color-border))] bg-[rgb(var(--color-input-bg))] rounded-md text-[rgb(var(--color-text))]"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-[rgb(var(--color-text))] text-sm font-medium mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={userData.lastName}
                        onChange={handleUserDataChange}
                        className="w-full px-3 py-2 border border-[rgb(var(--color-border))] bg-[rgb(var(--color-input-bg))] rounded-md text-[rgb(var(--color-text))]"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-[rgb(var(--color-text))] text-sm font-medium mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={userData.email}
                        onChange={handleUserDataChange}
                        className="w-full px-3 py-2 border border-[rgb(var(--color-border))] bg-[rgb(var(--color-input-bg))] rounded-md text-[rgb(var(--color-text))]"
                      />
                    </div>
                  </div>
                  
                  {/* Right column - Profile picture */}
                  <div>
                    <label className="block text-[rgb(var(--color-text))] text-sm font-medium mb-2">
                      Profile Picture
                    </label>
                    
                    <div className="flex flex-col items-center border border-dashed border-[rgb(var(--color-border))] bg-[rgba(var(--color-card-light),0.5)] rounded-lg p-6">
                      <div className="mb-4 w-32 h-32 rounded-full overflow-hidden bg-[rgb(var(--color-card-light))] flex items-center justify-center">
                        {profileImage ? (
                          <img 
                            src={profileImage} 
                            alt="Profile"
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgba(var(--color-primary),0.7)] flex items-center justify-center text-white font-medium text-4xl">
                            {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
                          </div>
                        )}
                      </div>
                      
                      <label className="cursor-pointer">
                        <Button
                          variant="default"
                          leftIcon={<Upload size={16} />}
                        >
                          Upload a picture
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                      
                      <p className="mt-2 text-sm text-[rgb(var(--color-text-secondary))]">
                        Max size: 2MB
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button
                    type="submit"
                    variant="default"
                    disabled={isLoading}
                    isLoading={isLoading}
                    leftIcon={!isLoading ? <Save size={16} /> : undefined}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Panel>
          )}
          
          {/* Security Tab */}
          {activeTab === 'security' && (
            <Panel>
              <h2 className="text-xl font-semibold mb-6 text-[rgb(var(--color-text))]">Security Settings</h2>
              
              {/* Error/Success Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
                  <span>{error}</span>
                  <Button
                    onClick={() => setError(null)}
                    variant="ghost"
                    size="sm"
                    aria-label="Dismiss"
                    className="p-1"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
                  <span>{success}</span>
                  <Button
                    onClick={() => setSuccess(null)}
                    variant="ghost"
                    size="sm"
                    aria-label="Dismiss"
                    className="p-1"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
              
              <form onSubmit={handlePasswordUpdate}>
                <div className="mb-4">
                  <label className="block text-[rgb(var(--color-text))] text-sm font-medium mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-[rgb(var(--color-border))] bg-[rgb(var(--color-input-bg))] rounded-md text-[rgb(var(--color-text))]"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-[rgb(var(--color-text))] text-sm font-medium mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-[rgb(var(--color-border))] bg-[rgb(var(--color-input-bg))] rounded-md text-[rgb(var(--color-text))]"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-[rgb(var(--color-text))] text-sm font-medium mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-[rgb(var(--color-border))] bg-[rgb(var(--color-input-bg))] rounded-md text-[rgb(var(--color-text))]"
                  />
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button
                    type="submit"
                    variant="default"
                    disabled={isLoading}
                    isLoading={isLoading}
                    leftIcon={!isLoading ? <Key size={16} /> : undefined}
                  >
                    Change Password
                  </Button>
                </div>
              </form>
            </Panel>
          )}
          
          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <Panel>
              <h2 className="text-xl font-semibold mb-6 text-[rgb(var(--color-text))]">Theme & Appearance</h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 text-[rgb(var(--color-text))]">Color Mode</h3>
                <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-4">
                  Choose between light, dark and special modes for the application.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
                  <p className="text-sm">
                    <span className="font-semibold">Special Modes:</span> High Contrast (better readability), Reduced Motion (fewer animations), and Comfort Mode (softer colors) are available for accessibility and visual comfort.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* System Mode Option */}
                  <div 
                    className={`border ${
                      colorMode === 'system' 
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => colorMode !== 'system' && setColorMode('system')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="text-[rgb(var(--color-text))]" width="18" height="18" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium text-[rgb(var(--color-text))]">System</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorMode === 'system'
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {colorMode === 'system' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full h-16 bg-gradient-to-r from-white to-gray-800 border border-gray-200 rounded overflow-hidden">
                      <div className="h-2 w-1/2 bg-blue-500 m-2 rounded"></div>
                      <div className="h-2 w-3/4 bg-gray-300 m-2 rounded"></div>
                      <div className="h-2 w-2/3 bg-gray-500 m-2 rounded"></div>
                    </div>
                  </div>
                
                  {/* Light Mode Option */}
                  <div 
                    className={`border ${
                      colorMode === 'light' 
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => colorMode !== 'light' && setColorMode('light')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sun size={18} className="text-[rgb(var(--color-text))]" />
                        <span className="font-medium text-[rgb(var(--color-text))]">Light</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorMode === 'light'
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {colorMode === 'light' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full h-16 bg-white border border-gray-200 rounded overflow-hidden">
                      <div className="h-2 w-1/2 bg-blue-500 m-2 rounded"></div>
                      <div className="h-2 w-3/4 bg-gray-200 m-2 rounded"></div>
                      <div className="h-2 w-2/3 bg-gray-200 m-2 rounded"></div>
                    </div>
                  </div>
                  
                  {/* Dark Mode Option */}
                  <div 
                    className={`border ${
                      colorMode === 'dark' 
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => colorMode !== 'dark' && setColorMode('dark')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Moon size={18} className="text-[rgb(var(--color-text))]" />
                        <span className="font-medium text-[rgb(var(--color-text))]">Dark</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorMode === 'dark'
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {colorMode === 'dark' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full h-16 bg-gray-800 border border-gray-700 rounded overflow-hidden">
                      <div className="h-2 w-1/2 bg-blue-500 m-2 rounded"></div>
                      <div className="h-2 w-3/4 bg-gray-600 m-2 rounded"></div>
                      <div className="h-2 w-2/3 bg-gray-600 m-2 rounded"></div>
                    </div>
                  </div>
                  
                  {/* High Contrast Mode Option */}
                  <div 
                    className={`border ${
                      colorMode === 'high-contrast' 
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => colorMode !== 'high-contrast' && setColorMode('high-contrast')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="text-[rgb(var(--color-text))]" width="18" height="18" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        <span className="font-medium text-[rgb(var(--color-text))]">High Contrast</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorMode === 'high-contrast'
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {colorMode === 'high-contrast' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full h-16 bg-white border-2 border-black rounded overflow-hidden">
                      <div className="h-2 w-1/2 bg-blue-900 m-2 rounded"></div>
                      <div className="h-2 w-3/4 bg-black m-2 rounded"></div>
                      <div className="h-2 w-2/3 bg-black m-2 rounded"></div>
                    </div>
                  </div>
                  
                  {/* Reduced Motion Mode */}
                  <div 
                    className={`border ${
                      colorMode === 'reduced-motion' 
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => colorMode !== 'reduced-motion' && setColorMode('reduced-motion')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="text-[rgb(var(--color-text))]" width="18" height="18" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-[rgb(var(--color-text))]">Reduced Motion</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorMode === 'reduced-motion'
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {colorMode === 'reduced-motion' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full h-16 bg-white border border-gray-200 rounded overflow-hidden">
                      <div className="h-2 w-1/2 bg-blue-500 m-2 rounded"></div>
                      <div className="h-2 w-3/4 bg-gray-200 m-2 rounded"></div>
                      <div className="h-2 w-2/3 bg-gray-200 m-2 rounded"></div>
                    </div>
                  </div>
                  
                  {/* Soft Mode */}
                  <div 
                    className={`border ${
                      colorMode === 'soft' 
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => colorMode !== 'soft' && setColorMode('soft')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="text-[rgb(var(--color-text))]" width="18" height="18" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span className="font-medium text-[rgb(var(--color-text))]">Comfort Mode</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorMode === 'soft'
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {colorMode === 'soft' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full h-16 bg-[#F5F5FA] border border-[#DCDCEB] rounded overflow-hidden">
                      <div className="h-2 w-1/2 bg-blue-400 m-2 rounded"></div>
                      <div className="h-2 w-3/4 bg-[#DCDCEB] m-2 rounded"></div>
                      <div className="h-2 w-2/3 bg-[#DCDCEB] m-2 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-3 text-[rgb(var(--color-text))]">Theme Colors</h3>
                <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-4">
                  Choose a color theme for the application.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Default Theme */}                    <div 
                    className={`border ${
                      colorTheme === 'default' || !colorTheme
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => setColorTheme('default')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[rgb(56,189,248)]"></div>
                        <span className="font-medium text-[rgb(var(--color-text))]">Default</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorTheme === 'default' || !colorTheme
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {(colorTheme === 'default' || !colorTheme) && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between mb-2">
                      <div className="w-8 h-8 rounded-full bg-[rgb(56,189,248)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(14,165,233)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(139,92,246)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(99,102,241)]"></div>
                    </div>
                  </div>
                  
                  {/* Blue Theme */}
                  <div 
                    className={`border ${
                      colorTheme === 'blue' 
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => colorTheme !== 'blue' && setColorTheme('blue')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[rgb(37,99,235)]"></div>
                        <span className="font-medium text-[rgb(var(--color-text))]">Blue</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorTheme === 'blue'
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {colorTheme === 'blue' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between mb-2">
                      <div className="w-8 h-8 rounded-full bg-[rgb(37,99,235)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(59,130,246)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(99,102,241)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(129,140,248)]"></div>
                    </div>
                  </div>
                  
                  {/* Purple Theme */}
                  <div 
                    className={`border ${
                      colorTheme === 'purple' 
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => colorTheme !== 'purple' && setColorTheme('purple')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[rgb(139,92,246)]"></div>
                        <span className="font-medium text-[rgb(var(--color-text))]">Purple</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorTheme === 'purple'
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {colorTheme === 'purple' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between mb-2">
                      <div className="w-8 h-8 rounded-full bg-[rgb(139,92,246)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(124,58,237)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(217,70,239)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(232,121,249)]"></div>
                    </div>
                  </div>
                  
                  {/* Forest Theme */}
                  <div 
                    className={`border ${
                      colorTheme === 'forest' 
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => colorTheme !== 'forest' && setColorTheme('forest')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[rgb(20,83,45)]"></div>
                        <span className="font-medium text-[rgb(var(--color-text))]">Forest</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorTheme === 'forest'
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {colorTheme === 'forest' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between mb-2">
                      <div className="w-8 h-8 rounded-full bg-[rgb(20,83,45)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(34,197,94)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(4,120,87)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(16,185,129)]"></div>
                    </div>
                  </div>
                  
                  {/* Rose Theme */}
                  <div 
                    className={`border ${
                      colorTheme === 'rose' 
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => colorTheme !== 'rose' && setColorTheme('rose')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[rgb(225,29,72)]"></div>
                        <span className="font-medium text-[rgb(var(--color-text))]">Rose</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorTheme === 'rose'
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {colorTheme === 'rose' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between mb-2">
                      <div className="w-8 h-8 rounded-full bg-[rgb(225,29,72)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(244,63,94)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(251,113,133)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(253,164,175)]"></div>
                    </div>
                  </div>
                  
                  {/* Ocean Theme */}
                  <div 
                    className={`border ${
                      colorTheme === 'ocean' 
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => colorTheme !== 'ocean' && setColorTheme('ocean')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[rgb(2,132,199)]"></div>
                        <span className="font-medium text-[rgb(var(--color-text))]">Ocean</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorTheme === 'ocean'
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {colorTheme === 'ocean' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between mb-2">
                      <div className="w-8 h-8 rounded-full bg-[rgb(2,132,199)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(14,165,233)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(56,189,248)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(125,211,252)]"></div>
                    </div>
                  </div>
                  
                  {/* Slate Theme */}
                  <div 
                    className={`border ${
                      colorTheme === 'slate' 
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => colorTheme !== 'slate' && setColorTheme('slate')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[rgb(71,85,105)]"></div>
                        <span className="font-medium text-[rgb(var(--color-text))]">Slate</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorTheme === 'slate'
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {colorTheme === 'slate' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between mb-2">
                      <div className="w-8 h-8 rounded-full bg-[rgb(71,85,105)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(100,116,139)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(148,163,184)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(203,213,225)]"></div>
                    </div>
                  </div>
                  
                  {/* Amber Theme */}
                  <div 
                    className={`border ${
                      colorTheme === 'amber' 
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => colorTheme !== 'amber' && setColorTheme('amber')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[rgb(217,119,6)]"></div>
                        <span className="font-medium text-[rgb(var(--color-text))]">Amber</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorTheme === 'amber'
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {colorTheme === 'amber' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between mb-2">
                      <div className="w-8 h-8 rounded-full bg-[rgb(217,119,6)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(245,158,11)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(234,88,12)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(249,115,22)]"></div>
                    </div>
                  </div>
                  
                  {/* Teal Theme */}
                  <div 
                    className={`border ${
                      colorTheme === 'teal' 
                        ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)]' 
                        : 'border-[rgb(var(--color-border))]'
                    } rounded-lg p-4 cursor-pointer transition-all duration-200`}
                    onClick={() => colorTheme !== 'teal' && setColorTheme('teal')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[rgb(20,184,166)]"></div>
                        <span className="font-medium text-[rgb(var(--color-text))]">Teal</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border ${
                        colorTheme === 'teal'
                          ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]'
                          : 'border-[rgb(var(--color-border))]'
                      } flex items-center justify-center`}>
                        {colorTheme === 'teal' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between mb-2">
                      <div className="w-8 h-8 rounded-full bg-[rgb(20,184,166)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(13,148,136)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(15,118,110)]"></div>
                      <div className="w-8 h-8 rounded-full bg-[rgb(17,94,89)]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccountSettingsPage;
