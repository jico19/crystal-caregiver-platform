import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { api } from '../../../shared/services/api';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import FormField from '../../../shared/components/common/FormField';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import EmptyState from '../../../shared/components/common/EmptyState';
import { STATUS_META } from '../../../shared/utils/caregiverStatus';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const NEXT_ACTIONS = {
  submitted: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['onboarding'],
  rejected: [],
  onboarding: [],
  draft: ['submitted'],
};

const ACTION_LABELS = {
  submitted: 'Start Review',
  under_review: 'Mark Under Review',
  approved: 'Approve Application',
  rejected: 'Reject Application',
  onboarding: 'Confirm Complete Onboarding',
};

export default function CaregiverDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();

  const [application, setApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [pendingStatus, setPendingStatus] = useState(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  async function loadDetail() {
    setLoading(true);
    setErrorMsg('');
    try {
      const detailRes = await api.get(`/admin/caregivers/${id}`, token);
      const application = detailRes?.application || null;
      setApplication(application);
      setEnrollments(detailRes?.enrollments || []);
      const caregiverId = application?.caregivers?.id;
      if (caregiverId) {
        const [docRes, asgnRes] = await Promise.all([
          api.get(`/admin/caregivers/${caregiverId}/documents`, token).catch(() => ({ documents: [] })),
          api.get(`/admin/caregivers/${caregiverId}/assignments`, token).catch(() => ({ assignments: [] })),
        ]);
        setDocuments(docRes?.documents || []);
        setAssignments(asgnRes?.assignments || []);
      } else {
        setDocuments([]);
        setAssignments([]);
      }
      if (!application) setErrorMsg('Application not found.');
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to load application details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token && id) loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  function openAction(status) {
    setPendingStatus(status);
    setReason('');
    setErrorMsg('');
    setSuccessMsg('');
  }

  async function confirmAction() {
    if (!pendingStatus) return;

    if (pendingStatus === 'rejected' && !reason.trim()) {
      setErrorMsg('A rejection reason is required before rejecting an application.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.post(
        `/admin/caregivers/${id}/review`,
        { status: pendingStatus, notes: reason.trim() || null },
        token
      );
      setSuccessMsg(`Application moved to "${STATUS_META[pendingStatus]?.label || pendingStatus.replace('_', ' ')}".`);
      setPendingStatus(null);
      await loadDetail();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to update application status.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
          <Loader2 className="size-6 text-emerald-600 animate-spin" />
          <span>Loading application details...</span>
        </div>
      </PageContainer>
    );
  }

  if (!application) {
    return (
      <PageContainer>
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>Application not found.</AlertDescription>
        </Alert>
        <Link to="/admin/caregivers" className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={13} /> Back to Caregiver Applications
        </Link>
      </PageContainer>
    );
  }

  const caregiver = application.caregivers || {};
  const userAccount = application.users || {};
  const state = application.states ? `${application.states.name || ''} (${application.states.code || ''})` : '—';
  const nextActions = NEXT_ACTIONS[application.status] || [];
  const canReview = nextActions.length > 0;

  return (
    <PageContainer>
      <div className="mb-2">
        <Link to="/admin/caregivers" className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={13} /> Back to Caregiver Applications
        </Link>
      </div>

      <PageHeader
        title="Application Review"
        subtitle={`Candidate: ${caregiver.first_name ? `${caregiver.first_name} ${caregiver.last_name || ''}` : 'Applicant'}`}
        actions={
          <StatusBadge
            status={application.status}
            label={STATUS_META[application.status]?.label || application.status.replace('_', ' ')}
          />
        }
      />

      {errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}
      {successMsg && (
        <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-800">
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Review Action Panel */}
      {canReview && (
        <Card className="mb-6 border-slate-200">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="font-semibold text-base text-slate-900">Review Decision</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {pendingStatus ? (
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <h3 className="font-semibold text-sm text-slate-900 mb-2">
                  {pendingStatus === 'rejected' ? 'Reject Application' : ACTION_LABELS[pendingStatus]}
                </h3>

                {pendingStatus === 'rejected' && (
                  <div className="mb-4">
                    <FormField
                      label="Rejection Reason (required, shown to the caregiver)"
                      id="rejection-reason"
                      required
                    >
                      <Textarea
                        id="rejection-reason"
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="E.g., Background check pending / expired certification / incomplete information — the applicant will see this when they resubmit."
                      />
                    </FormField>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    disabled={actionLoading}
                    onClick={confirmAction}
                    variant={pendingStatus === 'rejected' ? 'destructive' : 'default'}
                    size="sm"
                  >
                    {actionLoading ? 'Updating...' : `Confirm ${ACTION_LABELS[pendingStatus]}`}
                  </Button>
                  <Button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setPendingStatus(null)}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {nextActions.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    disabled={actionLoading}
                    onClick={() => openAction(status)}
                    variant={status === 'rejected' ? 'outline' : 'default'}
                    size="sm"
                    className={status === 'rejected' ? 'text-red-600 hover:bg-red-50 hover:border-red-300' : ''}
                  >
                    {ACTION_LABELS[status]}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Applicant Details */}
      <Card className="mb-6 border-slate-200">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="font-semibold text-base text-slate-900">Applicant Details</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <dt className="text-xs text-slate-400 mb-0.5">Full Name</dt>
              <dd className="text-sm font-semibold text-slate-900">
                {caregiver.first_name ? `${caregiver.first_name} ${caregiver.last_name || ''}` : 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 mb-0.5">Portal Email</dt>
              <dd className="text-sm font-semibold text-slate-900">{userAccount.email || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 mb-0.5">Phone</dt>
              <dd className="text-sm font-semibold text-slate-900">{caregiver.phone || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 mb-0.5">State Office</dt>
              <dd className="text-sm font-semibold text-slate-900">{state}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 mb-0.5">Date of Birth</dt>
              <dd className="text-sm font-semibold text-slate-900">
                {caregiver.date_of_birth ? new Date(caregiver.date_of_birth).toLocaleDateString() : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 mb-0.5">Submitted</dt>
              <dd className="text-sm font-semibold text-slate-900">
                {application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : '—'}
              </dd>
            </div>
          </dl>

          {caregiver.address && (
            <div className="mb-3 pt-3 border-t border-slate-100">
              <dt className="text-xs text-slate-400 mb-0.5">Address</dt>
              <dd className="text-xs text-slate-700 leading-normal">{caregiver.address}</dd>
            </div>
          )}
          {application.notes && (
            <div className="mb-3 pt-3 border-t border-slate-100">
              <dt className="text-xs text-slate-400 mb-0.5">Experience & Notes</dt>
              <dd className="text-xs text-slate-700 leading-normal">{application.notes}</dd>
            </div>
          )}
          {application.rejection_reason && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                <strong>Previous rejection reason:</strong> {application.rejection_reason}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Uploaded Documents */}
      <Card className="mb-6 overflow-hidden border-slate-200">
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="font-semibold text-base text-slate-900">
            Uploaded Credentials & Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No documents uploaded"
                description="No documents uploaded yet for this applicant."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/50">
                  <TableHead className="text-xs font-semibold text-slate-600">Document Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} className="border-slate-100 hover:bg-slate-50">
                    <TableCell className="font-semibold text-slate-900 text-xs">
                      {doc.document_types?.name || 'Unknown type'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={doc.status} label={doc.status.replace('_', ' ')} />
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Training Enrollments */}
      <Card className="mb-6 overflow-hidden border-slate-200">
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="font-semibold text-base text-slate-900">
            Assigned Training ({enrollments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {enrollments.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No training courses assigned"
                description="No training courses assigned yet for this applicant."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/50">
                  <TableHead className="text-xs font-semibold text-slate-600">Course</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Progress</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Enrolled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enr) => (
                  <TableRow key={enr.id} className="border-slate-100 hover:bg-slate-50">
                    <TableCell className="font-semibold text-slate-900 text-xs">
                      {enr.training_courses?.name || 'Course'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {enr.progress ?? 0}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {enr.enrolled_at ? new Date(enr.enrolled_at).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assigned Clients */}
      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="font-semibold text-base text-slate-900">
            Assigned Clients ({assignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {assignments.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No assigned clients"
                description="No clients assigned to this caregiver yet."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/50">
                  <TableHead className="text-xs font-semibold text-slate-600">Client</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Role</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Contact</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Assigned Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((asg) => {
                  const client = asg.clients;
                  return (
                    <TableRow key={asg.id} className="border-slate-100 hover:bg-slate-50">
                      <TableCell className="font-semibold text-slate-900 text-xs">
                        {client ? (
                          <Link
                            to={`/admin/clients/${client.id}`}
                            className="text-emerald-700 hover:text-emerald-800 underline"
                          >
                            {client.first_name} {client.last_name}
                          </Link>
                        ) : 'Client'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {asg.role || 'primary'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">{client?.phone || '—'}</TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        {asg.assigned_at ? new Date(asg.assigned_at).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
