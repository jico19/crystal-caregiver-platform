import { useParams, Link } from 'react-router-dom';
import useFetch from '../../../shared/hooks/useFetch';
import LoadingState from '../../../shared/components/common/LoadingState';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import EmptyState from '../../../shared/components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { packetUrl } from '../../../shared/utils/packets';

export default function CareersPage() {
  const { state = 'florida' } = useParams();
  const { data, isLoading: loading, error: errorMsg } = useFetch(`/states/${state}/careers`, { defaultData: [] });

  const careers = data?.careers || [];
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
        subtitle="Join our accredited home care clinical team. We offer competitive weekly pay, flexible scheduling, paid in-service training, and comprehensive career development."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium" asChild>
              <Link to={`/caregiver/application?state=${state}`}>
                Apply Online Now
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 text-xs font-medium" asChild>
              <a
                href={packetUrl(state)}
                target="_blank"
                rel="noreferrer"
              >
                Download Packet (PDF)
              </a>
            </Button>
          </div>
        }
      />

      {loading && (
        <LoadingState
          title={`Loading Career Openings in ${stateName}...`}
          subtitle={`Fetching job listings and wage rates for ${stateName}...`}
          variant="cards"
          count={3}
        />
      )}

      {errorMsg && (
        <Alert variant="destructive" className="my-4">
          <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {!loading && !errorMsg && careers.length === 0 && (
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

      {!loading && !errorMsg && careers.length > 0 && (
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
                        {job.job_type?.replace('_', ' ') || 'Full Time'}
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