import { Upload, Loader2, Info } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
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

export default function ClientDocumentUpload({ upload, uploadCardRef }) {
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
    <Card
      ref={uploadCardRef}
      className="bg-white border-slate-200 shadow-sm mb-6"
    >
      <CardHeader className="p-4 pb-3 border-b border-slate-100">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Upload className="h-4 w-4 text-emerald-600" />
          Upload a New Document or Card
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Select the document category, attach a clear photo or PDF scan, and
          submit for verification.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              label="Document Category"
              htmlFor="client-doc-type"
              required
            >
              <Select
                value={selectedTypeId}
                onValueChange={(val) => setSelectedTypeId(val)}
              >
                <SelectTrigger id="client-doc-type" className="h-9 text-xs">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {docTypes.map((t) => (
                    <SelectItem
                      key={t.id}
                      value={String(t.id)}
                      className="text-xs"
                    >
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

            <FormField
              label="Select File (PDF, PNG, JPG &lt; 10MB)"
              htmlFor="client-file"
              required
            >
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
              <span>
                Need help scanning? Take a well-lit photo of your physical card
                using your smartphone camera.
              </span>
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
  );
}
