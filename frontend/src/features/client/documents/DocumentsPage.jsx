import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  Download,
  AlertCircle,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import useFetch from '@/shared/hooks/useFetch';
import { api } from '@/shared/services/api';
import { downloadDocument, uploadDocument } from '@/shared/utils/documentUtils';
import { validateUploadedFile } from '@/shared/utils/validation';
import PageContainer from '@/shared/components/common/PageContainer';
import PageHeader from '@/shared/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import FormField from '@/shared/components/common/FormField';
import DataTable from '@/shared/components/common/DataTable';
import EmptyState from '@/shared/components/common/EmptyState';
import StatusBadge from '@/shared/components/common/StatusBadge';
import Toast from '@/shared/components/common/Toast';
import LoadingState from '@/shared/components/common/LoadingState';

export default function DocumentsPage() {
  const { user } = useAuth();
  return <DocumentsSession key={`${user?.id ?? 'anon'}:${user?.state_id ?? ''}:${user?.role ?? ''}`} />;
}

function DocumentsSession() {
  const { token } = useAuth();

  const { data: typesData } = useFetch('/documents/types', {
    params: { role: 'client' },
    enabled: !!token,
    staleTime: Infinity,
    defaultData: { document_types: [] },
  });
  const docTypes = typesData?.document_types || (Array.isArray(typesData) ? typesData : []);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Upload state
  const [selectedTypeIdState, setSelectedTypeId] = useState('');
  const selectedTypeId = selectedTypeIdState || (docTypes[0]?.id ? String(docTypes[0].id) : '');
  const [expirationDate, setExpirationDate] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const fileInputRef = useRef(null);
  const uploadCardRef = useRef(null);
  const [docStatus, setDocStatus] = useState(null);
  const selectedTypeObj = docTypes.find((t) => String(t.id) === String(selectedTypeId));

  useEffect(() => {
    let isMounted = true;

    async function loadClientDocs() {
      try {
        const [docsRes, statusRes] = await Promise.all([
          api.get('/documents/me', token),
          api.get('/clients/me/document-status', token),
        ]);

        if (!isMounted) return;
        setDocuments(docsRes?.documents || []);
        setDocStatus(statusRes || null);
      } catch {
        if (!isMounted) return;
        setErrorMsg('Failed to load document records.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (token) loadClientDocs();
    return () => {
      isMounted = false;
    };
  }, [token]);

  function handleSelectMissingDoc(typeId) {
    setSelectedTypeId(String(typeId));
    if (uploadCardRef.current) {
      uploadCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (fileInputRef.current) {
      fileInputRef.current.focus();
    }
  }

  async function handleUploadSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setToastMsg('');

    if (!selectedFile) {
      setErrorMsg('Please select a PDF or image file to upload.');
      return;
    }

    const fileCheck = validateUploadedFile(selectedFile, { maxSizeMB: 10 });
    if (!fileCheck.valid) {
      setErrorMsg(fileCheck.error);
      return;
    }

    if (selectedTypeObj?.requires_expiration && !expirationDate) {
      setErrorMsg(`An expiration date is required for ${selectedTypeObj.name}.`);
      return;
    }

    if (expirationDate) {
      const exp = new Date(expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (exp < today) {
        setErrorMsg('Document expiration date cannot be in the past.');
        return;
      }
    }

    setUploading(true);

    try {
      await uploadDocument({
        file: selectedFile,
        documentTypeId: selectedTypeId,
        expirationDate,
        token,
      });
      setToastMsg(`'${selectedFile.name}' uploaded successfully. It is now queued for coordinator verification.`);
      setSelectedFile(null);
      setExpirationDate('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setErrorMsg(err.detail || err.message || 'Failed to submit document. Ensure file is under 10 MB in PDF, JPEG, or PNG format.');
      setUploading(false);
      return;
    }

    try {
      const [docsRes, statusRes] = await Promise.all([
        api.get('/documents/me', token),
        api.get('/clients/me/document-status', token),
      ]);
      setDocuments(docsRes?.documents || []);
      setDocStatus(statusRes || null);
    } catch {
      setErrorMsg('Upload succeeded, but the document list could not be refreshed. Please reload the page.');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <LoadingState
        title="Loading Client Records..."
        subtitle="Retrieving insurance, Medicaid, and clinical documents..."
        variant="page"
      />
    );
  }

  const missingList = docStatus?.missing || [];
  const isCompliant = docStatus?.summary?.compliant ?? (missingList.length === 0);

  const columns = [
    {
      key: 'name',
      label: 'Document Type',
      render: (_, row) => (
        <div>
          <span className="font-semibold text-slate-900 block">{row.document_types?.name || 'Uploaded Document'}</span>
          <span className="text-[11px] text-slate-500 font-mono">{row.file_name || 'Attached file'}</span>
        </div>
      ),
    },
    {
      key: 'uploaded_at',
      label: 'Date Uploaded',
      render: (val) => <span className="text-slate-600 text-xs">{new Date(val).toLocaleDateString()}</span>,
    },
    {
      key: 'expiration_date',
      label: 'Expiration',
      render: (val) => (
        <span className="text-slate-600 text-xs">
          {val ? new Date(val).toLocaleDateString() : 'No expiration'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Review Status',
      render: (val) => <StatusBadge status={val} size="xs" />,
    },
    {
      key: 'actions',
      label: '',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => downloadDocument(row.id, token)}
          className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-semibold gap-1"
        >
          <Download size={12} />
          View File
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Documents & File Uploads"
        subtitle="Submit Medicaid ID cards, insurance verification, and physician care orders required for service authorization."
        badge={
          <StatusBadge
            status={isCompliant ? 'completed' : 'pending'}
            label={isCompliant ? 'Documents Compliant' : `${missingList.length} Action Needed`}
          />
        }
      />

      {errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Toast message={toastMsg} type="success" onClose={() => setToastMsg('')} />

      {/* Action Center: Missing Documents Alert Card */}
      {missingList.length > 0 && (
        <Card className="bg-white border-amber-200 shadow-sm mb-6">
          <CardHeader className="p-4 pb-3 border-b border-amber-100 bg-amber-50/50">
            <CardTitle className="text-sm font-semibold text-amber-950 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Action Required: {missingList.length} Document(s) Needed for Admission
              </span>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                Required
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-amber-900/80">
              Your care coordinator requires the following documents on file before scheduling home aide visits:
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 divide-y divide-slate-100">
            {missingList.map((m) => (
              <div key={m.document_type_id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div>
                  <strong className="text-xs text-slate-900 block">{m.name}</strong>
                  <span className="text-[11px] text-slate-500">
                    Required for your state licensing jurisdiction
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSelectMissingDoc(m.document_type_id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 text-xs gap-1.5 shrink-0"
                >
                  <Upload size={11} />
                  Upload This Now
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Compliance Health Snapshot */}
      {docStatus && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <span className="text-xs text-slate-500 block mb-0.5">Missing Required</span>
            <strong className={`text-xl font-bold ${missingList.length > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {missingList.length}
            </strong>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <span className="text-xs text-slate-500 block mb-0.5">Uploaded Files</span>
            <strong className="text-xl font-bold text-slate-900">
              {documents.length}
            </strong>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <span className="text-xs text-slate-500 block mb-0.5">Expiring Soon (&lt;30d)</span>
            <strong className="text-xl font-bold text-amber-600">
              {docStatus.summary?.expiring_soon || 0}
            </strong>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <span className="text-xs text-slate-500 block mb-0.5">File Compliance</span>
            <div className="mt-1">
              <StatusBadge
                status={isCompliant ? 'completed' : 'pending'}
                label={isCompliant ? 'All Received' : 'Files Pending'}
                size="xs"
              />
            </div>
          </Card>
        </div>
      )}

      {/* Upload Drawer / Card */}
      <Card ref={uploadCardRef} className="bg-white border-slate-200 shadow-sm mb-6">
        <CardHeader className="p-4 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Upload className="h-4 w-4 text-emerald-600" />
            Upload a New Document or Card
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Select the document category, attach a clear photo or PDF scan, and submit for verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Document Category" htmlFor="client-doc-type" required>
                <Select value={selectedTypeId} onValueChange={(val) => setSelectedTypeId(val)}>
                  <SelectTrigger id="client-doc-type" className="h-9 text-xs">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {docTypes.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label={`Expiration Date ${selectedTypeObj?.requires_expiration ? '*' : '(if applicable)'}`}
                htmlFor="client-expiration-date"
              >
                <Input
                  id="client-expiration-date"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </FormField>

              <FormField label="Select File (PDF, PNG, JPG &lt; 10MB)" htmlFor="client-file" required>
                <Input
                  id="client-file"
                  ref={fileInputRef}
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  className="h-9 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700"
                />
              </FormField>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Info size={13} className="text-slate-400" />
                <span>Need help scanning? Take a well-lit photo of your physical card using your smartphone camera.</span>
              </div>
              <Button
                type="submit"
                disabled={uploading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-xs gap-1.5"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading Document...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Submit for Review
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Document Records Table */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Document Records on File ({documents.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {documents.length === 0 ? (
            <EmptyState
              title="No Documents Uploaded Yet"
              description="Upload your state Medicaid card, private insurance card, or physician orders using the form above."
            />
          ) : (
            <DataTable
              columns={columns}
              data={documents}
              keyField="id"
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation footer */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
        <Link to="/client/forms" className="text-slate-600 hover:text-slate-900">
          ← Back to Agreements & Consents
        </Link>
        <Link to="/client/authorizations" className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1">
          Next: Coverage & Hours <ArrowRight size={11} />
        </Link>
      </div>
    </PageContainer>
  );
}
