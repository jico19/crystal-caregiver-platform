import AuthorizationUpload from './AuthorizationUpload';
import { authorizationColumns } from './authorizationColumns';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  X,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import useFetch from '@/shared/hooks/useFetch';
import { downloadDocument } from '@/shared/utils/documentUtils';
import PageContainer from '@/shared/components/common/PageContainer';
import PageHeader from '@/shared/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import DataTable from '@/shared/components/common/DataTable';
import EmptyState from '@/shared/components/common/EmptyState';
import Toast from '@/shared/components/common/Toast';
import LoadingState from '@/shared/components/common/LoadingState';
import { summarizeAuthorizationHours } from '@/features/client/lib/careMetrics';

export default function AuthorizationsPage() {
  const { user } = useAuth();
  return <AuthorizationsSession key={`${user?.id ?? 'anon'}:${user?.state_id ?? ''}:${user?.role ?? ''}`} />;
}

function AuthorizationsSession() {
  const { token } = useAuth();
  const { data, isLoading: loading, error: fetchError, refetch } = useFetch('/clients/me/authorizations', {
    enabled: !!token,
    defaultData: { authorizations: [] },
  });
  const authorizations = useMemo(() => data?.authorizations || (Array.isArray(data) ? data : []), [data]);
  const { data: documentTypes } = useFetch('/documents/types', { enabled: !!token, defaultData: [] });
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const [showUpload, setShowUpload] = useState(false);

  // Active care allowances
  const activeAuths = useMemo(() => {
    return authorizations.filter((a) => a.status === 'active' || a.status === 'expiring_soon');
  }, [authorizations]);

  const { totalRemainingHours, totalAuthorizedHours, totalUsedHours } = useMemo(
    () => summarizeAuthorizationHours(activeAuths), [activeAuths]
  );

  const overallPercent = totalAuthorizedHours > 0
    ? Math.min(100, Math.round((totalUsedHours / totalAuthorizedHours) * 100))
    : 0;

  function openDocument(documentId) {
    if (!documentId) return;
    downloadDocument(documentId, token);
  }

  if (loading) {
    return (
      <LoadingState
        title="Loading Care Coverage..."
        subtitle="Retrieving Medicaid authorization approvals and covered hours..."
        variant="page"
      />
    );
  }

  const columns = authorizationColumns(openDocument);

  return (
    <PageContainer>
      <PageHeader
        title="Care Coverage & Approved Hours"
        subtitle="Track Medicaid waiver allowances, authorized care hours, and covered service plans."
        actions={
          <Button
            type="button"
            size="sm"
            onClick={() => setShowUpload(!showUpload)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5"
          >
            {showUpload ? <><X size={13} /> Close Upload</> : <><Plus size={13} /> Upload Approval Letter</>}
          </Button>
        }
      />

      {(errorMsg || fetchError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg || fetchError}</AlertDescription>
        </Alert>
      )}

      <Toast message={toastMsg} type="success" onClose={() => setToastMsg('')} />

      {/* Reassuring Educational Banner */}
      <div className="mb-6 p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-start gap-3">
        <Info className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
        <div className="text-xs text-emerald-950 leading-relaxed">
          <strong className="block mb-0.5 font-semibold text-emerald-900">How Care Authorizations Work:</strong>
          An authorization records the services approved by Medicaid or your insurance provider. Upload your approval letter for agency review. Contact your care coordinator with questions about coverage or renewal.
        </div>
      </div>

      {/* Summary Highlight Metrics */}
      {activeAuths.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className={`border shadow-sm ${totalRemainingHours < 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-emerald-50/40 border-emerald-200'}`}>
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Remaining Covered Hours
              </div>
              <div className={`text-2xl font-bold ${totalRemainingHours < 0 ? 'text-rose-600' : 'text-emerald-700'} mt-1`}>
                {totalRemainingHours.toFixed(1)} <span className="text-sm font-normal text-slate-600">Hours</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Hour totals exclude approvals measured per visit
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                Total Authorized Hours
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {totalAuthorizedHours.toFixed(1)} <span className="text-sm font-normal text-slate-600">Hours</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Across {activeAuths.length} active service approval{activeAuths.length > 1 ? 's' : ''}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                Hours Delivered
              </div>
              <div className="text-2xl font-bold text-slate-700 mt-1">
                {totalUsedHours.toFixed(1)} <span className="text-sm font-normal text-slate-600">Hours</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {overallPercent}% care service utilization
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showUpload && <AuthorizationUpload token={token} documentTypes={documentTypes}
        onError={setErrorMsg} onBegin={() => setToastMsg('')} onCancel={() => setShowUpload(false)}
        onSaved={async () => {
          setToastMsg('Authorization letter received and submitted for administrative review.');
          setShowUpload(false);
          await refetch();
        }} />}

      {/* Main Authorizations Table */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Service Approvals on File ({authorizations.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {authorizations.length === 0 ? (
            <EmptyState
              title="No Service Approvals on File"
              description="Approvals are issued once your Medicaid enrollment and physician care plan are finalized by your agency coordinator."
              action={
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowUpload(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5"
                  >
                    <Plus size={13} />
                    Upload Approval Letter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1"
                  >
                    <Link to="/client/schedule">
                      View Care Schedule <ArrowRight size={12} />
                    </Link>
                  </Button>
                </div>
              }
            />
          ) : (
            <DataTable
              columns={columns}
              data={authorizations}
              keyField="id"
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation footer */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
        <Link to="/client/care-plan" className="text-slate-600 hover:text-slate-900">
          ← Back to Care Plan
        </Link>
        <Link to="/client/schedule" className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1">
          Next: Care Schedule <ArrowRight size={11} />
        </Link>
      </div>
    </PageContainer>
  );
}
