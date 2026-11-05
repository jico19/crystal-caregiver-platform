import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  Download,
  AlertCircle,
  PenTool,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import useFetch from '@/shared/hooks/useFetch';
import { api } from '@/shared/services/api';
import SignaturePad from '@/shared/components/common/SignaturePad';
import PageContainer from '@/shared/components/common/PageContainer';
import PageHeader from '@/shared/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import FormField from '@/shared/components/common/FormField';
import EmptyState from '@/shared/components/common/EmptyState';
import StatusBadge from '@/shared/components/common/StatusBadge';
import Toast from '@/shared/components/common/Toast';
import LoadingState from '@/shared/components/common/LoadingState';
import { admissionPacketUrl, STATE_PACKET_CODE } from '@/shared/utils/packets';

const AGREEMENT_DESCRIPTIONS = {
  general_care_terms_v1: 'Comprehensive home care terms, patient rights, and state health directives governing in-home aide assistance.',
  care_agreement: 'Authorizes our agency to coordinate licensed in-home aides and clinical visits according to your personalized care plan.',
  hipaa_disclosure: 'Protects your medical privacy under federal HIPAA guidelines and explains how your care data is securely shared.',
  client_rights: 'Outlines your state-protected rights as a home care recipient, including grievance procedures and service choices.',
  advance_directives: 'Acknowledges your right to formulate advance medical directives and designate healthcare proxies.',
};

export default function FormsPage() {
  const { user } = useAuth();
  return <FormsSession key={`${user?.id ?? 'anon'}:${user?.state_id ?? ''}:${user?.role ?? ''}`} />;
}

