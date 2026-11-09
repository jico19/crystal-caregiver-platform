import { Upload, AlertTriangle } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '../../../shared/components/common/StatusBadge';

export default function ClientDocumentStatus({
  docStatus,
  missingList,
  isCompliant,
  documents,
  handleSelectMissingDoc,
}) {
  return (
    <>
      {missingList.length > 0 && (
        <Card className="bg-white border-amber-200 shadow-sm mb-6">
          <CardHeader className="p-4 pb-3 border-b border-amber-100 bg-amber-50/50">
            <CardTitle className="text-sm font-semibold text-amber-950 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Action Required: {missingList.length} Document(s) Needed for
                Admission
              </span>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                Required
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-amber-900/80">
              Your care coordinator requires the following documents on file
              before scheduling home aide visits:
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 divide-y divide-slate-100">
            {missingList.map((m) => (
              <div
                key={m.document_type_id}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
              >
                <div>
                  <strong className="text-xs text-slate-900 block">
                    {m.name}
                  </strong>
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
            <span className="text-xs text-slate-500 block mb-0.5">
              Missing Required
            </span>
            <strong
              className={`text-xl font-bold ${missingList.length > 0 ? 'text-rose-600' : 'text-emerald-700'}`}
            >
              {missingList.length}
            </strong>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <span className="text-xs text-slate-500 block mb-0.5">
              Uploaded Files
            </span>
            <strong className="text-xl font-bold text-slate-900">
              {documents.length}
            </strong>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <span className="text-xs text-slate-500 block mb-0.5">
              Expiring Soon (&lt;30d)
            </span>
            <strong className="text-xl font-bold text-amber-600">
              {docStatus.summary?.expiring_soon || 0}
            </strong>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <span className="text-xs text-slate-500 block mb-0.5">
              File Compliance
            </span>
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
    </>
  );
}
