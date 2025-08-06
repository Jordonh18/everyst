import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import type { User } from '../../types/users';
import { useAuth } from '../../context/AuthContext';
import { useNotificationsManager } from '../../hooks/state/useNotificationsManager';

// Helper function to get API URL
const getApiUrl = () => {
  return '/api';
};

interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentOwner: User;
  eligibleUsers: User[];
}

const TransferOwnershipModal: React.FC<TransferOwnershipModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentOwner,
  eligibleUsers
}) => {
  const { getAccessToken, user: currentUser } = useAuth();
  const { sendUserNotification } = useNotificationsManager();
  const [newOwnerId, setNewOwnerId] = useState<string | number>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTransferOwnership = async () => {
    if (!newOwnerId) {
      setError('Please select a user to transfer ownership to.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // First, promote the new user to owner
      const promoteResponse = await fetch(`${getApiUrl()}/users/${newOwnerId}/set_role/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'owner' })
      });

      if (!promoteResponse.ok) {
        const errorData = await promoteResponse.json();
        throw new Error(errorData.detail || 'Failed to promote user to owner');
      }

      // Then demote the current owner to admin (safer default)
      const demoteResponse = await fetch(`${getApiUrl()}/users/${currentOwner.id}/set_role/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'admin' })
      });

      if (!demoteResponse.ok) {
        const errorData = await demoteResponse.json();
        // If demote fails, we have a problem with two owners, alert about this
        throw new Error(errorData.detail || 'Failed to demote current owner. System may have multiple owners now.');
      }

      sendUserNotification(
        currentUser?.id as string,
        'Success',
        `Ownership transferred successfully to ${eligibleUsers.find(u => u.id === newOwnerId)?.username || 'new user'}`,
        'success'
      );

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error transferring ownership:', error);
      setError(error instanceof Error ? error.message : 'Failed to transfer ownership');
      sendUserNotification(
        currentUser?.id as string,
        'Error',
        error instanceof Error ? error.message : 'Failed to transfer ownership',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer System Ownership</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-[rgb(var(--color-warning-bg))] border border-[rgb(var(--color-warning-border))] text-[rgb(var(--color-warning-text))] p-4 rounded-md mb-4">
            <h3 className="font-medium">Important</h3>
            <p className="text-sm mt-1">
              You are about to transfer system ownership from <strong>{currentOwner.username}</strong>.
              The system must have exactly one owner at all times. The current owner will be demoted
              to an administrator role.
            </p>
          </div>

          {error && (
            <div className="bg-[rgb(var(--color-error-bg))] border border-[rgb(var(--color-error-border))] text-[rgb(var(--color-error))] p-3 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
              Select New System Owner*
            </label>
            <select
              value={newOwnerId}
              onChange={(e) => setNewOwnerId(e.target.value)}
              className="w-full px-3 py-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-input))] text-[rgb(var(--color-text))]"
              disabled={loading}
            >
              <option value="">-- Select a User --</option>
              {eligibleUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name} (@${user.username})`
                    : `${user.username}`}
                  {user.id === currentUser?.id ? ' (You)' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[rgb(var(--color-text-secondary))]">
              Only active users with admin role or higher are eligible to become system owners.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[rgb(var(--color-border))] rounded-md text-[rgb(var(--color-text))] hover:bg-[rgba(var(--color-primary),0.05)] transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleTransferOwnership}
            className="px-4 py-2 bg-[rgb(var(--color-primary))] text-white rounded-md hover:bg-[rgb(var(--color-primary-light))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !newOwnerId}
          >
            {loading ? 'Transferring...' : 'Transfer Ownership'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferOwnershipModal;
