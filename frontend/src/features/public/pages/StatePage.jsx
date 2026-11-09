import { useParams, Link } from 'react-router-dom';
import useFetch from '../../../shared/hooks/useFetch';
import LoadingState from '../../../shared/components/common/LoadingState';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import EmptyState from '../../../shared/components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '../../../components/ui/alert';

export default function StatePage() {
  const { state } = useParams();
  const { data: stateInfo, isLoading: stateLoading, error: stateError } = useFetch(`/states/${state}`);
  const { data: servicesRes, isLoading: servicesLoading, error: servicesError } = useFetch(`/states/${state}/services`, { defaultData: [] });

  const services = servicesRes?.services || [];
  const loading = stateLoading || servicesLoading;
  const error = stateError || servicesError || null;

  if (loading) {
    const formattedState = state ? state.charAt(0).toUpperCase() + state.slice(1) : 'State';
    return (
      <LoadingState
        title={`Loading ${formattedState} Healthcare Office...`}
        subtitle={`Querying database for ${formattedState} programs & credentials...`}
        variant="page"
      />
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="max-w-lg mx-auto my-8">
          <Alert variant="destructive">
            <AlertTitle className="text-sm font-semibold">Location Not Found</AlertTitle>
            <AlertDescription className="text-xs mt-1">
              <p>{error}</p>
              <div className="mt-3">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/florida">Go to Florida Office</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </PageContainer>
    );
  }

  const displayName = stateInfo?.name || state.charAt(0).toUpperCase() + state.slice(1);
  const code = stateInfo?.code || '';

  return (
    <PageContainer>
      <PageHeader
        title={`Healthcare & Home Care in ${displayName}`}
        subtitle={`Providing compassionate, licensed home care and specialized health assistance tailored to ${displayName} regulatory standards and Medicaid programs.`}
        badge={code ? <Badge variant="secondary" className="font-semibold">{code} Branch</Badge> : null}
      />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">For Caregivers</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Join our certified caregiver team in {displayName}. Apply online, submit credentials, and complete required in-service training.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs" asChild>
              <Link to="/caregiver/login">
                Caregiver Portal & Application →
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">For Clients & Families</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Receive personalized home care support in {displayName}. Manage care plans, authorizations, and service schedules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="text-xs border-slate-200 text-slate-700 hover:bg-slate-100" asChild>
              <Link to="/client/login">
                Client & Family Portal →
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="my-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-slate-900 m-0">
            Available Services in {displayName}
          </h2>
          <Link to={`/${state}/services`} className="text-xs text-slate-700 hover:text-emerald-700 underline font-medium">
            View all services →
          </Link>
        </div>

        {services.length === 0 ? (
          <EmptyState
            title={`Services catalog for ${displayName} is being updated`}
            description="Contact our local office directly for program inquiries and admission questions."
            action={
              <Button variant="outline" size="sm" className="border-slate-200 text-xs" asChild>
                <Link to={`/${state}/contact`}>
                  Contact Local Office
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {services.map((svc) => (
              <Card key={svc.id} className="border-slate-200 shadow-xs">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">{svc.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-slate-600 leading-normal m-0">
                    {svc.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}