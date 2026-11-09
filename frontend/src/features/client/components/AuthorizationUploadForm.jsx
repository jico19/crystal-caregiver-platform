import { Plus, Loader2 } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '../../../shared/components/common/FormField';

export default function AuthorizationUploadForm({ upload, onCancel }) {
  const { register, submit, setFile, submitting } = upload;
  return (
    <Card className="bg-white border-slate-200 shadow-sm mb-6">
      <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" />
            Submit Authorization Approval Letter
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            If you received a Notice of Decision or Medicaid waiver approval
            directly by mail, upload a copy here.
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
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              label="Authorization Document (PDF or Photo)"
              htmlFor="auth-upload-file"
              required
            >
              <Input
                id="auth-upload-file"
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files[0] || null)}
                className="h-9 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700"
              />
            </FormField>

            <FormField
              label="Coverage Start Date"
              htmlFor="auth-upload-start"
              required
            >
              <Input
                id="auth-upload-start"
                type="date"
                required
                {...register('startDate')}
                className="h-9 text-xs"
              />
            </FormField>

            <FormField
              label="Coverage End Date"
              htmlFor="auth-upload-end"
              required
            >
              <Input
                id="auth-upload-end"
                type="date"
                required
                {...register('endDate')}
                className="h-9 text-xs"
              />
            </FormField>
          </div>

          <FormField
            label="Optional Notes (e.g., Renewal notice, case manager name)"
            htmlFor="auth-upload-notes"
          >
            <Input
              id="auth-upload-notes"
              type="text"
              {...register('notes')}
              placeholder="e.g., Annual renewal for 2026, authorized 20 hrs/week personal care"
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
  );
}
