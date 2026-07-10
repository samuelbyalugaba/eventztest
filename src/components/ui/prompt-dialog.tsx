import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  matchValue?: string;
  onConfirm: (value: string) => void | Promise<void>;
}

export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  matchValue,
  onConfirm,
}: PromptDialogProps) {
  const [value, setValue] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (!next) setValue('');
    onOpenChange(next);
  };

  const handleConfirm = () => {
    onConfirm(value);
    setValue('');
  };

  const isMatch = matchValue ? value === matchValue : value.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-6 pb-4">
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setValue('')}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isMatch}
            className={destructive ? 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50' : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
