import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { REPORT_REASONS } from '../utils/moderation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

interface ReportReasonContextValue {
  askReportReason: (label: string) => Promise<string | null>;
}

const ReportReasonContext = createContext<ReportReasonContextValue | null>(null);

export function ReportReasonProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    label: string;
    resolve: (value: string | null) => void;
  } | null>(null);

  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);

  const askReportReason = useCallback((label: string) => {
    return new Promise<string | null>(resolve => {
      setReason(REPORT_REASONS[0]);
      setState({ label, resolve });
    });
  }, []);

  const handleConfirm = () => {
    state?.resolve(reason);
    setState(null);
  };

  const handleCancel = () => {
    state?.resolve(null);
    setState(null);
  };

  return (
    <ReportReasonContext.Provider value={{ askReportReason }}>
      {children}
      <AlertDialog open={!!state} onOpenChange={open => { if (!open) handleCancel(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report {state?.label ?? ''}</AlertDialogTitle>
            <AlertDialogDescription>Why are you reporting {state?.label ?? ''}?</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-4">
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
            >
              {REPORT_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Submit Report</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ReportReasonContext.Provider>
  );
}

export function useReportReason(): ReportReasonContextValue {
  const ctx = useContext(ReportReasonContext);
  if (!ctx) throw new Error('useReportReason must be used within ReportReasonProvider');
  return ctx;
}
