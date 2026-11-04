import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, FileText, GraduationCap, Bell, User, Download } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import { STATUS_META, milestoneMeta } from '../../../shared/utils/caregiverStatus';
import { packetUrl, STATE_PACKET_CODE } from '../../../shared/utils/packets';
import { stateOfficeTitleFor } from '../../../shared/lib/roles';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import LoadingState from '../../../shared/components/common/LoadingState';
import CaregiverHoursChart from '../components/CaregiverHoursChart';
import CaregiverTrainingProgressChart from '../components/CaregiverTrainingProgressChart';

export default function DashboardPage() {
  const { token, user } = useAuth();

  const { data: profileRes, isLoading: profileLoading } = useFetch('/caregivers/me', { enabled: !!token });
  const { data: appRes, isLoading: appLoading } = useFetch('/caregivers/me/application', { enabled: !!token });
  const { data: docRes, isLoading: docsLoading } = useFetch('/documents/me', { enabled: !!token });
  const { data: credStatusRaw, isLoading: credLoading } = useFetch('/caregivers/me/credential-status', { enabled: !!token });
  const { data: annRes, isLoading: annLoading } = useFetch('/announcements', { enabled: !!token });
  const { data: trainingRes, isLoading: trainingLoading } = useFetch('/training/my-enrollments', { enabled: !!token });

  const profile = profileRes || null;
  const application = appRes || null;
  const documents = docRes?.documents || [];
  const announcements = annRes?.announcements || (Array.isArray(annRes) ? annRes : []);
  const enrollmentList = trainingRes?.enrollments || trainingRes?.results || (Array.isArray(trainingRes) ? trainingRes : []);
  const courses = enrollmentList.map((enr) => ({
    id: enr.id,
    name: enr.course_name || enr.training_courses?.name,
    enrollment_status: enr.status,
  }));
  const completedTrainingCount = courses.filter((c) => c.enrollment_status === 'completed').length;

  const credentialStatus = credStatusRaw
    ? {
        summary: {
          expired: credStatusRaw.expired?.length || 0,
          expiring_soon: credStatusRaw.expiring_soon?.length || 0,
          missing: credStatusRaw.missing_requirements?.length || 0,
          compliant: credStatusRaw.compliant || false,
        },
        expired: (credStatusRaw.expired || []).map((name) => ({ name })),
        expiring_soon: (credStatusRaw.expiring_soon || []).map((name) => ({ name })),
        missing: (credStatusRaw.missing_requirements || []).map((name) => ({ name })),
      }
    : null;

  const loading = profileLoading || appLoading || docsLoading || credLoading || annLoading || trainingLoading;

  if (loading) {
    return (
      <LoadingState
        title="Loading Caregiver Dashboard..."
        subtitle="Retrieving onboarding progress, compliance credentials, and training..."
        variant="page"
      />
    );
  }

  const officeName = stateOfficeTitleFor(profile || user);
  const appStatus = application?.status || null;
  const milestone = milestoneMeta(appStatus);

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome back, ${profile?.first_name || user?.email?.split('@')[0]}`}
        subtitle={`Caregiver Onboarding and Compliance Portal · ${officeName}`}
        actions={
          <Badge variant="outline" className="text-slate-700 border-slate-200 capitalize text-xs">
            Account: {user?.status || 'active'}
          </Badge>
        }
      />

      {/* Primary Next Action Banner */}
      <Card className="mb-6 border-emerald-200 bg-emerald-50/30 shadow-sm">
        <CardContent className="p-5">
          <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
            <h2 className="font-semibold text-base text-slate-900 m-0">
              {milestone.title}
            </h2>
            <StatusBadge
              status={appStatus || 'not_started'}
              label={appStatus ? (STATUS_META[appStatus]?.label || appStatus) : 'Not Started'}
            />
          </div>
          <p className="text-slate-600 text-sm leading-normal mb-4">
            {milestone.message}
          </p>
          <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs">
            <Link to={milestone.nextAction.to}>
              {milestone.nextAction.label}
              <ArrowRight size={13} />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Onboarding Progress */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Onboarding Progress
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Application */}
          <Card className="bg-white border-slate-200 shadow-sm p-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                  Step 1: Application
                </span>
                <StatusBadge
                  status={appStatus || 'not_started'}
                  label={appStatus ? (STATUS_META[appStatus]?.label || appStatus) : 'Not Started'}
                  size="xs"
                />
              </div>
              <p className="text-slate-600 text-xs mb-3 leading-normal">
                {appStatus ? 'Application details are on file.' : 'Complete candidate details and electronic signature.'}
              </p>
            </div>
            <Link
              to="/caregiver/application"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1 mt-auto"
            >
              {appStatus ? 'View Application' : 'Start Application'} <ArrowRight size={11} />
            </Link>
          </Card>

          {/* Step 2: Credentials */}
          <Card className="bg-white border-slate-200 shadow-sm p-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Step 2: Credentials
                </span>
                <Badge variant="outline" className="text-slate-700 border-slate-200 text-[11px] font-normal">
                  {documents.length} Uploaded
                </Badge>
              </div>
              <p className="text-slate-600 text-xs mb-3 leading-normal">
                Upload required CPR, CNA/HHA certificates, and state background check records.
              </p>
            </div>
            <Link
              to="/caregiver/documents"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1 mt-auto"
            >
              Upload Documents <ArrowRight size={11} />
            </Link>
          </Card>

          {/* Step 3: Training */}
          <Card className="bg-white border-slate-200 shadow-sm p-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />
                  Step 3: Training
                </span>
                <Badge variant="outline" className="text-slate-700 border-slate-200 text-[11px] font-normal">
                  {completedTrainingCount} / {courses.length} Completed
                </Badge>
              </div>
              <p className="text-slate-600 text-xs mb-3 leading-normal">
                Complete assigned courses on HIPAA, infection control, and client safety.
              </p>
            </div>
            <Link
              to="/caregiver/training"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1 mt-auto"
            >
              Go to Training <ArrowRight size={11} />
            </Link>
          </Card>
        </div>
      </div>

      {/* Care Delivery & Training Analytics */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Care Delivery & Training Analytics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CaregiverHoursChart />
          <CaregiverTrainingProgressChart courses={courses} />
        </div>
      </div>

      {/* Credential Health Panels */}
      {credentialStatus && (
        <Card className="bg-white border-slate-200 shadow-sm mb-6">
          <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Credential Health
            </CardTitle>
            <Link
              to="/caregiver/documents"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1"
            >
              Manage Credentials <ArrowRight size={11} />
            </Link>
          </CardHeader>

          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-md border ${credentialStatus.summary?.expired ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-xs text-slate-500 font-medium mb-1">Expired</div>
                <div className={`text-2xl font-bold ${credentialStatus.summary?.expired ? 'text-rose-600' : 'text-slate-900'}`}>
                  {credentialStatus.summary?.expired || 0}
                </div>
                {credentialStatus.expired?.length > 0 && (
                  <div className="text-xs text-slate-600 mt-1">
                    {credentialStatus.expired.map((d) => d.name).join(', ')}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-md border bg-slate-50 border-slate-200">
                <div className="text-xs text-slate-500 font-medium mb-1">Expiring within 30 days</div>
                <div className="text-2xl font-bold text-amber-600">{credentialStatus.summary?.expiring_soon || 0}</div>
                {credentialStatus.expiring_soon?.length > 0 && (
                  <div className="text-xs text-slate-600 mt-1">
                    {credentialStatus.expiring_soon.map((d) => d.name).join(', ')}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-md border bg-slate-50 border-slate-200">
                <div className="text-xs text-slate-500 font-medium mb-1">Missing documents</div>
                <div className={`text-2xl font-bold ${credentialStatus.summary?.missing > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {credentialStatus.summary?.missing || 0}
                </div>
                {credentialStatus.missing?.length > 0 && (
                  <div className="text-xs text-slate-600 mt-1">
                    {credentialStatus.missing.slice(0, 4).map((m) => m.name).join(', ')}
                    {credentialStatus.missing.length > 4 ? '…' : ''}
                  </div>
                )}
              </div>
            </div>

            {credentialStatus.summary?.compliant && (
              <p className="text-xs text-emerald-700 font-medium mt-3 mb-0 inline-flex items-center gap-1.5">
                <CheckCircle2 size={13} /> All required credentials for your state are on file and current.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <Card className="bg-white border-slate-200 shadow-sm mb-6">
          <CardHeader className="p-4 pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-600" />
              Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-3.5 rounded-md border border-slate-200 bg-slate-50/50">
                <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-slate-900 m-0">{ann.title}</h3>
                  <span className="text-xs text-slate-400">
                    {new Date(ann.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-600 text-xs leading-normal m-0">
                  {ann.body}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/caregiver/profile" className="block group">
          <Card className="bg-white border-slate-200 shadow-sm p-4 hover:border-emerald-500 hover:shadow transition-all flex flex-col justify-between h-full">
            <div>
              <h3 className="font-semibold text-xs text-slate-900 group-hover:text-emerald-700 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-emerald-600" />
                  Manage Profile
                </span>
                <ArrowRight size={12} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </h3>
              <p className="text-slate-600 text-xs leading-normal m-0">
                Update your contact telephone, home address, and personal details.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 underline mt-3 block">
              Edit Profile
            </span>
          </Card>
        </Link>

        <Link to="/caregiver/notifications" className="block group">
          <Card className="bg-white border-slate-200 shadow-sm p-4 hover:border-emerald-500 hover:shadow transition-all flex flex-col justify-between h-full">
            <div>
              <h3 className="font-semibold text-xs text-slate-900 group-hover:text-emerald-700 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-emerald-600" />
                  In-App Notifications
                </span>
                <ArrowRight size={12} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </h3>
              <p className="text-slate-600 text-xs leading-normal m-0">
                View system alerts, approval notices, credential reminders, and training updates.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 underline mt-3 block">
              Check Notifications
            </span>
          </Card>
        </Link>

        <a
          href={packetUrl(profile?.state_code || STATE_PACKET_CODE[user?.state_id])}
          target="_blank"
          rel="noreferrer"
          className="block group"
        >
          <Card className="bg-white border-slate-200 shadow-sm p-4 hover:border-emerald-500 hover:shadow transition-all flex flex-col justify-between h-full">
            <div>
              <h3 className="font-semibold text-xs text-slate-900 group-hover:text-emerald-700 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  Employment Packet
                </span>
                <ArrowRight size={12} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </h3>
              <p className="text-slate-600 text-xs leading-normal m-0">
                Download printable new-hire packet with offer letter, W-4, direct deposit, and handbook.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 underline mt-3 block">
              Get Employment Packet (PDF)
            </span>
          </Card>
        </a>
      </div>
    </PageContainer>
  );
}
