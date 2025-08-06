import React from 'react';
import { motion } from 'framer-motion';
import { Scan, ArrowRight, Network } from 'lucide-react';
import { Card, Button } from '../../../components/ui';

interface EmptyScanStateProps {
  onScan: () => void;
}

export const EmptyScanState: React.FC<EmptyScanStateProps> = ({ onScan }) => {
  return (
    <div className="h-full flex items-center justify-center p-4">
      <motion.div 
        className="max-w-2xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ 
                duration: 0.5,
                delay: 0.2,
                type: "spring",
                stiffness: 100
              }}
              className="w-20 h-20 rounded-full bg-[rgba(var(--color-primary),0.1)] flex items-center justify-center"
            >
              <Network size={40} className="text-[rgb(var(--color-primary))]" />
            </motion.div>
          </div>
          
          <motion.h1 
            className="text-2xl font-bold text-[rgb(var(--color-text))] mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Welcome to Glacier Network Map
          </motion.h1>
          
          <motion.p 
            className="text-[rgb(var(--color-text-secondary))] mb-6 max-w-lg mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Your network visualization and management interface. To get started, 
            scan your network to discover connected devices and visualize your network topology.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="max-w-md mx-auto mb-8 bg-[rgba(var(--color-card-muted),0.5)] border border-[rgb(var(--color-border))] rounded-lg p-4"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3 p-2 bg-[rgba(var(--color-primary),0.1)] rounded-full">
                <Scan size={20} className="text-[rgb(var(--color-primary))]" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-[rgb(var(--color-text))] mb-1">Scan Your Network</h3>
                <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                  Automatically discover devices on your network, map connections, and identify potential issues.
                </p>
              </div>
            </div>
          </motion.div>
          
          <Button
            onClick={onScan}
            variant="default"
            size="lg"
          >
            <Scan size={20} className="mr-2" />
            Begin Network Scan
            <ArrowRight size={18} className="ml-2" />
          </Button>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="text-xs text-[rgb(var(--color-text-tertiary))] mt-8"
          >
            Initial scan may take several minutes depending on network size and complexity.
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
};

export default EmptyScanState;
