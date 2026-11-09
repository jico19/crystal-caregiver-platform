import { useState } from 'react';
import { Eye, Check, X } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { api } from '../../../shared/services/api';
import { queryClient } from '../../../shared/lib/queryClient';
import usePaginatedFetch from '../../../shared/hooks/usePaginatedFetch';
import Pagination from '../../../shared/components/common/Pagination';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import EmptyState from '../../../shared/components/common/EmptyState';
import { DOCUMENT_STATUS_META } from '../../../shared/constants/documentStatus';
import { downloadDocument } from '../../../shared/utils/documentUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function DocumentsPage() {
  const { token } = useAuth();
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [actionLoading, setActionLoading] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const {
    items: documents,
    total,
    pages,
    page,
    pageSize,
    loading,
    error,
    setItems,
    setPage,
    setPageSize,
  } = usePaginatedFetch({
    url: '/admin/documents',
    token,
    params: { status: statusFilter },
    listKey: 'documents',
  });

  async function handleReview(docId, newStatus) {
    setErrorMsg('');
    setSuccessMsg('');
    setActionLoading(docId);

    try {
      await api.post(`/admin/documents/${docId}/review`, { status: newStatus }, token);
      setSuccessMsg(`Document marked as ${newStatus}.`);
      setItems((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: newStatus } : d))
      );
      queryClient.invalidateQueries({ queryKey: ['paginated', '/admin/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/admin/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/caregivers/me/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/caregivers/me/credential-status'] });
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to update document status.');
    } finally {
      setActionLoading(null);
    }
  }

  function handleInspect(docId) {
    downloadDocument(docId, token);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Document Compliance & Verification"
        subtitle="Verify credentials, CPR certifications, background screening, and physician plans across state offices."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">
              Status:
            </span>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-44 text-xs bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Documents</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {(error || errorMsg) && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error || errorMsg}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-800">
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading document queue...</div>
          ) : documents.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No documents found"
                description="No documents found matching the filter."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/50">
                  <TableHead className="text-xs font-semibold text-slate-600">Document Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Owner</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">State</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Uploaded</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Expiration</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const s = DOCUMENT_STATUS_META[doc.status] || DOCUMENT_STATUS_META.pending_review;
                  const isBusy = actionLoading === doc.id;

                  return (
                    <TableRow key={doc.id} className="border-slate-100 hover:bg-slate-50">
                      <TableCell className="font-semibold text-slate-900 text-xs">
                        {doc.document_types?.name || 'Document'}
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        {doc.users?.email || doc.owner_id?.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium text-xs text-slate-600">
                          {doc.states?.code || 'FL'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        {doc.expiration_date || 'None'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={doc.status} label={s.label} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1.5 items-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleInspect(doc.id)}
                            className="h-7 text-xs"
                          >
                            <Eye size={12} className="mr-1" /> Inspect
                          </Button>
                          {doc.status !== 'approved' && (
                            <Button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleReview(doc.id, 'approved')}
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Check size={12} className="mr-1" /> Approve
                            </Button>
                          )}
                          {doc.status !== 'rejected' && (
                            <Button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleReview(doc.id, 'rejected')}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            >
                              <X size={12} className="mr-1" /> Reject
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="p-3 border-t border-slate-100">
            <Pagination
              page={page}
              pages={pages}
              total={total}
              pageSize={pageSize}
              listLabel="documents"
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
