import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  FileText,
  UserCheck,
  Calendar,
  ShieldCheck,
  Phone,
  Heart,
  CheckCircle2,
  Clock,
  ArrowRight,
  PhoneCall,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import EmptyState from '../../../shared/components/common/EmptyState';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import LoadingState from '../../../shared/components/common/LoadingState';

function categorizeTask(taskName = '') {
  const lower = taskName.toLowerCase();
  if (lower.includes('bath') || lower.includes('dress') || lower.includes('groom') || lower.includes('hygiene') || lower.includes('toileting')) {
    return 'Personal Care & Hygiene';
  }
  if (lower.includes('meal') || lower.includes('cook') || lower.includes('eat') || lower.includes('diet') || lower.includes('fluid') || lower.includes('hydrat')) {
    return 'Nutrition & Meals';
  }
  if (lower.includes('med') || lower.includes('pill') || lower.includes('vital') || lower.includes('blood') || lower.includes('sugar')) {
    return 'Medication & Health Monitoring';
  }
  if (lower.includes('walk') || lower.includes('transfer') || lower.includes('mobil') || lower.includes('fall') || lower.includes('exercise')) {
    return 'Mobility & Safety';
  }
  return 'Daily Support & Routine';
}

export default function CarePlanPage() {
  const { token, user } = useAuth();
  const { data, isLoading: loading, error: errorMsg } = useFetch('/clients/me/care-plan', {
    enabled: !!token,
    defaultData: { care_plan: null },
  });
  const carePlan = data?.care_plan !== undefined ? data.care_plan : (data?.id ? data : null);

  const activities = useMemo(() => {
    return carePlan?.daily_activities || carePlan?.activities || [];
  }, [carePlan]);

  // Group activities
  const groupedActivities = useMemo(() => {
    const groups = {};
    activities.forEach((act) => {
      const cat = act.category || categorizeTask(act.task);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(act);
    });
    return groups;
  }, [activities]);

  if (loading) {
    return (
      <LoadingState
        title="Loading Personalized Care Plan..."
        subtitle="Retrieving physician directives and daily caregiver routines..."
        variant="page"
      />
    );
  }

  return (
    <PageContainer size="narrow">
      <PageHeader
        title="Personalized Care Plan"
        subtitle="Daily assistance routines, nurse directives, and safety protocols followed by your assigned caregivers."
        badge={carePlan ? <StatusBadge status={carePlan.plan_status || carePlan.status} /> : null}
      />

      {errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {!carePlan && !errorMsg && (
        <EmptyState
          title="Care Plan Being Formulated"
          description="Your supervising registered nurse is finalizing your personalized plan of care based on your initial clinical assessment. Once approved, your daily care routines and safety protocols will appear here."
          action={
            <Button variant="outline" size="sm" asChild className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1">
              <Link to="/client/schedule">
                View Visit Schedule <ArrowRight size={12} />
              </Link>
            </Button>
          }
        />
      )}

      {carePlan && (
        <div className="space-y-6">
          {/* Emergency & Crisis Protocol - Calm, Actionable Safety Card */}
          {carePlan.emergency_protocol && (
            <Card className="border-red-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-red-50/70 border-b border-red-100 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-950 font-semibold text-xs">
                  <PhoneCall className="h-4 w-4 text-red-600" />
                  <span>Emergency & Safety Response Protocol</span>
                </div>
                <span className="text-[11px] text-red-700 bg-red-100 px-2 py-0.5 rounded font-medium">
                  Immediate 24/7 Guide
                </span>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: 911 for Life Threatening */}
                  <div className="p-3 rounded-lg border border-red-100 bg-red-50/40 flex items-center justify-between gap-3">
                    <div>
                      <strong className="text-xs text-red-950 block">Life-Threatening Emergency</strong>
                      <span className="text-[11px] text-red-800 leading-tight block mt-0.5">
                        Severe crisis, shortness of breath, or trauma
                      </span>
                    </div>
                    <Button size="sm" asChild className="bg-red-600 hover:bg-red-700 text-white font-bold h-8 px-3 text-xs shrink-0">
                      <a href="tel:911">Call 911</a>
                    </Button>
                  </div>

                  {/* Option 2: Agency Clinical Supervisor */}
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                    <div>
                      <strong className="text-xs text-slate-900 block">Nurse Supervisor Hotline</strong>
                      <span className="text-[11px] text-slate-600 leading-tight block mt-0.5">
                        Urgent care plan updates or provider notice
                      </span>
                    </div>
                    <Button variant="outline" size="sm" asChild className="border-slate-300 text-slate-800 hover:bg-white h-8 px-3 text-xs shrink-0 font-medium">
                      <a href="tel:5559002273">Call Agency</a>
                    </Button>
                  </div>
                </div>

                {/* Specific Care Directives on file */}
                <div className="text-xs text-slate-700 bg-slate-50/80 p-2.5 rounded border border-slate-200 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 mr-1.5">Direct Clinical Directive:</strong>
                    <span>{carePlan.emergency_protocol}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Supervisor & Plan Metadata Card */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Clinical Supervision & Care Team
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Care overseen by our licensed registered nursing staff.
                </CardDescription>
              </div>
              <StatusBadge status={carePlan.plan_status || 'active'} size="xs" />
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block mb-1 flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-slate-400" /> Care Recipient
                  </span>
                  <strong className="text-slate-900 text-sm block">
                    {carePlan.client_name || user?.name || 'Care Recipient'}
                  </strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block mb-1 flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 text-emerald-600" /> Supervising Nurse (RN)
                  </span>
                  <strong className="text-slate-900 text-sm block">
                    {carePlan.primary_nurse || 'Assigned Nurse Supervisor'}
                  </strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block mb-1 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" /> Effective Date
                  </span>
                  <strong className="text-slate-900 text-sm block">
                    {carePlan.effective_date || 'Active Current Period'}
                  </strong>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categorized Daily Care Routines */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Authorized Daily Living Activities ({activities.length} tasks)
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Caregivers are trained and authorized to perform these specific assistance tasks during each scheduled visit.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              {Object.keys(groupedActivities).length === 0 ? (
                <p className="text-xs text-slate-500 m-0 py-2">
                  No specific daily tasks assigned yet. Your nurse will specify activities after initial assessment.
                </p>
              ) : (
                Object.entries(groupedActivities).map(([category, tasks]) => (
                  <div key={category} className="space-y-2.5">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      {category} ({tasks.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {tasks.map((task, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-slate-50/70 border border-slate-200 flex items-start justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                              <strong className="text-xs text-slate-900">{task.task}</strong>
                            </div>
                            {task.notes && (
                              <p className="text-xs text-slate-600 pl-5 m-0 leading-normal">
                                Directive: {task.notes}
                              </p>
                            )}
                          </div>
                          {task.frequency && (
                            <Badge
                              variant="outline"
                              className="text-[11px] font-medium border-emerald-200 bg-emerald-50 text-emerald-800 shrink-0"
                            >
                              <Clock size={10} className="mr-1" />
                              {task.frequency}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Supervisor Callout */}
          <div className="p-4 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Phone size={16} />
              </div>
              <div>
                <strong className="text-xs text-slate-900 block">Need to Adjust Daily Care Directives?</strong>
                <span className="text-xs text-slate-500">Contact your care coordinator or registered nurse supervisor to update this plan.</span>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5">
              <Link to="/client/schedule">
                View Visit Schedule <ArrowRight size={12} />
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
        <Link to="/client/schedule" className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1">
          Next: Care Schedule <ArrowRight size={11} />
        </Link>
      </div>
    </PageContainer>
  );
}
