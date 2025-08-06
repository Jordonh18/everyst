import React, { useState, useEffect, useMemo } from 'react';
import { Panel } from '../../components/ui/Panel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Button, Input, Table, TableBody, TableRow, TableCell, TableHeader, TableHead } from '../../components/ui';
import TransferOwnershipModal from '../../components/climbers/TransferOwnershipModal';
import { 
  UserPlus, 
  UserCog,
  UserX,
  Search,
  Shield,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PermissionGate from '../../components/auth/PermissionGate';
import type { User, UserRole } from '../../types/users';
import { useNotificationsManager } from '../../hooks/state/useNotificationsManager';

// Helper function to get API URL
const getApiUrl = () => {
  return '/api';
};

// User role badge with appropriate color based on role using CSS variables
const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  // Using role-specific CSS variables defined in index.css
  const roleStyles: Record<string, { bg: string, text: string }> = {
    'owner': { 
      bg: 'bg-[rgb(var(--color-role-owner-bg))]', 
      text: 'text-[rgb(var(--color-role-owner-text))]' 
    },
    'admin': { 
      bg: 'bg-[rgb(var(--color-role-admin-bg))]', 
      text: 'text-[rgb(var(--color-role-admin-text))]' 
    },
    'manager': { 
      bg: 'bg-[rgb(var(--color-role-manager-bg))]', 
      text: 'text-[rgb(var(--color-role-manager-text))]' 
    },
    'user': { 
      bg: 'bg-[rgb(var(--color-role-user-bg))]', 
      text: 'text-[rgb(var(--color-role-user-text))]' 
    }
  };

  const { bg, text } = roleStyles[role] || roleStyles['user'];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
};

// Using the imported Modal component from '../../components/ui/Modal'

