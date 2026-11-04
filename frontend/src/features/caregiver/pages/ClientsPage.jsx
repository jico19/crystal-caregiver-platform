import { Link } from 'react-router-dom';
import { Phone, MapPin, Building2, User, FileText, Calendar, AlertCircle } from 'lucide-react';
import useFetch from '../../../shared/hooks/useFetch';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import EmptyState from '../../../shared/components/common/EmptyState';
import LoadingState from '../../../shared/components/common/LoadingState';

export default function CaregiverClientsPage() {
  const { data, loading, error } = useFetch('/caregivers/me/clients');

  if (loading) {
    return (
      <LoadingState
        title="Loading Assigned Clients..."
        subtitle="Retrieving client care rosters and assignments..."
        variant="page"
      />
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load assigned clients: {error.message || 'Unknown error'}</AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  const clients = data?.clients || [];

  return (
    <PageContainer>
      <PageHeader
        title="My Assigned Clients"
        subtitle="Clients currently assigned for home care service delivery"
      />

      {clients.length === 0 ? (
        <EmptyState
          title="No assigned clients"
          description="You do not currently have any active client assignments."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card key={client.id} className="bg-white border-slate-200 shadow-sm flex flex-col justify-between p-5">
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <h3 className="font-semibold text-base text-slate-900 m-0 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-emerald-600" />
                    {client.first_name} {client.last_name}
                  </h3>
                  <Badge variant="outline" className="text-slate-700 border-slate-200 text-xs capitalize font-normal">
                    {client.assignment_role || 'Primary'}
                  </Badge>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 mb-4 leading-normal">
                  {client.phone && (
                    <div className="inline-flex items-center gap-1.5 w-full">
                      <Phone size={12} className="text-slate-400 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="inline-flex items-center gap-1.5 w-full">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                  {client.states?.name && (
                    <div className="inline-flex items-center gap-1.5 w-full">
                      <Building2 size={12} className="text-slate-400 shrink-0" />
                      <span>State: {client.states.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" asChild className="flex-1 h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1">
                  <Link to={`/caregiver/clients/${client.id}/care-plan`}>
                    <FileText size={12} />
                    Care Plan
                  </Link>
                </Button>
                <Button size="sm" asChild className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                  <Link to={`/caregiver/clients/${client.id}/schedule`}>
                    <Calendar size={12} />
                    Schedule
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
