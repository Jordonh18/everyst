import React, { useState } from 'react';
import { Server, Monitor, Router, Shield, Box, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button, Input } from '../../../components/ui';
import type { NetworkDevice } from '../../../types/network';

interface AddDeviceModalProps {
  onAdd: (device: NetworkDevice) => void;
  onCancel: () => void;
  isOpen: boolean;
}

type DeviceType = 'server' | 'workstation' | 'router' | 'switch' | 'firewall' | 'other';

interface DeviceTypeOption {
  type: DeviceType;
  label: string;
  icon: React.ReactNode;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ onAdd, onCancel, isOpen }) => {
  const [deviceName, setDeviceName] = useState<string>('');
  const [deviceType, setDeviceType] = useState<DeviceType>('server');
  const [hostname, setHostname] = useState<string>('');
  const [ipAddress, setIpAddress] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const deviceTypes: DeviceTypeOption[] = [
    { type: 'server', label: 'Server', icon: <Server size={20} /> },
    { type: 'workstation', label: 'Workstation', icon: <Monitor size={20} /> },
    { type: 'router', label: 'Router', icon: <Router size={20} /> },
    { type: 'switch', label: 'Switch', icon: <Box size={20} /> },
    { type: 'firewall', label: 'Firewall', icon: <Shield size={20} /> },
    { type: 'other', label: 'Other', icon: <HelpCircle size={20} /> },
  ];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!deviceName.trim()) {
      newErrors.deviceName = 'Device name is required';
    }

    if (ipAddress) {
      // Basic IP validation
      const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const match = ipAddress.match(ipPattern);
      
      if (!match) {
        newErrors.ipAddress = 'Invalid IP address format';
      } else {
        const valid = match.slice(1).every(octet => {
          const num = parseInt(octet, 10);
          return num >= 0 && num <= 255;
        });
        
        if (!valid) {
          newErrors.ipAddress = 'IP address contains invalid values';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    const newDevice: NetworkDevice = {
      id: '', // Will be assigned by parent component
      label: deviceName,
      type: deviceType,
      status: 'online', // Default to online
      hostname: hostname || undefined,
      ip: ipAddress || undefined,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean) || undefined,
    };
    
    onAdd(newDevice);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Device</DialogTitle>
        </DialogHeader>
        
        {/* Form */}
        <form id="addDeviceForm" onSubmit={handleSubmit}>
          {/* Device Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-2">
              Device Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {deviceTypes.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                    deviceType === option.type
                      ? 'border-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.1)]'
                      : 'border-[rgb(var(--color-border))] hover:bg-[rgba(var(--color-card-muted),0.5)]'
                  }`}
                  onClick={() => setDeviceType(option.type)}
                >
                  <div className={`mb-1 ${deviceType === option.type ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                    {option.icon}
                  </div>
                  <span className={`text-xs font-medium ${deviceType === option.type ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Device Name */}
          <div className="mb-4">
            <label htmlFor="deviceName" className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
              Device Name *
            </label>
            <Input
              id="deviceName"
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className={errors.deviceName ? 'border-[rgb(var(--color-error))]' : ''}
              placeholder="e.g., Main Server"
            />
            {errors.deviceName && (
              <p className="mt-1 text-xs text-[rgb(var(--color-error))]">{errors.deviceName}</p>
            )}
          </div>
          
          {/* IP Address */}
          <div className="mb-4">
            <label htmlFor="ipAddress" className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
              IP Address
            </label>
            <Input
              id="ipAddress"
              type="text"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              className={errors.ipAddress ? 'border-[rgb(var(--color-error))]' : ''}
              placeholder="e.g., 192.168.1.10"
            />
            {errors.ipAddress && (
              <p className="mt-1 text-xs text-[rgb(var(--color-error))]">{errors.ipAddress}</p>
            )}
          </div>
          
          {/* Hostname */}
          <div className="mb-4">
            <label htmlFor="hostname" className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
              Hostname
            </label>
            <Input
              id="hostname"
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="e.g., main-server"
            />
          </div>
          
          {/* Tags */}
          <div className="mb-4">
            <label htmlFor="tags" className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
              Tags (comma separated)
            </label>
            <Input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., production, core, database"
            />
            <p className="mt-1 text-xs text-[rgb(var(--color-text-secondary))]">
              Separate multiple tags with commas
            </p>
          </div>
        </form>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
          >
            Add Device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddDeviceModal;
