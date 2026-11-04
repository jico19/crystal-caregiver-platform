import { useParams, Link } from 'react-router-dom';
import usePublishedSite from '../hooks/usePublishedSite';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import EmptyState from '../../../shared/components/common/EmptyState';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Alert, AlertDescription } from '../../../components/ui/alert';

export default function LicensingPage() {
  const { state = 'florida' } = useParams();
  const { site, error: errorMsg } = usePublishedSite();
  const licensing = site.licensing;
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
        subtitle={`Agency licensing information published by our ${stateName} office.`}
      />

      {errorMsg && (
        <Alert variant="destructive" className="my-4">
          <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {licensing.length === 0 ? (
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
                  <Badge variant="outline" className="text-slate-700 text-[11px] font-semibold">
                    {item.status || 'Status not listed'}
                  </Badge>
                  <h2 className="text-sm font-semibold text-slate-900 m-0">
                    {item.issuing_authority}
                  </h2>
                </div>
                <p className="text-xs text-slate-600 leading-normal m-0">
                  License: {item.license_number}
                </p>
                {item.disclosures && (
                  <p className="text-xs text-slate-600 leading-normal mt-2 mb-0">{item.disclosures}</p>
                )}
                {item.verified_at && (
                  <p className="text-xs text-slate-500 mt-2 mb-0">Last verified: {new Date(item.verified_at).toLocaleDateString()}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </PageContainer>
  );
}
