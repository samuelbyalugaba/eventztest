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
import { REPORT_REASONS } from '../../utils/moderation';

interface ReportReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  onConfirm: (reason: string) => void;
}

export function ReportReasonModal({ open, onOpenChange, label, onConfirm }: ReportReasonModalProps) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);

  const handleOpenChange = (next: boolean) => {
    if (!next) onConfirm('');
    onOpenChange(next);
  };

  const handleConfirm = () => {
    onConfirm(reason);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report {label}</AlertDialogTitle>
          <AlertDialogDescription>Why are you reporting {label}?</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-6 pb-4">
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
          >
            {REPORT_REASONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onConfirm('')}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Submit Report</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
