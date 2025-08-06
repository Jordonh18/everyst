import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '@/components/theme-provider';
import { useLocation } from 'react-router-dom';
import { Panel } from '../../components/ui/Panel';
import { Button, Label, Card, CardContent, CardDescription, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator } from '../../components/ui';
import { 
  User, 
  Shield, 
  Key,
  Sun, 
  Moon, 
  Save, 
  X, 
  Upload,
  Palette,
  Monitor
} from 'lucide-react';
import { useNotificationsManager } from '../../hooks/state/useNotificationsManager';

// Helper function to get API URL
const getApiUrl = () => {
  // Use relative URL to leverage Vite's proxy configuration
  return '/api';
};

const AccountSettingsPage: React.FC = () => {
  const { user, getAccessToken, refreshToken } = useAuth();
  const { theme, setTheme } = useTheme();
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
            >
              <User size={20} className="mr-2" />
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
            >
              <Shield size={20} className="mr-2" />
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
            >
              <Palette size={20} className="mr-2" />
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
                        >
                          <Upload size={16} className="mr-2" />
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
                  >
                    {!isLoading ? <Save size={16} className="mr-2" /> : null}
                    {isLoading ? 'Saving...' : 'Save Changes'}
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
                  >
                    {!isLoading ? <Key size={16} className="mr-2" /> : null}
                    {isLoading ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            </Panel>
          )}
          
          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <Card className="border-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme & Appearance
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of your application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Color Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose between light, dark, or system preference
                  </p>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="light"
                        name="theme"
                        value="light"
                        checked={theme === "light"}
                        onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
                        className="text-primary"
                      />
                      <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
                        <Sun className="h-4 w-4" />
                        Light
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="dark"
                        name="theme"
                        value="dark"
                        checked={theme === "dark"}
                        onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
                        className="text-primary"
                      />
                      <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
                        <Moon className="h-4 w-4" />
                        Dark
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="system"
                        name="theme"
                        value="system"
                        checked={theme === "system"}
                        onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
                        className="text-primary"
                      />
                      <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
                        <Monitor className="h-4 w-4" />
                        System
                      </Label>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Theme Preview */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Preview</Label>
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="h-4 w-32 bg-primary rounded"></div>
                        <div className="h-3 w-24 bg-muted rounded"></div>
                      </div>
                      <div className="h-8 w-8 bg-primary rounded-full"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-muted rounded"></div>
                      <div className="h-2 w-4/5 bg-muted rounded"></div>
                      <div className="h-2 w-3/5 bg-muted rounded"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-primary rounded text-xs flex items-center justify-center text-primary-foreground">
                        Button
                      </div>
                      <div className="h-6 w-16 bg-secondary rounded text-xs flex items-center justify-center">
                        Cancel
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Accessibility Settings */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Accessibility</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Reduce motion</Label>
                        <p className="text-xs text-muted-foreground">
                          Minimizes animations and transitions
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-primary"
                        // Add your reduce motion state here
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">High contrast</Label>
                        <p className="text-xs text-muted-foreground">
                          Increases color contrast for better visibility
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-primary"
                        // Add your high contrast state here
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Display Settings */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Display</Label>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Font size</Label>
                      <Select defaultValue="medium">
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select font size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                          <SelectItem value="extra-large">Extra Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Sidebar position</Label>
                      <Select defaultValue="left">
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select sidebar position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccountSettingsPage;