// Add User Form
const AddUserForm: React.FC<{ 
  onClose: () => void, 
  onSuccess: () => void,
  setExternalLoading: (isLoading: boolean) => void,
  users: User[] // Adding users prop to check for existing owners
}> = ({ onClose, onSuccess, setExternalLoading, users }) => {
  const { getAccessToken, user } = useAuth();
  const { sendUserNotification } = useNotificationsManager();
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'user'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if there's already a system owner
  const hasExistingOwner = useMemo(() => {
    return Array.isArray(users) && users.some(user => user.role === 'owner');
  }, [users]);

  // Fetch available roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = getAccessToken();
        if (!token) return;

        const response = await fetch(`${getApiUrl()}/roles/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Roles API response:', data);
          // Ensure data is an array before setting it
          setAvailableRoles(Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
      }
    };

    fetchRoles();
  }, [getAccessToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.username) newErrors.username = 'Username is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setExternalLoading(true);
    
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch(`${getApiUrl()}/users/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: formData.role
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle API validation errors
        if (data.username) setErrors(prev => ({ ...prev, username: data.username[0] }));
        if (data.email) setErrors(prev => ({ ...prev, email: data.email[0] }));
        if (data.password) setErrors(prev => ({ ...prev, password: data.password[0] }));
        if (data.detail) {
          // Handle specific error for system owner limitation
          if (data.detail.includes('system owner')) {
            setErrors(prev => ({ ...prev, role: data.detail }));
          }
          throw new Error(data.detail);
        }
        throw new Error('Failed to create user');
      }
      
      sendUserNotification(
        user?.id as string,
        'Success',
        `User ${formData.username} created successfully`,
        'success'
      );
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      sendUserNotification(
        user?.id as string,
        'Error',
        error instanceof Error ? error.message : 'Failed to create user',
        'error'
      );
    } finally {
      setExternalLoading(false);
    }
  };

  return (
    <form id="addUserForm" onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
          Username*
        </label>
        <Input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className={errors.username ? 'border-[rgb(var(--color-error))]' : ''}
          placeholder="username"
        />
        {errors.username && <p className="mt-1 text-sm text-[rgb(var(--color-error))]">{errors.username}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
          Email*
        </label>
        <Input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={errors.email ? 'border-[rgb(var(--color-error))]' : ''}
          placeholder="email@example.com"
        />
        {errors.email && <p className="mt-1 text-sm text-[rgb(var(--color-error))]">{errors.email}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
            First Name
          </label>
          <Input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="First name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
            Last Name
          </label>
          <Input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Last name"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
          Password*
        </label>
        <Input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className={errors.password ? 'border-[rgb(var(--color-error))]' : ''}
          placeholder="••••••••"
        />
        {errors.password && <p className="mt-1 text-sm text-[rgb(var(--color-error))]">{errors.password}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
          Confirm Password*
        </label>
        <Input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className={errors.confirmPassword ? 'border-[rgb(var(--color-error))]' : ''}
          placeholder="••••••••"
        />
        {errors.confirmPassword && <p className="mt-1 text-sm text-[rgb(var(--color-error))]">{errors.confirmPassword}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
          Role*
        </label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className={`w-full px-3 py-2 border ${
            errors.role ? 'border-[rgb(var(--color-error))]' : 'border-[rgb(var(--color-border))]'
          } rounded-md bg-[rgb(var(--color-input-bg))] text-[rgb(var(--color-text))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--color-primary))] focus:border-[rgb(var(--color-primary))] appearance-none`}
          style={{ 
            backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='rgb(var(--color-text-secondary))' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.7rem center',
            backgroundSize: '0.7em'
          }}
        >
          {Array.isArray(availableRoles) ? availableRoles.map((role) => {
            // Don't show owner option if there's already an owner
            if (role.name === 'owner' && hasExistingOwner) {
              return null;
            }
            return (
              <option 
                key={role.name} 
                value={role.name}
                className="text-[rgb(var(--color-text))] bg-[rgb(var(--color-input-bg))]"
              >
                {role.name.charAt(0).toUpperCase() + role.name.slice(1)} - {role.description}
              </option>
            );
          }) : <option value="" className="text-[rgb(var(--color-text))] bg-[rgb(var(--color-input-bg))]">Loading roles...</option>}
          {Array.isArray(availableRoles) && availableRoles.length === 0 && <option value="user" className="text-[rgb(var(--color-text))] bg-[rgb(var(--color-input-bg))]">User</option>}
        </select>
        {errors.role && <p className="mt-1 text-sm text-[rgb(var(--color-error))]">{errors.role}</p>}
        {hasExistingOwner && (
          <p className="mt-1 text-sm text-[rgb(var(--color-warning-text))]">
            There is already a system owner. You cannot create another owner.
          </p>
        )}
      </div>

    </form>
  );
};

// Edit User Form
const EditUserForm: React.FC<{ 
  user: User, 
  users: User[],
  onClose: () => void, 
  onSuccess: () => void,
  setExternalLoading: (isLoading: boolean) => void 
}> = ({ user, users, onClose, onSuccess, setExternalLoading }) => {
  const { getAccessToken } = useAuth();
  const { sendUserNotification } = useNotificationsManager();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [formData, setFormData] = useState({
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    role: user.role || 'user',
    isActive: user.is_active
  });
  const isCurrentOwner = user.role === 'owner';
  
  // Access parent component state via context or props
  const transferOwnership = () => {
    // This will trigger the modal in the parent component
    const event = new CustomEvent('transferOwnership', { detail: user });
    document.dispatchEvent(event);
    onClose(); // Close the edit dialog
  };

  // Fetch available roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = getAccessToken();
        if (!token) return;

        const response = await fetch(`${getApiUrl()}/roles/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Roles API response:', data);
          // Ensure data is an array before setting it
          if (Array.isArray(data)) {
            setRoles(data);
          } else if (data && typeof data === 'object') {
            // If it's paginated response with results property
            if (Array.isArray(data.results)) {
              setRoles(data.results);
            } else {
              // Fallback to empty array
              setRoles([]);
            }
          } else {
            // Fallback to empty array
            setRoles([]);
          }
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
      }
    };

    fetchRoles();
  }, [getAccessToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for role changes when the user is currently an owner
    if (name === 'role' && isCurrentOwner && value !== 'owner') {
      // If trying to demote an owner to another role, trigger the ownership transfer
      transferOwnership();
      return; // Don't update the role yet
    }
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'isActive' 
        ? (e.target as HTMLInputElement).checked 
        : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If attempting to change owner's role, show transfer dialog instead of submitting
    if (isCurrentOwner && formData.role !== 'owner') {
      transferOwnership();
      return;
    }
    
    setExternalLoading(true);
    
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Update basic user information
      const basicUpdateResponse = await fetch(`${getApiUrl()}/users/${user.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          is_active: formData.isActive
        })
      });
      
      if (!basicUpdateResponse.ok) {
        throw new Error('Failed to update user information');
      }
      
      // Only update role if it changed
      if (formData.role !== user.role) {
        // Special check if trying to promote a user to owner
        if (formData.role === 'owner') {
          // Count current owners
          const currentOwners = users.filter(u => u.role === 'owner' && u.id !== user.id);
          
          if (currentOwners.length > 0) {
            throw new Error('There can only be one system owner. Please transfer ownership from the current owner first.');
          }
        }
        
        // Set user role
        const roleUpdateResponse = await fetch(`${getApiUrl()}/users/${user.id}/set_role/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role: formData.role })
        });
        
        if (!roleUpdateResponse.ok) {
          const errorData = await roleUpdateResponse.json();
          throw new Error(errorData.detail || 'Failed to update user role');
        }
      }
      
      sendUserNotification(
        user?.id as string,
        'Success',
        `User ${user.username} updated successfully`,
        'success'
      );
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      sendUserNotification(
        user?.id as string,
        'Error',
        error instanceof Error ? error.message : 'Failed to update user',
        'error'
      );
    } finally {
      setExternalLoading(false);
    }
  };

  // Eligibility check now handled in the parent component's TransferOwnershipModal

  return (
    <form id="editUserForm" onSubmit={handleSubmit} className="space-y-4">
      {isCurrentOwner && (
        <div className="bg-[rgb(var(--color-info-bg))] border border-[rgb(var(--color-info-border))] text-[rgb(var(--color-info-text))] p-3 rounded-md mb-4">
          <p className="text-sm">
            <strong>System Owner:</strong> This user has full administrative access to the system.
            To change their role, you must first transfer ownership to another user.
          </p>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
          Username
        </label>
        <input
          type="text"
          value={user.username}
          disabled
          className="w-full px-3 py-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgba(var(--color-input),0.5)] text-[rgb(var(--color-text-secondary))]"
        />
        <p className="mt-1 text-xs text-[rgb(var(--color-text-secondary))]">Username cannot be changed</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
          Email
        </label>
        <input
          type="email"
          value={user.email}
          disabled
          className="w-full px-3 py-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgba(var(--color-input),0.5)] text-[rgb(var(--color-text-secondary))]"
        />
        <p className="mt-1 text-xs text-[rgb(var(--color-text-secondary))]">Email address cannot be changed</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
            First Name
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-input))] text-[rgb(var(--color-text))]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
            Last Name
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-input))] text-[rgb(var(--color-text))]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
          Role
        </label>          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-input-bg))] text-[rgb(var(--color-text))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--color-primary))] focus:border-[rgb(var(--color-primary))] appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ 
              backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='rgb(var(--color-text-secondary))' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.7rem center',
              backgroundSize: '0.7em'
            }}
            disabled={isCurrentOwner} // Disable role selection for the owner
          >
            {Array.isArray(roles) && roles.map((role) => {
              // For non-owner users, don't show owner role if there already is one
              const hasExistingOwner = users.some(u => u.role === 'owner' && u.id !== user.id);
              if (role.name === 'owner' && hasExistingOwner && user.role !== 'owner') {
                return null; // Skip this option if there's already an owner
              }
              
              return (
                <option 
                  key={role.name} 
                  value={role.name} 
                  className="text-[rgb(var(--color-text))] bg-[rgb(var(--color-input-bg))]"
                >
                  {role.name.charAt(0).toUpperCase() + role.name.slice(1)} - {role.description}
                </option>
              );
            })}
            {(!Array.isArray(roles) || roles.length === 0) && <option value="user" className="text-[rgb(var(--color-text))] bg-[rgb(var(--color-input-bg))]">User</option>}
          </select>
          {isCurrentOwner && (
            <p className="mt-1 text-sm text-[rgb(var(--color-warning-text))]">
              To change this user's role, you must first transfer system ownership to another user.
            </p>
          )}
      </div>

      <div className="flex items-center">
        <input
          id="is-active"
          type="checkbox"
          name="isActive"
          checked={formData.isActive}
          onChange={handleChange}
          className="h-4 w-4 text-[rgb(var(--color-primary))] focus:ring-[rgb(var(--color-primary))] border-[rgb(var(--color-border))] rounded"
        />
        <label htmlFor="is-active" className="ml-2 block text-sm text-[rgb(var(--color-text))]">
          Active Account
        </label>
      </div>
      
      {isCurrentOwner && (
        <div className="mt-4 p-3 bg-[rgb(var(--color-info-bg))] border border-[rgb(var(--color-info-border))] rounded-md">
          <h4 className="text-sm font-medium text-[rgb(var(--color-info-text))]">System Owner Actions</h4>
          <p className="text-xs text-[rgb(var(--color-info-text))] mt-1 mb-2">
            The system requires exactly one owner at all times. To change this user's role, 
            you must first transfer ownership to another administrator.
          </p>
          <Button
            type="button"
            onClick={transferOwnership}
            variant="outline"
            className="w-full text-[rgb(var(--color-primary))]"
          >
            Transfer Ownership to Another User
          </Button>
        </div>
      )}
    </form>
  );
};

// Props for ClimbersUserManagement component
type ClimbersPageProps = Record<string, never>;

const ClimbersUserManagement: React.FC<ClimbersPageProps> = () => {
  const { user: currentUser, getAccessToken } = useAuth();
  const { sendUserNotification } = useNotificationsManager();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [showEditUserModal, setShowEditUserModal] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [systemOwner, setSystemOwner] = useState<User | null>(null);
  const [showOwnershipModal, setShowOwnershipModal] = useState<boolean>(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  // Dedicated loading states for form buttons in modal footers
  const [addUserLoading, setAddUserLoading] = useState<boolean>(false);
  const [editUserLoading, setEditUserLoading] = useState<boolean>(false);
  
  // Table columns definition
  const userTableColumns = [
    { key: 'id', label: 'ID', className: 'w-12' },
    { key: 'user', label: 'User' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'joined', label: 'Joined' },
    { key: 'actions', label: 'Actions', className: 'text-right' }
  ];
  
  // Add event listener for ownership transfer
  useEffect(() => {
    const handleTransferOwnership = (event: CustomEvent<User>) => {
      setSystemOwner(event.detail);
      setShowOwnershipModal(true);
    };

    document.addEventListener('transferOwnership', handleTransferOwnership as EventListener);
    
    return () => {
      document.removeEventListener('transferOwnership', handleTransferOwnership as EventListener);
    };
  }, []);

  // Fetch users and roles
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = getAccessToken();
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        // Always fetch current user first to ensure we have at least one user
        const currentUserResponse = await fetch(`${getApiUrl()}/users/me/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (currentUserResponse.ok) {
          const userData = await currentUserResponse.json();
          console.log('Current user data:', userData);
          
          // Initialize users list with current user
          setUsers([userData]);
        }
        
        // Fetch all users 
        const usersResponse = await fetch(`${getApiUrl()}/users/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!usersResponse.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const usersData = await usersResponse.json();
        console.log('Users API response:', usersData);
        
        // Handle both array responses and object responses with results property
        let usersList: User[] = [];
        
        if (Array.isArray(usersData)) {
          usersList = usersData;
          setUsers(usersData);
        } else if (usersData && typeof usersData === 'object') {
          // If it's paginated response with results property
          if (Array.isArray(usersData.results)) {
            usersList = usersData.results;
            setUsers(usersData.results);
          } else {
            // If it's a single user object, wrap it in array
            usersList = [usersData];
            setUsers([usersData]);
          }
        } else {
          // Fallback to empty array
          setUsers([]);
        }
        
        // Find and set the system owner
        const owner = usersList.find(user => user.role === 'owner');
        if (owner) {
          setSystemOwner(owner);
        }
        
        // Fetch roles - we'll keep this code but not store the result since it's not used in this component
        const rolesResponse = await fetch(`${getApiUrl()}/roles/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!rolesResponse.ok) {
          throw new Error('Failed to fetch roles');
        }
        
        // Make sure at least the current user is included
        if (currentUser) {
          setUsers(prevUsers => {
            // Check if current user is in the list
            const hasCurrentUser = Array.isArray(prevUsers) && 
              prevUsers.some(user => user.id === currentUser.id);
              
            if (!hasCurrentUser) {
              console.log('Adding current user to list:', currentUser);
              return [...prevUsers, currentUser];
            }
            return prevUsers;
          });
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load users. Please try again.');
        sendUserNotification(
          currentUser?.id as string,
          'Error',
          'Failed to load users data.',
          'error'
        );
        
        // Even if main request fails, ensure current user is shown
        if (currentUser) {
          setUsers([currentUser]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [getAccessToken, sendUserNotification, currentUser]);
  
  // Filtered users based on search term and role filter
  const filteredUsers = (Array.isArray(users) ? users : []).filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });
  
  // Function to handle user deletion
  const handleUserDelete = async (userId: string | number) => {
    // Prevent deleting your own account
    if (userId === currentUser?.id) {
      sendUserNotification(
        currentUser?.id as string,
        'Error',
        'You cannot delete your own account.',
        'error'
      );
      return;
    }
    
    // Get the user to be deleted
    const userToDeleteData = users.find(user => user.id === userId);
    
    // Prevent deleting system owner
    if (userToDeleteData?.role === 'owner') {
      sendUserNotification(
        currentUser?.id as string,
        'Error',
        'System owners cannot be deleted for security reasons.',
        'error'
      );
      return;
    }
    
    // Set user to delete and show confirmation dialog
    setUserToDelete(userToDeleteData || null);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch(`${getApiUrl()}/users/${userToDelete.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      
      // Update the users list, ensuring users is treated as an array
      setUsers(Array.isArray(users) ? users.filter(user => user.id !== userToDelete.id) : []);
      
      sendUserNotification(
        currentUser?.id as string,
        'Success',
        'User was successfully deleted.',
        'success'
      );
      
      setShowDeleteConfirmModal(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      sendUserNotification(
        currentUser?.id as string,
        'Error',
        'Failed to delete user. Please try again.',
        'error'
      );
    }
  };
  
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">Climbers</h1>
        <p className="text-[rgb(var(--color-text-secondary))] mt-1">
          Manage users and their roles in your system
        </p>
      </header>
      
      <PermissionGate 
        permission="canManageUsers"
        fallback={
          <Panel className="bg-[rgb(var(--color-warning-bg))] border-[rgb(var(--color-warning-border))]">
            <div className="p-4 text-[rgb(var(--color-warning-text))]">
              <div className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                <h3 className="font-medium">Insufficient Permissions</h3>
              </div>
              <p className="mt-1 text-sm">
                You don't have permission to manage users. Contact your administrator for access.
              </p>
            </div>
          </Panel>
        }
      >
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[rgb(var(--color-text-secondary))]" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-md"
              />
            </div>
            
            <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
              {/* Role Filter */}
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-input-bg))] text-[rgb(var(--color-text))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--color-primary))] focus:border-[rgb(var(--color-primary))] hover:border-[rgb(var(--color-border))]"
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='rgb(var(--color-text-secondary))' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.7rem center',
                    backgroundSize: '0.7em'
                  }}
                >
                  <option value="all" className="text-[rgb(var(--color-text))] bg-[rgb(var(--color-input-bg))]">All Roles</option>
                  <option value="owner" className="text-[rgb(var(--color-text))] bg-[rgb(var(--color-input-bg))]">Owner</option>
                  <option value="admin" className="text-[rgb(var(--color-text))] bg-[rgb(var(--color-input-bg))]">Admin</option>
                  <option value="manager" className="text-[rgb(var(--color-text))] bg-[rgb(var(--color-input-bg))]">Manager</option>
                  <option value="user" className="text-[rgb(var(--color-text))] bg-[rgb(var(--color-input-bg))]">User</option>
                </select>
                {/* Remove the ChevronDown icon since we're using CSS for the dropdown arrow */}
              </div>
              
              {/* Refresh Button */}
              <Button 
                variant="outline" 
                aria-label="Refresh connection"
                title="Refresh connection"
                className="p-2"
              >
                <RefreshCw size={16} />
              </Button>
              
              {/* Add User Button */}
              <Button
                onClick={() => setShowAddUserModal(true)}
                variant="default"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
          {/* Users Table */}
          <Panel>
            <Table>
              <TableHeader>
                <TableRow>
                  {userTableColumns.map((column) => (
                    <TableHead key={column.key} className={column.className || ''}>
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading state
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`loading-${index}`} className="animate-pulse">
                      <TableCell><div className="h-4 w-8 bg-[rgb(var(--color-border))] rounded"></div></TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-[rgb(var(--color-border))]"></div>
                          <div className="ml-3 space-y-1">
                            <div className="h-4 w-24 bg-[rgb(var(--color-border))] rounded"></div>
                            <div className="h-3 w-16 bg-[rgb(var(--color-border))] rounded"></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><div className="h-4 w-32 bg-[rgb(var(--color-border))] rounded"></div></TableCell>
                      <TableCell><div className="h-5 w-16 bg-[rgb(var(--color-border))] rounded-full"></div></TableCell>
                      <TableCell><div className="h-5 w-16 bg-[rgb(var(--color-border))] rounded-full"></div></TableCell>
                      <TableCell><div className="h-4 w-24 bg-[rgb(var(--color-border))] rounded"></div></TableCell>
                      <TableCell className="text-right"><div className="h-8 w-16 bg-[rgb(var(--color-border))] rounded ml-auto"></div></TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  // Error state
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-[rgb(var(--color-text-secondary))] py-6">
                      <AlertCircle className="h-6 w-6 mx-auto mb-2 text-[rgb(var(--color-error))]" />
                      <p>{error}</p>
                      <Button
                        onClick={() => window.location.reload()}
                        variant="ghost"
                        className="mt-2"
                      >
                        Try Again
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  // Empty state
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-[rgb(var(--color-text-secondary))] py-6">
                      <UserX className="h-6 w-6 mx-auto mb-2" />
                      <p>No users found matching your criteria</p>
                      {searchTerm && (
                        <Button
                          onClick={() => setSearchTerm('')}
                          variant="ghost"
                          className="mt-1"
                        >
                          Clear Search
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  // User list
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-sm text-[rgb(var(--color-text-secondary))]">
                        {typeof user.id === 'number' ? `#${user.id}` : user.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-[rgb(var(--color-primary))] text-white flex items-center justify-center uppercase font-medium text-sm">
                            {user.first_name ? user.first_name[0] : user.username[0]}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-[rgb(var(--color-text))]">
                              {user.first_name && user.last_name 
                                ? `${user.first_name} ${user.last_name}` 
                                : user.username}
                              {user.id === currentUser?.id && (
                                <span className="ml-2 text-xs text-[rgb(var(--color-text-secondary))]">(You)</span>
                              )}
                            </div>
                            <div className="text-xs text-[rgb(var(--color-text-secondary))]">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-[rgb(var(--color-text))]">{user.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={user.role || 'user'} />
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? 'bg-[rgb(var(--color-status-active-bg))] text-[rgb(var(--color-status-active-text))]' 
                            : 'bg-[rgb(var(--color-status-inactive-bg))] text-[rgb(var(--color-status-inactive-text))]'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-[rgb(var(--color-text-secondary))]">
                        {user.date_joined 
                          ? new Date(user.date_joined).toLocaleDateString() 
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditUserModal(true);
                            }}
                            className="text-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary-hover))]"
                            aria-label={`Edit ${user.username}`}
                          >
                            <UserCog className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleUserDelete(user.id)}
                            className={`${
                              user.id === currentUser?.id || user.role === 'owner'
                                ? 'text-[rgba(var(--color-error),0.4)] cursor-not-allowed'
                                : 'text-[rgb(var(--color-error))] hover:text-[rgb(var(--color-error-hover))]'
                            }`}
                            aria-label={`Delete ${user.username}`}
                            disabled={user.id === currentUser?.id || user.role === 'owner'}
                            title={
                              user.id === currentUser?.id 
                                ? "You cannot delete your own account"
                                : user.role === 'owner'
                                  ? "System owners cannot be deleted - transfer ownership first"
                                  : `Delete ${user.username}`
                            }
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Panel>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Panel className="p-4">
              <h3 className="text-lg font-medium text-[rgb(var(--color-text))]">Total Users</h3>
              <p className="text-3xl font-bold mt-2 text-[rgb(var(--color-text))]">{Array.isArray(users) ? users.length : 0}</p>
              <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
                Active: {Array.isArray(users) ? users.filter(user => user.is_active).length : 0} | 
                Inactive: {Array.isArray(users) ? users.filter(user => !user.is_active).length : 0}
              </p>
            </Panel>
            
            <Panel className="p-4">
              <h3 className="text-lg font-medium text-[rgb(var(--color-text))]">Role Distribution</h3>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[rgb(var(--color-text))]">Owners</span>
                  <span className="font-medium text-[rgb(var(--color-text))]">
                    {Array.isArray(users) ? users.filter(user => user.role === 'owner').length : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[rgb(var(--color-text))]">Admins</span>
                  <span className="font-medium text-[rgb(var(--color-text))]">
                    {Array.isArray(users) ? users.filter(user => user.role === 'admin').length : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[rgb(var(--color-text))]">Managers</span>
                  <span className="font-medium text-[rgb(var(--color-text))]">
                    {Array.isArray(users) ? users.filter(user => user.role === 'manager').length : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[rgb(var(--color-text))]">Users</span>
                  <span className="font-medium text-[rgb(var(--color-text))]">
                    {Array.isArray(users) ? users.filter(user => user.role === 'user' || !user.role).length : 0}
                  </span>
                </div>
              </div>
            </Panel>
            
            <Panel className="p-4">
              <h3 className="text-lg font-medium text-[rgb(var(--color-text))]">Recent Activity</h3>
              <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-2">
                Last user joined: {
                  Array.isArray(users) && users.length > 0 
                    ? new Date(Math.max(...users
                        .filter(user => user.date_joined)
                        .map(user => new Date(user.date_joined || '').getTime())))
                        .toLocaleDateString()
                    : 'N/A'
                }
              </p>
            </Panel>
          </div>
        </div>
      </PermissionGate>
      
      {/* Modals */}
      <Dialog open={showAddUserModal} onOpenChange={(open) => !open && setShowAddUserModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          
          <AddUserForm 
            onClose={() => setShowAddUserModal(false)} 
            onSuccess={() => {
              // Use the main loading state for refreshing the data
              setLoading(true);
              setTimeout(() => setLoading(false), 500); // Simulate refresh
            }}
            setExternalLoading={setAddUserLoading}
            users={users}
          />
          
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setShowAddUserModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              form="addUserForm"
              type="submit"
              disabled={addUserLoading}
              variant="default"
            >
              {addUserLoading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showEditUserModal} onOpenChange={(open) => !open && setShowEditUserModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <EditUserForm 
              user={selectedUser}
              users={users}
              onClose={() => setShowEditUserModal(false)} 
              onSuccess={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 500); // Simulate refresh
              }} 
              setExternalLoading={setEditUserLoading}
            />
          )}
          
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setShowEditUserModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              form="editUserForm"
              type="submit"
              disabled={editUserLoading}
              variant="default"
            >
              {editUserLoading ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ownership Transfer Modal */}
      {systemOwner && (
        <TransferOwnershipModal
          isOpen={showOwnershipModal}
          onClose={() => setShowOwnershipModal(false)}
          onSuccess={() => {
            // Reload all users to reflect the ownership change
            setLoading(true);
            const fetchData = async () => {
              try {
                const token = getAccessToken();
                if (token) {
                  const usersResponse = await fetch(`${getApiUrl()}/users/`, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  if (usersResponse.ok) {
                    const usersData = await usersResponse.json();
                    if (Array.isArray(usersData)) {
                      setUsers(usersData);
                      const newOwner = usersData.find((u: User) => u.role === 'owner');
                      if (newOwner) setSystemOwner(newOwner);
                    } else if (usersData?.results && Array.isArray(usersData.results)) {
                      setUsers(usersData.results);
                      const newOwner = usersData.results.find((u: User) => u.role === 'owner');
                      if (newOwner) setSystemOwner(newOwner);
                    }
                  }
                }
                setShowOwnershipModal(false);
              } catch (err) {
                console.error('Error updating users after ownership transfer:', err);
              } finally {
                setLoading(false);
              }
            };
            fetchData();
          }}
          currentOwner={systemOwner}
          eligibleUsers={users.filter(user => 
            user.id !== systemOwner.id && 
            user.is_active && 
            (user.role === 'admin')
          )}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmModal} onOpenChange={setShowDeleteConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.first_name && userToDelete?.last_name 
                ? `${userToDelete.first_name} ${userToDelete.last_name}` 
                : userToDelete?.username}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirmModal(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClimbersUserManagement;
