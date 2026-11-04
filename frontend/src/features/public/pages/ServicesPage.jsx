import { useParams, Link } from 'react-router-dom';
import useFetch from '../../../shared/hooks/useFetch';
import LoadingState from '../../../shared/components/common/LoadingState';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import EmptyState from '../../../shared/components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Alert, AlertDescription } from '../../../components/ui/alert';

export default function ServicesPage() {
  const { state } = useParams();
  const { data, isLoading: loading, error: errorText } = useFetch(`/states/${state}/services`, { defaultData: [] });

  const services = data?.services || [];
  const error = errorText || null;
  const stateName = state ? state.charAt(0).toUpperCase() + state.slice(1) : '';

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={
          <Link to={`/${state}`} className="text-slate-600 hover:text-slate-900 hover:underline">
            ← Back to {stateName} Home
          </Link>
        }
        title={`Home Care Services in ${stateName}`}
        subtitle="State approved programs for elderly care, disability assistance, and skilled nursing."
      />

      {loading && (
        <LoadingState
          title={`Loading ${stateName} Service Programs...`}
          subtitle={`Retrieving licensed Medicaid & private-pay services for ${stateName}...`}
          variant="cards"
          count={3}
        />
      )}

      {error && (
        <Alert variant="destructive" className="my-4">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && services.length === 0 && (
        <EmptyState
          title={`No specialized listings published yet for ${stateName}`}
          description={`We offer personal care, companion care, respite care, and skilled nursing across all licensed counties in ${stateName}.`}
          action={
            <div className="flex justify-center gap-3">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs" asChild>
                <Link to={`/${state}/contact`}>
                  Contact {stateName} Coordinator
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 text-xs" asChild>
                <Link to="/client/login">
                  Start Intake
                </Link>
              </Button>
            </div>
          }
        />
      )}

      {!loading && !error && services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {services.map((svc) => (
            <Card key={svc.id} className="border-slate-200 shadow-xs">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">{svc.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <p className="text-xs text-slate-600 leading-normal m-0">
                  {svc.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}