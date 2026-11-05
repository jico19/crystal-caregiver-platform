import { Clock, Phone, UserCheck, XCircle } from 'lucide-react';

export const STATUS_CONFIG = {
  new: {
    label: 'New Lead',
    border: 'border-amber-200 hover:border-amber-400',
    headerBg: 'bg-amber-500/10 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    icon: Clock,
  },
  contacted: {
    label: 'In Evaluation',
    border: 'border-sky-200 hover:border-sky-400',
    headerBg: 'bg-sky-500/10 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
    icon: Phone,
  },
  converted: {
    label: 'Converted to Client',
    border: 'border-emerald-200 hover:border-emerald-400',
    headerBg: 'bg-emerald-500/10 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
    icon: UserCheck,
  },
  closed: {
    label: 'Closed / Archived',
    border: 'border-slate-200 hover:border-slate-300',
    headerBg: 'bg-slate-500/10 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    icon: XCircle,
  },
};

export const STATE_BADGE_STYLES = {
  FL: 'bg-amber-50 text-amber-900 border-amber-200',
  IN: 'bg-sky-50 text-sky-900 border-sky-200',
  GA: 'bg-emerald-50 text-emerald-900 border-emerald-200',
};

