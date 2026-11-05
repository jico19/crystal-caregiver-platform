import { Loader2 } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import useFetch from '@/shared/hooks/useFetch';
import PageContainer from '@/shared/components/common/PageContainer';
import PageHeader from '@/shared/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { reportModel } from './reportModel';
import { ComplianceReport, CredentialsReport, TrainingReport, AuthorizationsReport, SourcesReport, InquiriesReport } from './ReportSections';

export default function ReportsPage() {
  const { token } = useAuth();
  const {
    data,
    isLoading: loading,
    error: errorMsg,
  } = useFetch('/admin/reports', {
    enabled: !!token,
  });

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Reports" />
        <div className="py-16 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
          <Loader2 className="size-6 text-emerald-600 animate-spin" />
          <div>Loading operational reports...</div>
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer>
        <PageHeader title="Reports" />
        {errorMsg && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
      </PageContainer>
    );
  }

  const { compliance, credentials, training, authorizations, sources, inquiries, stats } = reportModel(data);

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        description={`Operational snapshot for ${(data.state_codes || []).join(', ')}, generated ${data.generated_at ? new Date(data.generated_at).toLocaleString() : ''}.`}
      />

      {errorMsg && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.highlight ? 'text-red-600' : 'text-slate-900'}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <ComplianceReport compliance={compliance} />
      <CredentialsReport credentials={credentials} />
      <TrainingReport training={training} />
      <AuthorizationsReport authorizations={authorizations} />
      <SourcesReport sources={sources} />
      <InquiriesReport inquiries={inquiries} />
    </PageContainer>
  );
}
