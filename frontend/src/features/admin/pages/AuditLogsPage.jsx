import { useAuth } from '../../../shared/hooks/useAuth';
import usePaginatedFetch from '../../../shared/hooks/usePaginatedFetch';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import EmptyState from '../../../shared/components/common/EmptyState';
import Pagination from '../../../shared/components/common/Pagination';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AuditLogsPage() {
  const { token } = useAuth();
  const {
    items: logs,
    total,
    pages,
    page,
    pageSize,
    loading,
    error,
    setPage,
    setPageSize,
  } = usePaginatedFetch({
    url: '/admin/audit-logs',
    token,
    listKey: 'audit_logs',
  });

  return (
    <PageContainer>
      <PageHeader
        title="Compliance & Security Audit Logs"
        description="Immutable activity stream recording administrative approvals, rejections, and authorization issuances."
      />

      {error && (
        <Alert variant="destructive" className="mb-4 text-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Recent Activity Stream ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading system logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No audit entries recorded yet"
                message="Administrative activities such as approvals, status changes, and issuances will be recorded here."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/50">
                  <TableHead className="text-xs font-semibold text-slate-600">Timestamp</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Actor (Admin)</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">IP Address</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Action</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Target Table</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Record ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="border-slate-100 hover:bg-slate-50">
                    <TableCell className="text-slate-500 whitespace-nowrap text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 text-xs">
                      {log.user_email || log.users?.email || 'System / Admin'}
                    </TableCell>
                    <TableCell className="text-slate-500 whitespace-nowrap font-mono text-xs">
                      {log.ip_address || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono text-xs">
                      {log.table_name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-slate-400 font-mono text-xs">
                      {log.record_id ? log.record_id.slice(0, 8) + '...' : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="p-4 border-t border-slate-100">
            <Pagination
              page={page}
              pages={pages}
              total={total}
              pageSize={pageSize}
              listLabel="entries"
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
