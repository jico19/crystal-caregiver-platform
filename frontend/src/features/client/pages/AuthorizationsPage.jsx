import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  X,
  ShieldCheck,
  Download,
  AlertCircle,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Info,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import { api } from '../../../shared/services/api';
import { downloadDocument, uploadDocument } from '../../../shared/utils/documentUtils';
import { validateUploadedFile } from '../../../shared/utils/validation';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import FormField from '../../../shared/components/common/FormField';
import DataTable from '../../../shared/components/common/DataTable';
import EmptyState from '../../../shared/components/common/EmptyState';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import Toast from '../../../shared/components/common/Toast';
import LoadingState from '../../../shared/components/common/LoadingState';
import { authorizationUsage, summarizeAuthorizationHours } from '../lib/careMetrics';

const PROCEDURE_LABELS = {
  T1019: 'Personal Care Assistance (In-Home Aide)',
  S5150: 'Respite Care (Family Relief)',
  S5130: 'Homemaker & Chore Services',
  T1001: 'Nursing Assessment & Care Management',
  T1021: 'Home Health Aide Care',
};

export default function AuthorizationsPage() {
  const { token } = useAuth();
  const { data, isLoading: loading, error: fetchError, refetch } = useFetch('/clients/me/authorizations', {
    enabled: !!token,
    defaultData: { authorizations: [] },
  });
  const authorizations = useMemo(() => data?.authorizations || (Array.isArray(data) ? data : []), [data]);
  const { data: documentTypes } = useFetch('/documents/types', { enabled: !!token, defaultData: [] });
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [authorizationNumber, setAuthorizationNumber] = useState('');
  const [uploadedDocumentId, setUploadedDocumentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function handleUpload(e) {
    e.preventDefault();
    setErrorMsg('');
    setToastMsg('');

    if (!file) {
      setErrorMsg('Please select your official authorization document or letter.');
      return;
    }
    const fileCheck = validateUploadedFile(file, { maxSizeMB: 10 });
    if (!fileCheck.valid) {
      setErrorMsg(fileCheck.error);
      return;
    }
    if (!startDate || !endDate) {
      setErrorMsg('Coverage start and end dates are required.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setErrorMsg('End date must be on or after start date.');
      return;
    }

    setSubmitting(true);
    try {
      const types = documentTypes?.document_types || (Array.isArray(documentTypes) ? documentTypes : []);
      const authorizationType = types.find((type) => type.name === 'Authorizations' && ['client', 'both'].includes(type.for_role));
      if (!authorizationType) throw new Error('Authorization uploads are not configured. Please contact your agency.');
      const documentId = uploadedDocumentId || await uploadDocument({
        file, documentTypeId: authorizationType.id, expirationDate: endDate, token,
      });
      setUploadedDocumentId(documentId);
      await api.post('/clients/me/authorizations', {
        authorization_number: authorizationNumber.trim(), start_date: startDate,
        end_date: endDate, document: documentId,
      }, token);
      setToastMsg('Authorization letter received and submitted for administrative review.');
      setShowUpload(false);
      setFile(null);
      setStartDate('');
      setEndDate('');
      setAuthorizationNumber('');
      setUploadedDocumentId(null);
      await refetch();
    } catch (err) {
      setErrorMsg(err.detail || err.message || 'Failed to submit authorization document.');
    } finally {
      setSubmitting(false);
    }
  }

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

  const columns = [
    {
      key: 'procedure',
      label: 'Approved Service & Description',
      render: (_, row) => {
        const code = row.hcpcs_code || 'T1019';
        const friendlyName = PROCEDURE_LABELS[code] || row.service_description || 'Personal Care Services';
        return (
          <div>
            <div className="font-semibold text-slate-900 text-xs">
              {friendlyName}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="font-mono text-emerald-800 border-emerald-200 bg-emerald-50 text-[10px] py-0 px-1.5 font-bold">
                {code}
              </Badge>
              {row.max_weekly_hours ? (
                <span className="text-[11px] text-slate-500">
                  Up to {row.max_weekly_hours} hrs/week
                </span>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      key: 'allowance',
      label: 'Allowance & Usage',
      render: (_, row) => {
        const { total, used, remaining, remainingHours: remHours, totalHours } = authorizationUsage(row);
        if (totalHours === null) {
          return <div className="text-xs"><strong>{remaining} {row.unit_type === 'visit' ? 'visits' : 'units'} remaining</strong><div className="text-slate-500">{used} used of {total} authorized</div></div>;
        }
        const isOver = used > total;
        const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((used / total) * 100))) : 0;
        const progressBg = isOver || pct >= 90 ? 'bg-rose-500' : (pct >= 75 ? 'bg-amber-500' : 'bg-emerald-600');

        return (
          <div className="w-44">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className={`font-bold ${remHours < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {remHours < 0 ? `${Math.abs(remHours).toFixed(1)}h over limit` : `${remHours.toFixed(1)} hrs remaining`}
              </span>
              <span className="text-slate-500 text-[11px]">
                of {totalHours.toFixed(1)}h
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${progressBg} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
              <span>{pct}% utilized</span>
              <span>({remaining} billing units left)</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'dates',
      label: 'Effective Period',
      render: (_, row) => {
        const isExpiringSoon = row.days_until_expiration !== null && row.days_until_expiration <= 30;
        return (
          <div className="text-slate-600 text-xs">
            <div className="flex items-center gap-1">
              <Calendar size={12} className="text-slate-400" />
              <span>{row.start_date} to {row.end_date}</span>
            </div>
            {isExpiringSoon && row.days_until_expiration !== null && row.status === 'active' && (
              <span className="block text-[11px] font-semibold text-amber-600 mt-0.5">
                Renews in {row.days_until_expiration} days
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Approval Status',
      render: (val) => <StatusBadge status={val} size="xs" />,
    },
    {
      key: 'document',
      label: 'Notice File',
      render: (_, row) =>
        row.document_id ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => openDocument(row.document_id)}
            className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-semibold gap-1"
          >
            <Download size={11} />
            View Notice
          </Button>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
  ];

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

      {/* Self-Upload Letter Drawer */}
      {showUpload && (
        <Card className="bg-white border-slate-200 shadow-sm mb-6">
          <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-600" />
                Submit Authorization Approval Letter
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                If you received a Notice of Decision or Medicaid waiver approval directly by mail, upload a copy here.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUpload(false)}
              className="h-7 text-xs text-slate-500"
            >
              Cancel
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Authorization Document (PDF or Photo)" htmlFor="auth-upload-file" required>
                  <Input
                    id="auth-upload-file"
                    type="file"
                    required
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => { setFile(e.target.files[0] || null); setUploadedDocumentId(null); }}
                    className="h-9 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700"
                  />
                </FormField>

                <FormField label="Coverage Start Date" htmlFor="auth-upload-start" required>
                  <Input
                    id="auth-upload-start"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </FormField>

                <FormField label="Coverage End Date" htmlFor="auth-upload-end" required>
                  <Input
                    id="auth-upload-end"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </FormField>
              </div>

              <FormField label="Authorization Number (if shown on your letter)" htmlFor="auth-upload-number">
                <Input
                  id="auth-upload-number"
                  type="text"
                  maxLength={100}
                  value={authorizationNumber}
                  onChange={(e) => setAuthorizationNumber(e.target.value)}
                  placeholder="Enter the payer's authorization number"
                  className="h-9 text-xs"
                />
              </FormField>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpload(false)}
                  className="h-8 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading Letter...
                    </>
                  ) : (
                    'Submit for Verification'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
