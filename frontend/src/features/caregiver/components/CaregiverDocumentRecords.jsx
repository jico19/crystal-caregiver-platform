import { Download, FileText } from 'lucide-react';
import { DOCUMENT_STATUS_META } from '../../../shared/constants/documentStatus';
import { downloadDocument } from '../../../shared/utils/documentUtils';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import EmptyState from '../../../shared/components/common/EmptyState';

export default function CaregiverDocumentRecords({ documents, token }) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="p-4 pb-3 border-b border-slate-100">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-600" />
          Submitted Documents ({documents.length})
        </CardTitle>
      </CardHeader>

      {documents.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No documents uploaded yet"
            description="Select a category above to submit your driver license, CPR certification, or TB test."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent bg-slate-50/50">
                <TableHead className="text-slate-500 text-xs font-semibold">
                  Document Type
                </TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold">
                  Uploaded Date
                </TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold">
                  Expiration
                </TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold">
                  Status
                </TableHead>
                <TableHead className="text-right text-slate-500 text-xs font-semibold">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const s =
                  DOCUMENT_STATUS_META[doc.status] ||
                  DOCUMENT_STATUS_META.pending_review;
                return (
                  <TableRow
                    key={doc.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50"
                  >
                    <TableCell className="font-semibold text-slate-900 text-xs">
                      {doc.document_types?.name || 'Document'}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {doc.expiration_date
                        ? new Date(doc.expiration_date).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={doc.status}
                        label={s.label}
                        size="xs"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadDocument(doc.id, token)}
                        className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-semibold gap-1"
                      >
                        <Download size={12} />
                        View File
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
