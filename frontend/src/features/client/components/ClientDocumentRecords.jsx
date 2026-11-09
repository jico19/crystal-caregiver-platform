import { FileText, Download } from 'lucide-react';
import { downloadDocument } from '../../../shared/utils/documentUtils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DataTable from '../../../shared/components/common/DataTable';
import EmptyState from '../../../shared/components/common/EmptyState';
import StatusBadge from '../../../shared/components/common/StatusBadge';

export default function ClientDocumentRecords({ documents, token }) {
  const columns = [
    {
      key: 'name',
      label: 'Document Type',
      render: (_, row) => (
        <div>
          <span className="font-semibold text-slate-900 block">
            {row.document_types?.name || 'Uploaded Document'}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {row.file_name || 'Attached file'}
          </span>
        </div>
      ),
    },
    {
      key: 'uploaded_at',
      label: 'Date Uploaded',
      render: (val) => (
        <span className="text-slate-600 text-xs">
          {new Date(val).toLocaleDateString()}
        </span>
      ),
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
          <DataTable columns={columns} data={documents} keyField="id" />
        )}
      </CardContent>
    </Card>
  );
}
