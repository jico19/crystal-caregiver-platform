import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { api } from '@/shared/services/api';
import { uploadDocument } from '@/shared/utils/documentUtils';
import { validateUploadedFile } from '@/shared/utils/validation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '@/shared/components/common/FormField';

export default function AuthorizationUpload({ token, documentTypes, onError, onBegin, onSaved, onCancel }) {
  // Upload form state
  const [file, setFile] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [authorizationNumber, setAuthorizationNumber] = useState('');
  const [uploadedDocumentId, setUploadedDocumentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleUpload(e) {
    e.preventDefault();
    if (submitting) return;
    onError('');
    onBegin();

    if (!file) {
      onError('Please select your official authorization document or letter.');
      return;
    }
    const fileCheck = validateUploadedFile(file, { maxSizeMB: 10 });
    if (!fileCheck.valid) {
      onError(fileCheck.error);
      return;
    }
    if (!startDate || !endDate) {
      onError('Coverage start and end dates are required.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      onError('End date must be on or after start date.');
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

      setFile(null);
      setStartDate('');
      setEndDate('');
      setAuthorizationNumber('');
      setUploadedDocumentId(null);
      await onSaved();
    } catch (err) {
      onError(err.detail || err.message || 'Failed to submit authorization document.');
    } finally {
      setSubmitting(false);
    }
  }

  return (<>
      {/* Self-Upload Letter Drawer */}
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
              onClick={onCancel}
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
                  onClick={onCancel}
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

  </>);
}
