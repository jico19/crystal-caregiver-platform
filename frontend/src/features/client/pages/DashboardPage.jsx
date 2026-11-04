import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  AlertTriangle,
  FileText,
  Calendar,
  ClipboardCheck,
  Download,
  Megaphone,
  Clock,
  ShieldCheck,
  CalendarCheck,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import LoadingState from '../../../shared/components/common/LoadingState';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import ClientWeeklyCareChart from '../components/ClientWeeklyCareChart';
import { admissionPacketUrl, STATE_PACKET_CODE } from '../../../shared/utils/packets';
import { summarizeAuthorizationHours, scheduleTime } from '../lib/careMetrics';

const CLIENT_STATUS_LABELS = {
  pending: 'Admission Under Review',
  approved: 'Admission Approved',
  active: 'Home Care Active',
  discharged: 'Discharged',
  rejected: 'Admission Needs Correction',
};

export default function DashboardPage() {
  const { token, user } = useAuth();

  const { data: profileRes, isLoading: profileLoading } = useFetch('/clients/me', { enabled: !!token });
  const { data: authRes, isLoading: authLoading } = useFetch('/clients/me/authorizations', { enabled: !!token, defaultData: [] });
  const { data: docStatusRes, isLoading: docStatusLoading } = useFetch('/clients/me/document-status', { enabled: !!token });
  const { data: schedRes, isLoading: schedLoading } = useFetch('/clients/me/schedule', { enabled: !!token });
  const { data: planRes, isLoading: planLoading } = useFetch('/clients/me/care-plan', { enabled: !!token });
  const { data: agreeRes, isLoading: agreeLoading } = useFetch('/clients/me/agreements', { enabled: !!token });
  const { data: _notifyRes, isLoading: notifyLoading } = useFetch('/clients/me/notifications', { enabled: !!token });
  const { data: annRes } = useFetch('/announcements', { enabled: !!token });

  const profile = profileRes?.profile || profileRes || null;
  const schedule = schedRes?.schedule || (Array.isArray(schedRes) ? schedRes : []);
  const carePlan = planRes?.care_plan || (planRes?.id ? planRes : null);
  const agreements = agreeRes?.agreements || (Array.isArray(agreeRes) ? agreeRes : []);
  const announcements = annRes?.announcements || (Array.isArray(annRes) ? annRes : []);

  const authorizations = useMemo(() => {
    return authRes?.authorizations || (Array.isArray(authRes) ? authRes : []);
  }, [authRes]);

  // Compute coverage hours
  const activeAuths = useMemo(() => {
    return authorizations.filter((a) => a.status === 'active' || a.status === 'expiring_soon');
  }, [authorizations]);

  const { totalRemainingHours, totalAuthorizedHours, totalUsedHours } = useMemo(
    () => summarizeAuthorizationHours(activeAuths), [activeAuths]
  );
  const visitApprovals = activeAuths.filter((authorization) => authorization.unit_type === 'visit');

  const overallPercent = totalAuthorizedHours > 0
    ? Math.min(100, Math.round((totalUsedHours / totalAuthorizedHours) * 100))
    : 0;

  if (profileLoading || authLoading || docStatusLoading || schedLoading || planLoading || agreeLoading || notifyLoading) {
    return (
      <LoadingState
        title="Loading Client Care Portal..."
        subtitle="Retrieving care schedule, authorizations, and active plan of care..."
        variant="page"
      />
    );
  }

  const isIntakeComplete = Boolean(profile?.first_name && profile?.last_name);
  const stateName = profile?.states?.name || (user?.state_id === 1 ? 'Florida' : user?.state_id === 2 ? 'Indiana' : 'Georgia');
  const stateCode = profile?.states?.code || profile?.state_code || STATE_PACKET_CODE[user?.state_id] || 'FL';

  const pendingAgreements = agreements.filter((a) => !(a.signed || a.signed_at));
  const missingDocs = docStatusRes?.missing || [];
  const nextVisit = schedule.find((item) => item.status !== 'cancelled') || null;

  return (
    <PageContainer size="wide">
      {/* Personalized Welcome Header */}
      <PageHeader
        title={isIntakeComplete ? `Care for ${profile.first_name} ${profile.last_name}` : 'Care Dashboard'}
        subtitle={`Managed In-Home Care · ${stateName} Office`}
        badge={
          <StatusBadge
            status={profile?.status || (isIntakeComplete ? 'approved' : 'pending')}
            label={CLIENT_STATUS_LABELS[profile?.status] || (isIntakeComplete ? 'Intake on File' : 'Intake Pending')}
          />
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50">
              <a
                href={admissionPacketUrl(stateCode)}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download size={13} />
                Admission Packet (PDF)
              </a>
            </Button>
            <StatusBadge status="neutral" label={user?.email} size="sm" />
          </div>
        }
      />

      {/* Action Center Banner: Outstanding Agreements or Missing Documents */}
      {(pendingAgreements.length > 0 || missingDocs.length > 0) && (
        <div className="space-y-3 mb-6">
          {pendingAgreements.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <AlertTitle className="text-xs font-semibold text-amber-950 mb-0.5">
                    Action Required: {pendingAgreements.length} Unsigned Care Agreement(s)
                  </AlertTitle>
                  <AlertDescription className="text-xs text-amber-800">
                    Please sign pending forms ({pendingAgreements.map((a) => a.title).join(', ')}) to authorize home care visits.
                  </AlertDescription>
                </div>
              </div>
              <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs shrink-0">
                <Link to="/client/forms" className="inline-flex items-center gap-1.5">
                  Sign Agreements Now <ArrowRight size={13} />
                </Link>
              </Button>
            </Alert>
          )}

          {missingDocs.length > 0 && (
            <Alert className="border-rose-200 bg-rose-50 text-rose-950 flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <AlertTitle className="text-xs font-semibold text-rose-950 mb-0.5">
                    Admission Notice: {missingDocs.length} Document(s) Needed
                  </AlertTitle>
                  <AlertDescription className="text-xs text-rose-900">
                    Upload required documents ({missingDocs.map((m) => m.name).join(', ')}) to verify state Medicaid eligibility.
                  </AlertDescription>
                </div>
              </div>
              <Button size="sm" asChild className="bg-rose-600 hover:bg-rose-700 text-white h-8 text-xs shrink-0">
                <Link to="/client/documents" className="inline-flex items-center gap-1.5">
                  Upload Documents <Upload size={13} />
                </Link>
              </Button>
            </Alert>
          )}
        </div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50/40">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Megaphone size={15} className="text-emerald-700" />
              Agency Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2.5">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-3 bg-white rounded-lg border border-emerald-100 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">{ann.title}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(ann.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 m-0 leading-relaxed">{ann.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Top 2 Primary Care Cards: Next Scheduled Visit + Active Plan of Care */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Card 1: Next Caregiver Visit */}
        <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-emerald-600" />
              Scheduled Caregiver Visit
            </CardTitle>
            <Link to="/client/schedule" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1">
              Full Schedule <ArrowRight size={11} />
            </Link>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between">
            {nextVisit ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block">Scheduled Day</span>
                    <strong className="text-base text-slate-900">{nextVisit.day_of_week}</strong>
                  </div>
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold">
                    {scheduleTime(nextVisit)}
                  </Badge>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-800 block mb-0.5">
                    {nextVisit.service || 'Personal Care & Assistance'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Assigned coordinator branch: {nextVisit.branch || stateName} Office
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <strong className="text-xs font-semibold text-slate-700 block">
                  Visits Being Coordinated
                </strong>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your coordinator is assigning a caregiver to your schedule. Check back shortly for shift updates.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Need to reschedule? Call your coordinator.</span>
              <Link to="/client/schedule" className="font-semibold text-emerald-700 hover:underline">
                View All ({schedule.length}) →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Active Plan of Care */}
        <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" />
              Active Plan of Care
            </CardTitle>
            <Link to="/client/care-plan" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1">
              Full Plan <ArrowRight size={11} />
            </Link>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between">
            {carePlan ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block">Supervising Nurse</span>
                    <strong className="text-sm text-slate-900">{carePlan.primary_nurse || 'Assigned Nurse RN'}</strong>
                  </div>
                  <span className="text-xs text-slate-500">
                    Effective: {carePlan.effective_date || 'Active'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700 block mb-1">
                    Daily Assistance Tasks ({carePlan.daily_activities?.length || 0}):
                  </span>
                  {carePlan.daily_activities && carePlan.daily_activities.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                      {carePlan.daily_activities.slice(0, 3).map((act, idx) => (
                        <li key={idx}>
                          <strong>{act.task}</strong> {act.frequency ? `(${act.frequency})` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-slate-400">Nurse assessment pending.</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <ClipboardCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <strong className="text-xs font-semibold text-slate-700 block">
                  Plan of Care Pending Assessment
                </strong>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your supervising nurse will outline your daily assistance routine following initial intake.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Emergency directives on file.</span>
              <Link to="/client/care-plan" className="font-semibold text-emerald-700 hover:underline">
                Review Directives →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Care Coverage & Schedule Utilization */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Care Allowance & Coverage
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Hours allowance summary */}
          <Card className="bg-white border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-sm text-slate-900">Approved Care Allowance</span>
                </div>
                <StatusBadge
                  status={activeAuths.length > 0 ? 'active' : 'pending'}
                  label={visitApprovals.length > 0 && totalAuthorizedHours === 0 ? 'Visit Coverage on File' : totalRemainingHours > 0 ? `${totalRemainingHours.toFixed(1)} hrs left` : 'No Hours Remaining'}
                  size="xs"
                />
              </div>

              {visitApprovals.length > 0 && <p className="text-xs text-slate-500 mb-3">Visit approvals are shown in coverage details and are not counted as hours.</p>}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block">Total Authorized</span>
                  <strong className="text-lg font-bold text-slate-900">{totalAuthorizedHours.toFixed(1)}h</strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block">Hours Used</span>
                  <strong className="text-lg font-bold text-slate-700">{totalUsedHours.toFixed(1)}h</strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block">Balance Remaining</span>
                  <strong className={`text-lg font-bold ${totalRemainingHours < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {totalRemainingHours.toFixed(1)}h
                  </strong>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Care Utilization</span>
                  <span>{overallPercent}% used</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{ width: `${overallPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-500">Authorized by State Medicaid Waiver</span>
              <Link to="/client/authorizations" className="text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1">
                View Coverage Details <ArrowRight size={11} />
              </Link>
            </div>
          </Card>

          {/* Card: Weekly care coverage chart */}
          <ClientWeeklyCareChart schedule={schedule} />
        </div>
      </div>

      {/* Quick Nav Cards */}
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Quick Portal Links
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Link to="/client/schedule" className="block group">
          <Card className="bg-white border-slate-200 shadow-sm p-4 hover:border-emerald-500 hover:shadow transition-all h-full flex flex-col justify-between">
            <div>
              <Calendar className="h-5 w-5 text-emerald-600 mb-2" />
              <strong className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 flex items-center justify-between">
                Care Schedule
                <ArrowRight size={13} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </strong>
              <span className="text-xs text-slate-500 mt-1 block">Confirmed weekly visits and caregiver shift times</span>
            </div>
          </Card>
        </Link>

        <Link to="/client/care-plan" className="block group">
          <Card className="bg-white border-slate-200 shadow-sm p-4 hover:border-emerald-500 hover:shadow transition-all h-full flex flex-col justify-between">
            <div>
              <ClipboardCheck className="h-5 w-5 text-emerald-600 mb-2" />
              <strong className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 flex items-center justify-between">
                Care Plan
                <ArrowRight size={13} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </strong>
              <span className="text-xs text-slate-500 mt-1 block">Nurse directives and authorized daily living activities</span>
            </div>
          </Card>
        </Link>

        <Link to="/client/forms" className="block group">
          <Card className="bg-white border-slate-200 shadow-sm p-4 hover:border-emerald-500 hover:shadow transition-all h-full flex flex-col justify-between">
            <div>
              <FileText className="h-5 w-5 text-emerald-600 mb-2" />
              <strong className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 flex items-center justify-between">
                Agreements
                <ArrowRight size={13} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </strong>
              <span className="text-xs text-slate-500 mt-1 block">Signed legal consents and statutory notices</span>
            </div>
          </Card>
        </Link>

        <Link to="/client/documents" className="block group">
          <Card className="bg-white border-slate-200 shadow-sm p-4 hover:border-emerald-500 hover:shadow transition-all h-full flex flex-col justify-between">
            <div>
              <Upload className="h-5 w-5 text-emerald-600 mb-2" />
              <strong className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 flex items-center justify-between">
                Uploads & Records
                <ArrowRight size={13} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </strong>
              <span className="text-xs text-slate-500 mt-1 block">Medicaid ID cards, insurance files, and doctor orders</span>
            </div>
          </Card>
        </Link>
      </div>
    </PageContainer>
  );
}
