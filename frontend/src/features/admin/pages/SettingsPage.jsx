import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import EmptyState from '../../../shared/components/common/EmptyState';
import { api } from '../../../shared/services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function SettingsPage() {
  const { token } = useAuth();
  const [message, setMessage] = useState(null);
  const queryClient = useQueryClient();

  const {
    data: reqsData,
    isLoading: loading,
    error,
  } = useFetch('/admin/settings/document-requirements', { enabled: !!token });

  const requirements = reqsData?.requirements || (Array.isArray(reqsData) ? reqsData : []);

  const updateRequirement = useMutation({
    mutationFn: ({ reqId, required }) =>
      api.put(
        '/admin/settings/document-requirements',
        {
          requirement_id: reqId,
          required,
          reason: 'Updated via state compliance settings dashboard',
        },
        token
      ),
    onMutate: () => setMessage(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['/admin/settings/document-requirements'],
      });
      setMessage({ type: 'success', text: 'Document requirement updated successfully.' });
    },
    onError: (err) => {
      setMessage({
        type: 'error',
        text: err.detail || err.message || 'Failed to update requirement.',
      });
    }
  });

  function handleToggleRequired(reqId, currentRequired) {
    updateRequirement.mutate({ reqId, required: !currentRequired });
  }

  const caregiverReqs = requirements.filter(
    (r) => (r.document_types?.for_role || r.for_role) === 'caregiver'
  );
  const clientReqs = requirements.filter(
    (r) => (r.document_types?.for_role || r.for_role) === 'client'
  );

  return (
    <PageContainer>
      <PageHeader
        title="State Compliance Document Settings"
        description="Configure mandatory credential and intake document requirements per role for your state office."
      />

      {message && (
        <Alert
          variant={message.type === 'error' ? 'destructive' : 'default'}
          className={`mb-4 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : ''}`}
        >
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4 text-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card className="p-8 text-center text-slate-500 text-sm border-slate-200">
          Loading state document requirements matrix...
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Caregiver Requirements */}
          <Card className="overflow-hidden border-slate-200">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Caregiver Credential Requirements
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Mandatory document submissions required for caregiver compliance and active status.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {caregiverReqs.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="No requirements configured" message="No caregiver document requirements configured." />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 bg-slate-50/50">
                      <TableHead className="text-xs font-semibold text-slate-600">Document Type</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Description</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Expires Required</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">State</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-600">Requirement Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caregiverReqs.map((req) => {
                      const docType = req.document_types || {};
                      const stateInfo = req.states || {};
                      const isToggling = updateRequirement.isPending && updateRequirement.variables?.reqId === req.id;

                      return (
                        <TableRow key={req.id} className="border-slate-100 hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-900 text-xs">
                            {docType.name || req.document_type_id}
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs max-w-xs">
                            {docType.description || 'Standard credential document'}
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs">
                            {docType.requires_expiration ? 'Yes' : 'No'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-medium text-xs text-slate-600">
                              {stateInfo.code || 'FL'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-slate-600 font-medium">
                                {isToggling ? 'Updating...' : req.required ? 'Mandatory' : 'Optional'}
                              </span>
                              <Switch
                                checked={!!req.required}
                                disabled={updateRequirement.isPending}
                                onCheckedChange={() => handleToggleRequired(req.id, req.required)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Client Requirements */}
          <Card className="overflow-hidden border-slate-200">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Client Intake & Compliance Requirements
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Mandatory authorizations and agreements required for client intake completion.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {clientReqs.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="No requirements configured" message="No client document requirements configured." />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 bg-slate-50/50">
                      <TableHead className="text-xs font-semibold text-slate-600">Document Type</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Description</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Expires Required</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">State</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-600">Requirement Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientReqs.map((req) => {
                      const docType = req.document_types || {};
                      const stateInfo = req.states || {};
                      const isToggling = updateRequirement.isPending && updateRequirement.variables?.reqId === req.id;

                      return (
                        <TableRow key={req.id} className="border-slate-100 hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-900 text-xs">
                            {docType.name || req.document_type_id}
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs max-w-xs">
                            {docType.description || 'Standard intake agreement'}
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs">
                            {docType.requires_expiration ? 'Yes' : 'No'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-medium text-xs text-slate-600">
                              {stateInfo.code || 'FL'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-slate-600 font-medium">
                                {isToggling ? 'Updating...' : req.required ? 'Mandatory' : 'Optional'}
                              </span>
                              <Switch
                                checked={!!req.required}
                                disabled={updateRequirement.isPending}
                                onCheckedChange={() => handleToggleRequired(req.id, req.required)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
