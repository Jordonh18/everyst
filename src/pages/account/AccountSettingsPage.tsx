import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '@/components/theme-provider';
import { useLocation } from 'react-router-dom';
import { Button, Label, Card, CardContent, CardDescription, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator, Input, Checkbox, Textarea } from '../../components/ui';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
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
  Monitor,
  Trash2
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
    username: user?.username || '',
    bio: '',
  });
  
  // State for session timeout preference
  const [sessionTimeout, setSessionTimeout] = useState<string>(
    user?.session_timeout_minutes?.toString() || '30'
  );
  
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
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isSessionTimeoutLoading, setIsSessionTimeoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Update active tab when URL query parameter changes
  useEffect(() => {
    if (tabParam && ['profile', 'security', 'appearance'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Update session timeout when user data changes
  useEffect(() => {
    if (user?.session_timeout_minutes !== undefined) {
      setSessionTimeout(user.session_timeout_minutes.toString());
    }
  }, [user?.session_timeout_minutes]);
  
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
  const handleUserDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    setIsPasswordLoading(true);
    setError(null);
    setSuccess(null);
    
    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setIsPasswordLoading(false);
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
      setIsPasswordLoading(false);
    }
  };

  // Handle session timeout update
  const handleSessionTimeoutUpdate = async (newTimeout: string) => {
    setIsSessionTimeoutLoading(true);
    
    // Update UI immediately for better UX
    setSessionTimeout(newTimeout);
    
    try {
      const token = getAccessToken();
      const timeoutMinutes = parseInt(newTimeout);
      
      const response = await fetch(`${getApiUrl()}/users/${user?.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_timeout_minutes: timeoutMinutes,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // Revert the UI change if the API call failed
        setSessionTimeout(user?.session_timeout_minutes?.toString() || '30');
        throw new Error(errorData.detail || 'Failed to update session timeout');
      }
      
      // Refresh user data to get new session timeout in token (in background)
      refreshToken().catch(console.warn);
      
      // Show a subtle success notification
      sendUserNotification(user?.id as string, 'Settings Updated', 'Session timeout preference saved.', 'success');
    } catch (err) {
      console.error('Session timeout update failed:', err);
      // Don't show error to user for this non-critical operation, just log it
    } finally {
      setIsSessionTimeoutLoading(false);
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and profile picture
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Error/Success Messages */}
                {error && (
                  <div className="bg-destructive/15 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
                    <span>{error}</span>
                    <Button
                      onClick={() => setError(null)}
                      variant="ghost"
                      size="sm"
                      aria-label="Dismiss"
                      className="p-1 h-auto hover:bg-destructive/20"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                )}
                
                {success && (
                  <div className="bg-green-500/15 border border-green-500/20 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
                    <span>{success}</span>
                    <Button
                      onClick={() => setSuccess(null)}
                      variant="ghost"
                      size="sm"
                      aria-label="Dismiss"
                      className="p-1 h-auto hover:bg-green-500/20"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                )}
                
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left column - User details */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={userData.firstName}
                          onChange={handleUserDataChange}
                          placeholder="Enter your first name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={userData.lastName}
                          onChange={handleUserDataChange}
                          placeholder="Enter your last name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          name="email"
                          value={userData.email}
                          onChange={handleUserDataChange}
                          placeholder="Enter your email address"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          name="username"
                          value={userData.username}
                          disabled
                          className="bg-muted/50 cursor-not-allowed"
                          placeholder="Your unique username"
                        />
                        <p className="text-xs text-muted-foreground">
                          Your username is used for login and cannot be changed. You can also log in using your email address.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          value={userData.bio || ''}
                          onChange={handleUserDataChange}
                          placeholder="Tell us about yourself..."
                          rows={3}
                        />
                      </div>
                    </div>
                    
                    {/* Right column - Profile picture */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Profile Picture</Label>
                        <div className="flex flex-col items-center border-2 border-dashed border-border rounded-lg p-6 bg-muted/20">
                          <Avatar className="mb-4 w-32 h-32">
                            <AvatarImage 
                              src={profileImage || undefined} 
                              alt="Profile"
                            />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-medium text-4xl">
                              {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <label className="cursor-pointer">
                            <Button variant="outline" asChild>
                              <span>
                                <Upload size={16} className="mr-2" />
                                Upload Picture
                              </span>
                            </Button>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                            />
                          </label>
                          
                          <p className="mt-2 text-sm text-muted-foreground text-center">
                            JPG, PNG or GIF (max 2MB)
                          </p>
                        </div>
                      </div>
                      
                      {/* Notification Preferences */}
                      <div className="space-y-4">
                        <Label className="text-base font-medium">Notification Preferences</Label>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="emailNotifications" />
                            <Label htmlFor="emailNotifications" className="text-sm font-normal">
                              Email notifications
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="pushNotifications" />
                            <Label htmlFor="pushNotifications" className="text-sm font-normal">
                              Push notifications
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="securityAlerts" defaultChecked />
                            <Label htmlFor="securityAlerts" className="text-sm font-normal">
                              Security alerts
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="min-w-[120px]"
                    >
                      {!isLoading ? <Save size={16} className="mr-2" /> : null}
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          
          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your password and security preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Error/Success Messages */}
                {error && (
                  <div className="bg-destructive/15 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex justify-between items-center">
                    <span>{error}</span>
                    <Button
                      onClick={() => setError(null)}
                      variant="ghost"
                      size="sm"
                      aria-label="Dismiss"
                      className="p-1 h-auto hover:bg-destructive/20"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                )}
                
                {success && (
                  <div className="bg-green-500/15 border border-green-500/20 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex justify-between items-center">
                    <span>{success}</span>
                    <Button
                      onClick={() => setSuccess(null)}
                      variant="ghost"
                      size="sm"
                      aria-label="Dismiss"
                      className="p-1 h-auto hover:bg-green-500/20"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                )}
                
                {/* Password Change Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Change Password</h3>
                    <p className="text-sm text-muted-foreground">
                      Update your password to keep your account secure
                    </p>
                  </div>
                  
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter your current password"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter your new password"
                      />
                      <p className="text-xs text-muted-foreground">
                        Password must be at least 8 characters long
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirm your new password"
                      />
                    </div>
                    
                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        disabled={isPasswordLoading}
                        className="min-w-[140px]"
                      >
                        {!isPasswordLoading ? <Key size={16} className="mr-2" /> : null}
                        {isPasswordLoading ? 'Changing...' : 'Change Password'}
                      </Button>
                    </div>
                  </form>
                </div>

                <Separator />

                {/* Security Preferences */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Security Preferences</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure additional security settings for your account
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                      <div className="space-y-0.5">
                        <Label className="text-base">Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account (Coming Soon)
                        </p>
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        Enable
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                      <div className="space-y-0.5">
                        <Label className="text-base">Login Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified of new sign-ins to your account (Coming Soon)
                        </p>
                      </div>
                      <Checkbox defaultChecked disabled />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Session Timeout</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically sign out after period of inactivity
                        </p>
                      </div>
                      <Select 
                        value={sessionTimeout} 
                        onValueChange={handleSessionTimeoutUpdate}
                        disabled={isSessionTimeoutLoading}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="240">4 hours</SelectItem>
                          <SelectItem value="0">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Account Actions */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Account Actions</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your account and data
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Button variant="outline" className="justify-start w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Export Account Data
                    </Button>
                    
                    <Button variant="outline" className="justify-start w-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                        <Label htmlFor="reduceMotion" className="text-sm">Reduce motion</Label>
                        <p className="text-xs text-muted-foreground">
                          Minimizes animations and transitions
                        </p>
                      </div>
                      <Checkbox id="reduceMotion" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="highContrast" className="text-sm">High contrast</Label>
                        <p className="text-xs text-muted-foreground">
                          Increases color contrast for better visibility
                        </p>
                      </div>
                      <Checkbox id="highContrast" />
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
