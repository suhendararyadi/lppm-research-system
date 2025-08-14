"use client"

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Send, CheckCircle, XCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

const typeConfig = {
  danger: {
    icon: XCircle,
    confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
    iconClass: 'text-red-600',
  },
  warning: {
    icon: AlertTriangle,
    confirmButtonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    iconClass: 'text-yellow-600',
  },
  info: {
    icon: Send,
    confirmButtonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    iconClass: 'text-blue-600',
  },
  success: {
    icon: CheckCircle,
    confirmButtonClass: 'bg-green-600 hover:bg-green-700 text-white',
    iconClass: 'text-green-600',
  },
};

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  type = 'warning',
  isLoading = false,
}: ConfirmationModalProps) {
  const config = typeConfig[type];
  const IconComponent = config.icon;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-gray-100 ${config.iconClass}`}>
              <IconComponent className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            className={config.confirmButtonClass}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Memproses...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook untuk menggunakan confirmation modal dengan mudah
export function useConfirmationModal() {
  const [modalState, setModalState] = React.useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    onConfirm?: () => void;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: undefined,
    isLoading: false,
  });

  const showConfirmation = React.useCallback((
    options: {
      title: string;
      description: string;
      confirmText?: string;
      cancelText?: string;
      type?: 'danger' | 'warning' | 'info' | 'success';
      onConfirm: () => void;
    }
  ) => {
    setModalState({
      isOpen: true,
      ...options,
      isLoading: false,
    });
  }, []);

  const hideConfirmation = React.useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false, isLoading: false }));
  }, []);

  const setLoading = React.useCallback((loading: boolean) => {
    setModalState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const handleConfirm = React.useCallback(() => {
    if (modalState.onConfirm) {
      modalState.onConfirm();
    }
  }, [modalState.onConfirm]);

  const ConfirmationModalComponent = React.useCallback(() => (
    <ConfirmationModal
      isOpen={modalState.isOpen}
      onClose={hideConfirmation}
      onConfirm={handleConfirm}
      title={modalState.title}
      description={modalState.description}
      confirmText={modalState.confirmText}
      cancelText={modalState.cancelText}
      type={modalState.type}
      isLoading={modalState.isLoading}
    />
  ), [modalState, hideConfirmation, handleConfirm]);

  return {
    showConfirmation,
    hideConfirmation,
    setLoading,
    ConfirmationModal: ConfirmationModalComponent,
  };
}