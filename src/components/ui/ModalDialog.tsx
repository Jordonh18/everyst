import React from 'react';
import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footerContent?: ReactNode;
  className?: string;
}

export const ModalDialog: React.FC<ModalDialogProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  footerContent,
  className 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="py-2">
          {children}
        </div>
        
        {footerContent && (
          <DialogFooter>
            {footerContent}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
