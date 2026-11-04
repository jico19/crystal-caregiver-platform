import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, AlertCircle, FileText, UserCheck, Calendar, ShieldCheck } from 'lucide-react';
import useFetch from '../../../shared/hooks/useFetch';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import EmptyState from '../../../shared/components/common/EmptyState';
import LoadingState from '../../../shared/components/common/LoadingState';

export default function CaregiverClientCarePlanPage() {
  const { clientId } = useParams();
  const { data, loading, error } = useFetch(`/caregivers/me/clients/${clientId}/care-plan`, { enabled: !!clientId });

  if (loading) {
    return (
      <LoadingState
        title="Loading Client Care Plan..."
        subtitle="Retrieving physician directives and assigned care duties..."
        variant="page"
      />
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Unable to load care plan: {error}
          </AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" asChild className="gap-1.5 h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
          <Link to="/caregiver/clients">
            <ArrowLeft size={13} /> Back to My Clients
          </Link>
        </Button>
      </PageContainer>
    );
  }

  const carePlan = data;
  const client = data?.client;

  return (
    <PageContainer>
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 gap-1 -ml-2">
          <Link to="/caregiver/clients">
            <ArrowLeft size={12} /> Back to My Clients
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Care Plan: ${carePlan?.client_name || client?.first_name || 'Client'}`}
        subtitle="Read-only plan of care instructions and clinical directives"
        actions={
          carePlan?.plan_status ? (
            <StatusBadge status={carePlan.plan_status} label={carePlan.plan_status} />
          ) : null
        }
      />

      {!carePlan ? (
        <EmptyState
          title="No care plan filed"
          description="No care plan has been filed for this client yet."
        />
      ) : (
        <div className="space-y-6">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Plan Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5 flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-slate-400" /> Primary Nurse
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{carePlan.primary_nurse || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" /> Effective Date
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{carePlan.effective_date || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                Daily Activities & Duties
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!carePlan.daily_activities || carePlan.daily_activities.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 m-0">No scheduled activities listed.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-100 hover:bg-transparent">
                        <TableHead className="text-slate-500 text-xs font-semibold">Task</TableHead>
                        <TableHead className="text-slate-500 text-xs font-semibold">Frequency</TableHead>
                        <TableHead className="text-slate-500 text-xs font-semibold">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {carePlan.daily_activities.map((act, idx) => (
                        <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <TableCell className="font-semibold text-slate-900 text-xs">{act.task}</TableCell>
                          <TableCell className="text-slate-600 text-xs">{act.frequency || 'As scheduled'}</TableCell>
                          <TableCell className="text-slate-500 text-xs">{act.notes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {carePlan.emergency_protocol && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <AlertTitle className="text-xs font-semibold text-amber-950 uppercase tracking-wider mb-1">
                    Emergency Protocol
                  </AlertTitle>
                  <AlertDescription className="text-xs text-amber-900 leading-normal whitespace-pre-wrap">
                    {carePlan.emergency_protocol}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </div>
      )}
    </PageContainer>
  );
}
