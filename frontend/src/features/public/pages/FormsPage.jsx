import { useParams, Link } from 'react-router-dom';
import usePublishedSite from '../hooks/usePublishedSite';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import EmptyState from '../../../shared/components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Alert, AlertDescription } from '../../../components/ui/alert';

export default function FormsPage() {
  const { state = 'florida' } = useParams();
  const { site, error: errorMsg } = usePublishedSite();
  const forms = site.forms;
  const stateName = state.charAt(0).toUpperCase() + state.slice(1);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={
          <Link to={`/${state}`} className="text-slate-600 hover:text-slate-900 hover:underline">
            ← Back to {stateName} Office
          </Link>
        }
        title={`${stateName} Client & Regulatory Forms`}
        subtitle={`Download the public forms published by our ${stateName} office.`}
      />

      {errorMsg && (
        <Alert variant="destructive" className="my-4">
          <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {forms.length === 0 ? (
        <EmptyState
          title={`No downloadable forms currently listed for ${stateName}`}
          description="Please contact our regional office directly for specialized document packets and disclosures."
          action={
            <Button variant="outline" size="sm" className="border-slate-200 text-xs" asChild>
              <Link to={`/${state}/contact`}>
                Contact Regional Office
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {forms.map((f) => (
            <Card key={f.id} className="border-slate-200 shadow-xs">
              <CardContent className="p-5 flex justify-between items-center flex-wrap gap-4">
                <div className="max-w-2xl">
                  <h2 className="text-sm font-semibold text-slate-900 m-0">
                    {f.title}
                  </h2>
                  <p className="text-xs text-slate-600 leading-normal mt-1 mb-0">
                    {f.description}
                  </p>
                </div>

                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!f.file_url}
                    className="border-slate-200 text-slate-700 text-xs hover:bg-slate-100"
                    asChild={Boolean(f.file_url)}
                  >
                    {f.file_url ? (
                      <a href={f.file_url} download>Download Form ↓</a>
                    ) : 'Download unavailable'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8 border-slate-200 bg-slate-50/50 shadow-xs">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Need to submit completed documents?</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            You can securely upload signed physician orders and insurance documents directly through the client portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <Link
            to="/client/login"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
          >
            Sign In to Client Portal →
          </Link>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
