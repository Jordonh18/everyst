import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Server, 
  Monitor, 
  Router, 
  Shield, 
  Box, 
  HelpCircle, 
  Clock, 
  Tag, 
  Wifi, 
  Cable,
  Trash2,
  Edit,
  RefreshCw,
  Power,
} from 'lucide-react';
import { Card, IconButton, Badge, Button } from '../../../components/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import type { NetworkDevice } from '../../../types/network';

interface DeviceDetailsProps {
  device?: NetworkDevice;
  onClose: () => void;
  onEdit?: (device: NetworkDevice) => void;
  onRescan?: (deviceId: string) => void;
  onToggleStatus?: (device: NetworkDevice) => void;
  onRemove?: (deviceId: string) => void;
}

// Device icon mapping based on type
const DeviceIcon: React.FC<{ type?: string; size: number }> = ({ type, size }) => {
  switch (type) {
    case 'server':
      return <Server size={size} />;
    case 'workstation':
      return <Monitor size={size} />;
    case 'router':
      return <Router size={size} />;
    case 'firewall':
      return <Shield size={size} />;
    case 'switch':
      return <Box size={size} />;
    default:
      return <HelpCircle size={size} />;
  }
};

export const DeviceDetails: React.FC<DeviceDetailsProps> = ({ 
  device, 
  onClose,
  onEdit,
  onRescan,
  onToggleStatus,
  onRemove 
}) => {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  
  if (!device) return null;
  
  // Format the last seen timestamp
  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';
    
    const lastSeen = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return lastSeen.toLocaleString();
  };
  
  // Determine status indicator
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'online':
        return { status: 'success', text: 'Online' };
      case 'offline':
        return { status: 'error', text: 'Offline' };
      case 'warning':
        return { status: 'warning', text: 'Warning' };
      case 'error':
        return { status: 'error', text: 'Error' };
      default:
        return { status: 'neutral', text: 'Unknown' };
    }
  };
  
  const { status, text } = getStatusIndicator(device.status);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
      className="w-80"
    >
      <Card className="overflow-hidden">
        {/* Header with close button */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-[rgb(var(--color-text))]">Device Details</h3>
          <IconButton
            icon={<X size={16} />}
            variant="ghost"
            tooltipText="Close details"
            onClick={onClose}
          />
        </div>
        
        {/* Device info and status */}
        <div className="flex items-center mb-4">
          <div className="p-3 rounded-full bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))] mr-3">
            <DeviceIcon type={device.type} size={24} />
          </div>
          <div>
            <h4 className="text-base font-medium text-[rgb(var(--color-text))]">{device.label}</h4>
            <div className="flex items-center text-xs text-[rgb(var(--color-text-secondary))]">
              <span className="capitalize">{device.type}</span>
              <span className="mx-2">•</span>
              <Badge variant={status === 'success' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}>
                {text}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Device properties */}
        <div className="space-y-3 mb-4">
          {/* Network info */}
          {device.ip && (
            <div className="flex items-start">
              <div className="w-8 flex-shrink-0 text-[rgb(var(--color-primary))]">
                <Wifi size={16} />
              </div>
              <div>
                <div className="text-xs font-medium text-[rgb(var(--color-text-secondary))]">IP Address</div>
                <div className="text-sm text-[rgb(var(--color-text))]">{device.ip}</div>
              </div>
            </div>
          )}
          
          {/* Hostname */}
          {device.hostname && (
            <div className="flex items-start">
              <div className="w-8 flex-shrink-0 text-[rgb(var(--color-primary))]">
                <Server size={16} />
              </div>
              <div>
                <div className="text-xs font-medium text-[rgb(var(--color-text-secondary))]">Hostname</div>
                <div className="text-sm text-[rgb(var(--color-text))]">{device.hostname}</div>
              </div>
            </div>
          )}
          
          {/* MAC Address */}
          {device.mac && (
            <div className="flex items-start">
              <div className="w-8 flex-shrink-0 text-[rgb(var(--color-primary))]">
                <Cable size={16} />
              </div>
              <div>
                <div className="text-xs font-medium text-[rgb(var(--color-text-secondary))]">MAC Address</div>
                <div className="text-sm text-[rgb(var(--color-text))]">{device.mac}</div>
              </div>
            </div>
          )}
          
          {/* Last seen */}
          {device.lastSeen && (
            <div className="flex items-start">
              <div className="w-8 flex-shrink-0 text-[rgb(var(--color-primary))]">
                <Clock size={16} />
              </div>
              <div>
                <div className="text-xs font-medium text-[rgb(var(--color-text-secondary))]">Last Seen</div>
                <div className="text-sm text-[rgb(var(--color-text))]">{formatLastSeen(device.lastSeen)}</div>
              </div>
            </div>
          )}
          
          {/* Tags */}
          {device.tags && device.tags.length > 0 && (
            <div className="flex items-start">
              <div className="w-8 flex-shrink-0 text-[rgb(var(--color-primary))]">
                <Tag size={16} />
              </div>
              <div>
                <div className="text-xs font-medium text-[rgb(var(--color-text-secondary))]">Tags</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {device.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 text-xs rounded-full bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-wrap gap-2 border-t border-[rgb(var(--color-border))] pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit && onEdit(device)}
            aria-label="Edit device"
            title="Edit device"
          >
            <Edit size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRescan && onRescan(device.id)}
            aria-label="Rescan device"
            title="Rescan device"
          >
            <RefreshCw size={16} />
          </Button>
          <Button
            variant={device.status === 'online' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToggleStatus && onToggleStatus(device)}
            aria-label={device.status === 'online' ? 'Device is online' : 'Device is offline'}
            title={device.status === 'online' ? 'Device is online' : 'Device is offline'}
          >
            <Power size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRemoveDialog(true)}
            aria-label="Remove device"
            title="Remove device"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </Card>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {device.label || device.hostname || device.ip || 'this device'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRemoveDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (onRemove) onRemove(device.id);
                setShowRemoveDialog(false);
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default DeviceDetails;
