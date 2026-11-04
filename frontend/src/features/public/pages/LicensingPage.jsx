import { useParams, Link } from 'react-router-dom';
import useFetch from '../../../shared/hooks/useFetch';
import LoadingState from '../../../shared/components/common/LoadingState';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import EmptyState from '../../../shared/components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Alert, AlertDescription } from '../../../components/ui/alert';

export default function LicensingPage() {
  const { state = 'florida' } = useParams();
  const { data, isLoading: loading, error: errorMsg } = useFetch(`/states/${state}/licensing`, { defaultData: [] });

  const licensing = data?.licensing || [];
  const stateName = state.charAt(0).toUpperCase() + state.slice(1);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={
          <Link to={`/${state}`} className="text-slate-600 hover:text-slate-900 hover:underline">
            ← Back to {stateName} Office
          </Link>
        }
        title={`State Licensing & Accreditation: ${stateName}`}
        subtitle="Full disclosure of agency operating certificates, Medicaid provider authorizations, and clinical compliance standards."
      />

      {errorMsg && (
        <Alert variant="destructive" className="my-4">
          <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <LoadingState
          title={`Loading ${stateName} Licensing & Accreditation...`}
          subtitle={`Retrieving state compliance records for ${stateName}...`}
          variant="cards"
          count={2}
        />
      ) : licensing.length === 0 ? (
        <EmptyState
          title={`Licensing records are being updated for ${stateName}`}
          description="Official provider licenses and regulatory disclosure documents are available upon request from the regional office."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {licensing.map((item) => (
            <Card key={item.id} className="border-slate-200 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-800 text-[11px] font-semibold">
                    Active Certification
                  </Badge>
                  <h2 className="text-sm font-semibold text-slate-900 m-0">
                    {item.title}
                  </h2>
                </div>
                <p className="text-xs text-slate-600 leading-normal m-0">
                  {item.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8 border-slate-200 bg-slate-50/60 shadow-xs">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Continuous Clinical Compliance</CardTitle>
          <CardDescription className="text-xs text-slate-600 leading-relaxed">
            All agency caregivers in {stateName} undergo statewide Level 2 fingerprint background screening, annual TB testing, drug screening, and ongoing mandatory in-service education under registered nurse supervision.
          </CardDescription>
        </CardHeader>
      </Card>
    </PageContainer>
  );
}