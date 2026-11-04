import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import useFetch from '../../../shared/hooks/useFetch';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import LoadingState from '../../../shared/components/common/LoadingState';

export default function CaregiverClientSchedulePage() {
  const { clientId } = useParams();
  const { data, loading, error } = useFetch(`/caregivers/me/clients/${clientId}/schedule`, { enabled: !!clientId });

  if (loading) {
    return (
      <LoadingState
        title="Loading Visit Schedule..."
        subtitle="Retrieving confirmed caregiver shifts and visit times..."
        variant="page"
      />
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Unable to load schedule: {error.message || 'You may not be assigned to this client.'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" asChild className="gap-1.5 h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
          <Link to="/caregiver/clients">
            <ArrowLeft size={13} /> Back to My Clients
          </Link>
        </Button>
      </PageContainer>
    );
  }

  const schedule = data?.schedule || [];
  const client = data?.client;

  return (
    <PageContainer>
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 gap-1 -ml-2">
          <Link to="/caregiver/clients">
            <ArrowLeft size={12} /> Back to My Clients
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Visit Schedule: ${client?.first_name ? `${client.first_name} ${client.last_name}` : 'Client'}`}
        subtitle="Scheduled care visits, assigned time slots, and routine services"
      />

      {schedule.length === 0 ? (
        <EmptyState
          title="No scheduled visits"
          description="No visit schedules are currently posted for this client."
        />
      ) : (
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 hover:bg-transparent bg-slate-50/50">
                  <TableHead className="text-slate-500 text-xs font-semibold">Day</TableHead>
                  <TableHead className="text-slate-500 text-xs font-semibold">Time</TableHead>
                  <TableHead className="text-slate-500 text-xs font-semibold">Service</TableHead>
                  <TableHead className="text-slate-500 text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-slate-500 text-xs font-semibold">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((item, idx) => (
                  <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-slate-900 text-xs">
                      {item.day_of_week || item.day}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {item.start_time ? `${item.start_time} - ${item.end_time}` : item.time || 'TBD'}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">{item.service || 'Personal Care'}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={item.status || 'scheduled'}
                        label={item.status || 'Scheduled'}
                        size="xs"
                      />
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">{item.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
