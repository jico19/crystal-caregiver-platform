import { Upload, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import FormField from '../../../shared/components/common/FormField';

export default function CaregiverDocumentUpload({ upload }) {
  const {
    docTypes,
    selectedTypeId,
    setSelectedTypeId,
    selectedTypeObj,
    expirationDate,
    setExpirationDate,
    fileInputRef,
    setSelectedFile,
    uploading,
    handleUploadSubmit,
  } = upload;
  return (
    <Card className="bg-white border-slate-200 shadow-sm mb-6">
      <CardHeader className="p-4 pb-3 border-b border-slate-100">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Upload className="h-4 w-4 text-emerald-600" />
          Upload New Credential or Form
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <form
          onSubmit={handleUploadSubmit}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <FormField label="Document Category" htmlFor="doc-type" required>
            <Select
              value={selectedTypeId}
              onValueChange={(val) => setSelectedTypeId(val)}
            >
              <SelectTrigger id="doc-type" className="h-9 text-xs">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {docTypes.map((t) => (
                  <SelectItem
                    key={t.id}
                    value={String(t.id)}
                    className="text-xs"
                  >
                    {t.name}{' '}
                    {t.requires_expiration ? '(Expiration Required)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label={`Expiration Date ${selectedTypeObj?.requires_expiration ? '*' : '(Optional)'}`}
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

          <FormField
            label="File (PDF, PNG, JPEG, max 10MB)"
            htmlFor="doc-file"
            required
          >
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-9 text-xs gap-1.5"
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
  );
}
