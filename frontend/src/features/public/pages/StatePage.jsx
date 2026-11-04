import { useParams, Link } from 'react-router-dom';
import usePublishedSite from '../hooks/usePublishedSite';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import EmptyState from '../../../shared/components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

export default function StatePage() {
  const { state } = useParams();
  const { site } = usePublishedSite();
  const services = site.services;

  const displayName = site.state.name;
  const code = site.state.code;

  return (
    <PageContainer>
      <PageHeader
        title={site.overview.title}
        subtitle={site.overview.description}
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
                  <CardTitle className="text-sm font-semibold text-slate-900">{svc.title}</CardTitle>
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
