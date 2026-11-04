import { useParams, Link } from 'react-router-dom';
import usePublishedSite from '../hooks/usePublishedSite';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import EmptyState from '../../../shared/components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Alert, AlertDescription } from '../../../components/ui/alert';

export default function CareersPage() {
  const { state = 'florida' } = useParams();
  const { site, error: errorMsg } = usePublishedSite();
  const careers = site.careers;
  const employmentPacket = site.forms.find((form) => form.category === 'employment_packet');
  const stateName = state.charAt(0).toUpperCase() + state.slice(1);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={
          <Link to={`/${state}`} className="text-slate-600 hover:text-slate-900 hover:underline">
            ← Back to {stateName} Office
          </Link>
        }
        title={`Caregiver Careers in ${stateName}`}
        subtitle={`Explore caregiver opportunities published by our ${stateName} office.`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium" asChild>
              <Link to={`/caregiver/application?state=${state}`}>
                Apply Online Now
              </Link>
            </Button>
            {employmentPacket && <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 text-xs font-medium" asChild>
              <a
                href={employmentPacket.file_url}
                target="_blank"
                rel="noreferrer"
              >
                Download Packet (PDF)
              </a>
            </Button>}
          </div>
        }
      />

      {errorMsg && (
        <Alert variant="destructive" className="my-4">
          <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {!errorMsg && careers.length === 0 && (
        <EmptyState
          title={`No current public openings in ${stateName}`}
          description="We review candidate profiles continuously. Submit your general caregiver application and credential portfolio to be contacted for upcoming shifts."
          action={
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs" asChild>
              <Link to={`/caregiver/application?state=${state}`}>
                Submit General Application
              </Link>
            </Button>
          }
        />
      )}

      {!errorMsg && careers.length > 0 && (
        <div className="flex flex-col gap-4">
          {careers.map((job) => (
            <Card key={job.id} className="border-slate-200 shadow-xs">
              <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900 m-0">
                      {job.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-emerald-700">
                        {job.compensation}
                      </span>
                      <span className="text-slate-300">·</span>
                      <Badge variant="secondary" className="text-[11px] font-medium capitalize">
                        {job.employment_type || 'Employment type not listed'}
                      </Badge>
                    </div>
                  </div>

                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium" asChild>
                    <Link to={`/caregiver/application?state=${state}&job=${encodeURIComponent(job.title)}`}>
                      Apply Now →
                    </Link>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0">
                {job.description && (
                  <p className="text-xs text-slate-600 leading-normal my-2">
                    {job.description}
                  </p>
                )}

                {job.requirements && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 mt-2">
                    <strong className="font-semibold text-slate-800">Requirements:</strong> {job.requirements}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
