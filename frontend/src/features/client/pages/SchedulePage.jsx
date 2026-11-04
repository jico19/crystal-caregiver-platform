import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  MapPin,
  AlertCircle,
  Phone,
  ArrowRight,
  CalendarCheck,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import EmptyState from '../../../shared/components/common/EmptyState';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import LoadingState from '../../../shared/components/common/LoadingState';

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SchedulePage() {
  const { token } = useAuth();
  const { data, isLoading: loading, error: errorMsg } = useFetch('/clients/me/schedule', {
    enabled: !!token,
    defaultData: { schedule: [] },
  });

  // Sort schedule by day of week
  const sortedSchedule = useMemo(() => {
    const list = data?.schedule || (Array.isArray(data) ? data : []);
    return [...list].sort((a, b) => {
      const idxA = DAYS_ORDER.findIndex((d) => (a.day || '').toLowerCase().startsWith(d.toLowerCase().slice(0, 3)));
      const idxB = DAYS_ORDER.findIndex((d) => (b.day || '').toLowerCase().startsWith(d.toLowerCase().slice(0, 3)));
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });
  }, [data]);

  // Approximate total hours
  const totalWeeklyHours = useMemo(() => {
    return sortedSchedule.reduce((acc, curr) => acc + (Number(curr.hours) || 4), 0);
  }, [sortedSchedule]);

  if (loading) {
    return (
      <LoadingState
        title="Loading Care Schedule..."
        subtitle="Retrieving confirmed caregiver shifts and visit hours..."
        variant="page"
      />
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Care Visit Schedule"
        subtitle="Weekly in-home appointments confirmed by your agency care coordinator."
        badge={
          sortedSchedule.length > 0 ? (
            <StatusBadge status="active" label={`${sortedSchedule.length} Weekly Visits Confirmed`} />
          ) : null
        }
      />

      {errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {sortedSchedule.length === 0 && !errorMsg ? (
        <EmptyState
          title="No Caregiver Visits Scheduled Yet"
          description="Your care coordinator is currently matching a qualified caregiver to your personalized schedule. Once weekly shift appointments are confirmed, your schedule will appear here."
          action={
            <Button variant="outline" size="sm" asChild className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1">
              <Link to="/client/care-plan">
                Review Care Plan <ArrowRight size={12} />
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Weekly Highlights Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-emerald-50/50 border-emerald-200 shadow-sm p-4">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
                Weekly Appointments
              </span>
              <div className="text-2xl font-bold text-emerald-900">
                {sortedSchedule.length} <span className="text-sm font-normal text-emerald-700">visits / week</span>
              </div>
              <span className="text-xs text-emerald-800/80 mt-1 block">
                Recurring weekly home care coverage
              </span>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Estimated Weekly Hours
              </span>
              <div className="text-2xl font-bold text-slate-900">
                {totalWeeklyHours} <span className="text-sm font-normal text-slate-600">Hours</span>
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Authorized under your active care allowance
              </span>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Assigned Agency Office
              </span>
              <div className="text-lg font-bold text-slate-900 truncate">
                {sortedSchedule[0]?.branch ? `${sortedSchedule[0].branch} Branch` : 'Regional Operations'}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Direct coordinator dispatch
              </span>
            </Card>
          </div>

          {/* Visits Grid */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Weekly Shift Schedule
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sortedSchedule.map((item, idx) => (
                <Card
                  key={idx}
                  className="bg-white border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 hover:shadow transition-all"
                >
                  <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <CalendarCheck className="h-4 w-4 text-emerald-600" />
                      {item.day}
                    </CardTitle>
                    <StatusBadge status={item.status || 'confirmed'} size="xs" />
                  </CardHeader>

                  <CardContent className="p-4 flex flex-col flex-1">
                    <div className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                      {item.time || 'Morning Shift'}
                    </div>

                    <div className="mb-4">
                      <span className="text-xs font-semibold text-slate-800 block mb-0.5">
                        {item.service || 'Personal Care & Assistance'}
                      </span>
                      <span className="text-xs text-slate-500 leading-normal">
                        Assistance with daily living activities (ADLs) and personalized care directives.
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 pt-3 border-t border-slate-100 mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{item.branch || 'Local'} Branch</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 font-normal">
                        In-Home
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Reschedule / Assistance Box */}
          <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-200 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                <Phone size={16} />
              </div>
              <div>
                <strong className="text-xs text-slate-900 block font-semibold">
                  Need to Reschedule a Visit or Request Time Off?
                </strong>
                <p className="text-xs text-slate-600 m-0 mt-0.5 leading-relaxed">
                  Please notify your agency care coordinator at least 24 hours in advance so we can adjust staffing and notify your assigned caregiver.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 font-medium">
              <Link to="/client/care-plan">
                Review Care Plan Directives
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Navigation footer */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
        <Link to="/client/dashboard" className="text-slate-600 hover:text-slate-900">
          ← Back to Dashboard
        </Link>
        <Link to="/client/care-plan" className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1">
          Next: Care Plan <ArrowRight size={11} />
        </Link>
      </div>
    </PageContainer>
  );
}
