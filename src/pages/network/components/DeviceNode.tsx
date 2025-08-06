import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { Server, Monitor, Router, Shield, Box, HelpCircle } from 'lucide-react';
import { Badge } from '../../../components/ui';
import type { NetworkDevice } from '../../../types/network';

// Device icon mapping based on type
const DeviceIcon: React.FC<{ type: string; size: number }> = ({ type, size }) => {
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

export const DeviceNode: React.FC<NodeProps<NetworkDevice>> = memo(({ data, isConnectable, selected }) => {
  // Status colors based on device status
  const getNodeColors = () => {
    switch (data.status) {
      case 'online':
        return {
          bg: 'bg-[rgba(var(--color-success),0.1)]',
          border: 'border-[rgba(var(--color-success),0.3)]',
          shadow: 'shadow-[0_0_8px_rgba(var(--color-success),0.3)]',
          icon: 'text-[rgb(var(--color-success))]'
        };
      case 'warning':
        return {
          bg: 'bg-[rgba(var(--color-warning),0.1)]',
          border: 'border-[rgba(var(--color-warning),0.3)]',
          shadow: 'shadow-[0_0_8px_rgba(var(--color-warning),0.3)]',
          icon: 'text-[rgb(var(--color-warning))]'
        };
      case 'offline':
        return {
          bg: 'bg-[rgba(var(--color-error),0.1)]',
          border: 'border-[rgba(var(--color-error),0.3)]',
          shadow: 'shadow-[0_0_8px_rgba(var(--color-error),0.3)]',
          icon: 'text-[rgb(var(--color-text-secondary))]'
        };
      case 'error':
        return {
          bg: 'bg-[rgba(var(--color-error),0.1)]',
          border: 'border-[rgba(var(--color-error),0.3)]',
          shadow: 'shadow-[0_0_8px_rgba(var(--color-error),0.3)]',
          icon: 'text-[rgb(var(--color-error))]'
        };
      default:
        return {
          bg: 'bg-[rgba(var(--color-text-secondary),0.1)]',
          border: 'border-[rgba(var(--color-text-secondary),0.3)]',
          shadow: 'shadow-none',
          icon: 'text-[rgb(var(--color-text-secondary))]'
        };
    }
  };
  
  const { bg, border, shadow, icon } = getNodeColors();
  // Use 'selected' from props for node selection state
  const isSelected = selected;

  return (
    <>
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-[rgb(var(--color-primary))]"
      />
      
      {/* Main node */}
      <motion.div
        className={`p-2 rounded-lg border ${bg} ${border} ${isSelected ? shadow : ''} transition-shadow duration-300`}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        style={{
          boxShadow: isSelected ? '0 0 0 2px rgb(var(--color-primary))' : '',
          minWidth: '120px'
        }}
      >
        <div className="flex flex-col items-center">
          {/* Device icon */}
          <div className={`p-3 rounded-full ${bg} ${icon} mb-2`}>
            <DeviceIcon type={data.type} size={28} />
          </div>
          
          {/* Device label */}
          <div className="text-center">
            <div className="font-medium text-sm mb-1 text-[rgb(var(--color-text))] truncate max-w-[100px]" title={data.label}>
              {data.label}
            </div>
            
            {/* IP/Hostname */}
            {data.ip && (
              <div className="text-xs text-[rgb(var(--color-text-secondary))] truncate max-w-[100px]" title={data.ip}>
                {data.ip}
              </div>
            )}

            {/* Status indicator */}
            <div className="mt-1 flex justify-center">
              <Badge 
                variant={
                  data.status === 'online' ? 'default' :
                  data.status === 'warning' ? 'secondary' : 
                  data.status === 'offline' || data.status === 'error' ? 'destructive' : 
                  'outline'
                }
              >
                {data.status}
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-[rgb(var(--color-primary))]"
      />
    </>
  );
});

export default DeviceNode;
