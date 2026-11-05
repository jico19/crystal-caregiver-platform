import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { validateUploadedFile } from '@/shared/utils/validation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import FormField from '@/shared/components/common/FormField';

// Draft state stays local; list refreshes cannot discard the selected file/date.
export default function DocumentUploadForm({ docTypes, onUpload }) {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  // Upload form state
  const [selectedTypeIdState, setSelectedTypeId] = useState('');
  const selectedTypeId = selectedTypeIdState || (docTypes[0]?.id ? String(docTypes[0].id) : '');
  const [expirationDate, setExpirationDate] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const selectedTypeObj = docTypes.find((t) => String(t.id) === String(selectedTypeId));

  async function handleUploadSubmit(e) {
    e.preventDefault();
    if (uploading) return;
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedFile) {
      setErrorMsg('Please select a file to upload.');
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
      const refreshError = await onUpload({
        file: selectedFile,
        documentTypeId: selectedTypeId,
        expirationDate,
      });
      setSuccessMsg(`Document '${selectedFile.name}' uploaded successfully and submitted for review.`);
      setSelectedFile(null);
      setExpirationDate('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (refreshError) setErrorMsg(refreshError);
    } catch (err) {
      setErrorMsg(err.detail || err.message || 'Failed to upload document. Ensure file is under 10 MB in PDF, JPEG, or PNG format.');
      setUploading(false);
      return;
    }

    setUploading(false);
  }

  return (<>
      {errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-950 font-semibold">Success</AlertTitle>
          <AlertDescription className="text-emerald-800 text-xs">{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      <Card className="bg-white border-slate-200 shadow-sm mb-6">
        <CardHeader className="p-4 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Upload className="h-4 w-4 text-emerald-600" />
            Upload New Credential or Form
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleUploadSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <FormField label="Document Category" htmlFor="doc-type" required>
              <Select value={selectedTypeId} onValueChange={(val) => setSelectedTypeId(val)}>
                <SelectTrigger id="doc-type" className="h-9 text-xs">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {docTypes.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                      {t.name} {t.requires_expiration ? '(Expiration Required)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label={`Expiration Date${selectedTypeObj?.requires_expiration ? '' : ' (Optional)'}`} 
              htmlFor="expiration-date"
              required={selectedTypeObj?.requires_expiration}
            >
              <Input
                id="expiration-date"
                type="date"
                required={selectedTypeObj?.requires_expiration}
                className="h-9 text-xs"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </FormField>

            <FormField label="File (PDF, PNG, JPEG, max 10MB)" htmlFor="doc-file" required>
              <Input
                id="doc-file"
                type="file"
                ref={fileInputRef}
                required
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                className="h-9 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700"
              />
            </FormField>

            <div>
              <Button
                type="submit"
                disabled={uploading}
                className="bg-emerald-700 hover:bg-emerald-800 text-white w-full h-10 text-xs gap-1.5"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Submit Credential
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

  </>);
}