function FormsSession() {
  const { token, user } = useAuth();
  const { data, isLoading: loading, error: fetchError, refetch } = useFetch('/clients/me/agreements', {
    enabled: !!token,
    defaultData: { agreements: [] },
  });
  const rawAgreements = data?.agreements || (Array.isArray(data) ? data : []);
  // Deduplicate defensively by agreement_key preferring signed ones
  const agreements = Object.values(
    rawAgreements.reduce((acc, item) => {
      const key = item.agreement_key || item.id;
      if (!acc[key] || (!acc[key].signed && item.signed)) {
        acc[key] = item;
      }
      return acc;
    }, {})
  );

  const [activeKey, setActiveKey] = useState(null);
  const [activeRevision, setActiveRevision] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [signedName, setSignedName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  function openSign(tpl) {
    setActiveKey(tpl.agreement_key);
    setActiveRevision({ agreement_id: tpl.id, terms_hash: tpl.terms_hash });
    setSignatureData(null);
    setSignedName(tpl.signed_name || user?.name || '');
    setErrorMsg('');
  }

  async function handleSign(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!signatureData) {
      setErrorMsg('Please draw your legal signature on the pad below.');
      return;
    }
    if (!signedName.trim()) {
      setErrorMsg('Please enter your full legal name to sign.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/clients/me/agreements/${activeKey}/sign`, {
        ...activeRevision,
        signature_data: signatureData,
        signed_name: signedName.trim(),
      }, token);
      setToastMsg('Agreement signed and securely recorded on your clinical file.');
      setActiveKey(null);
      setActiveRevision(null);
      setSignatureData(null);
      await refetch();
    } catch (err) {
      setErrorMsg(err.detail || err.message || 'Failed to sign the agreement.');
      if (err.status === 409) {
        setActiveKey(null);
        setActiveRevision(null);
        await refetch();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <LoadingState
        title="Loading Care Agreements..."
        subtitle="Retrieving statutory consent records..."
        variant="page"
      />
    );
  }

  const isSigned = (a) => Boolean(a.signed || a.signed_at);
  const pendingAgreements = agreements.filter((a) => !isSigned(a));
  const signedAgreements = agreements.filter((a) => isSigned(a));
  const stateCode = STATE_PACKET_CODE[user?.state_id] || 'FL';
  const stateSlug = { FL: 'florida', IN: 'indiana', GA: 'georgia' }[stateCode];

  return (
    <PageContainer size="narrow">
      <PageHeader
        title="Agreements & Consents"
        subtitle="Review and electronically sign required care agreements and privacy disclosures for your medical record."
        badge={
          <StatusBadge
            status={pendingAgreements.length === 0 && agreements.length > 0 ? 'completed' : 'pending'}
            label={agreements.length === 0 ? 'No Forms Available' : pendingAgreements.length === 0 ? 'All Signed' : `${pendingAgreements.length} Action Needed`}
          />
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50">
              <a
                href={admissionPacketUrl(stateCode)}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download size={13} />
                Admission Packet (PDF)
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50">
              <Link to={`/${stateSlug}/forms`}>
                State Forms <ExternalLink size={12} />
              </Link>
            </Button>
          </div>
        }
      />

      {(errorMsg || fetchError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg || fetchError}</AlertDescription>
        </Alert>
      )}

      <Toast message={toastMsg} type="success" onClose={() => setToastMsg('')} />

      {/* Explainer Box */}
      <div className="mb-6 p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-start gap-3">
        <Info className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
        <p className="text-xs text-emerald-950 m-0 leading-relaxed">
          Review the full terms of each agency supplied form before signing. Your signature is recorded with the form revision and signing time.
        </p>
      </div>

      {agreements.length === 0 ? (
        <EmptyState
          title="No Agreements Available"
          description="Your agency has not provided electronic agreements for this account yet. Contact your coordinator for the required forms."
        />
      ) : (
        <div className="space-y-6">
          {/* Section 1: Pending Agreements */}
          {pendingAgreements.length > 0 && (
            <Card className="bg-white border-amber-200 shadow-sm">
              <CardHeader className="p-4 pb-3 border-b border-amber-100 bg-amber-50/40">
                <CardTitle className="text-sm font-semibold text-amber-950 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Action Required: Needs Your Signature ({pendingAgreements.length})
                  </span>
                  <span className="text-[11px] font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Pending
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-amber-900/80">
                  Please review the full text of each agreement before signing.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 divide-y divide-slate-100">
                {pendingAgreements.map((tpl, idx) => (
                  <div key={tpl.id || `${tpl.agreement_key}-${idx}`} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-semibold text-sm text-slate-900 m-0">
                          {tpl.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 mb-0 leading-normal">
                          {AGREEMENT_DESCRIPTIONS[tpl.agreement_key] || tpl.body}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openSign(tpl)}
                        disabled={!tpl.body?.trim() || !tpl.terms_hash}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 text-xs gap-1.5 shrink-0"
                      >
                        <PenTool size={11} />
                        Review & Sign
                      </Button>
                    </div>

                    {/* Inline Signing Drawer */}
                    {activeKey === tpl.agreement_key && (
                      <form onSubmit={handleSign} className="border border-slate-200 rounded-lg p-4 mt-4 bg-slate-50 flex flex-col gap-3">
                        <div className="text-xs text-slate-700 bg-white p-3 rounded border border-slate-200 max-h-36 overflow-y-auto leading-relaxed">
                          <strong className="block mb-1 text-slate-900">Agreement Terms:</strong>
                          {tpl.body}
                        </div>

                        <FormField label="Full Legal Name of Signer (typed)" htmlFor={`sign-name-${tpl.agreement_key}`} required>
                          <Input
                            id={`sign-name-${tpl.agreement_key}`}
                            type="text"
                            required
                            value={signedName}
                            onChange={(e) => setSignedName(e.target.value)}
                            placeholder="Enter your full legal name"
                            className="h-9 text-xs bg-white"
                          />
                        </FormField>

                        <FormField label="Draw Legal Signature" required>
                          <div className="border border-slate-200 rounded-md p-1 bg-white">
                            <SignaturePad value={signatureData} onChange={setSignatureData} height={140} />
                          </div>
                        </FormField>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => { setActiveKey(null); setSignatureData(null); }}
                            className="h-8 text-xs text-slate-600 hover:bg-slate-200"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={submitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Submitting Signature...
                              </>
                            ) : (
                              'Sign & Submit Agreement'
                            )}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Section 2: Signed Agreements */}
          {signedAgreements.length > 0 && (
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="p-4 pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Completed & Signed Agreements ({signedAgreements.length})
                  </span>
                  <StatusBadge status="completed" label="Compliant" size="xs" />
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Agreements on file with permanent electronic signature and audit hash.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 divide-y divide-slate-100">
                {signedAgreements.map((tpl, idx) => (
                  <div key={tpl.id || `${tpl.agreement_key}-${idx}`} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 m-0 flex items-center gap-2">
                        {tpl.title}
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 mb-0">
                        Signed by <strong>{tpl.signed_name}</strong> on {new Date(tpl.signed_at).toLocaleDateString()}
                      </p>
                      {tpl.content_hash && (
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          Audit SHA: {tpl.content_hash.slice(0, 16)}…
                        </span>
                      )}
                    </div>
                    <StatusBadge status="completed" label="Signed" size="xs" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Navigation footer */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
        <Link to="/client/intake" className="text-slate-600 hover:text-slate-900">
          ← Back to Admission & Intake
        </Link>
        <Link to="/client/documents" className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1">
          Next: Documents & Uploads <ArrowRight size={11} />
        </Link>
      </div>
    </PageContainer>
  );
}
