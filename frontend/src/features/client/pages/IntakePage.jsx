import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  UserPlus,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  Edit3,
  Calendar,
  Phone,
  MapPin,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import { api } from '../../../shared/services/api';
import { validatePhone } from '../../../shared/utils/validation';
import SignaturePad from '../../../shared/components/common/SignaturePad';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import FormField from '../../../shared/components/common/FormField';
import LoadingState from '../../../shared/components/common/LoadingState';
import { admissionPacketUrl, ADMISSION_PACKET_ITEMS, STATE_PACKET_CODE } from '../../../shared/utils/packets';

const STATUS_LABELS = {
  pending: 'Under Review by Care Coordinator',
  approved: 'Admission Approved',
  active: 'Care Services Active',
  discharged: 'Discharged',
  rejected: 'Admission Needs Correction',
};

export default function IntakePage() {
  const { token, user } = useAuth();

  const { data: profileRes, isLoading: loading, error: fetchError, refetch } = useFetch('/clients/me', {
    enabled: !!token,
  });
  const { data: docStatus } = useFetch('/clients/me/document-status', { enabled: !!token });
  const { data: agreeRes } = useFetch('/clients/me/agreements', { enabled: !!token });

  const profile = profileRes?.profile || profileRes || null;
  const isIntakeComplete = Boolean(profile?.first_name && profile?.last_name);

  if (loading) {
    return (
      <LoadingState
        title="Loading Client Admission..."
        subtitle="Retrieving care recipient identification and admission status..."
        variant="page"
      />
    );
  }

  return (
    <ClientIntakeContent
      profile={profile}
      isIntakeComplete={isIntakeComplete}
      docStatus={docStatus}
      agreements={agreeRes?.agreements || (Array.isArray(agreeRes) ? agreeRes : [])}
      token={token}
      user={user}
      fetchError={fetchError}
      onRefetch={refetch}
    />
  );
}

function ClientIntakeContent({
  profile,
  isIntakeComplete,
  docStatus,
  agreements,
  token,
  user,
  fetchError,
  onRefetch,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form fields
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [medicaidNumber, setMedicaidNumber] = useState(profile?.medicaid_number || '');
  const [stateId, setStateId] = useState(
    profile?.state_id ? String(profile.state_id) : user?.state_id ? String(user.state_id) : '1'
  );

  // E-signature
  const [signatureData, setSignatureData] = useState(null);
  const [signedName, setSignedName] = useState(
    profile?.signed_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
  );
  const [packetOpen, setPacketOpen] = useState(false);

  const stateCode = STATE_PACKET_CODE[stateId] || STATE_PACKET_CODE[1] || 'FL';
  const admissionItems = ADMISSION_PACKET_ITEMS[stateCode] || [];
  const stateLabel = stateId === '2' ? 'Indiana (IN)' : stateId === '3' ? 'Georgia (GA)' : 'Florida (FL)';

  // Calculate onboarding steps
  const docsUploaded = docStatus?.summary?.missing === 0;
  const agreementsSigned = agreements.length > 0 && agreements.every((a) => Boolean(a.signed || a.signed_at));
  const serviceActive = profile?.status === 'active' || profile?.status === 'approved';

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!signatureData) {
      setErrorMsg('Please draw your signature to verify and authorize this intake submission.');
      return;
    }
    if (!signedName.trim()) {
      setErrorMsg('Please enter your full legal name to complete the signature.');
      return;
    }

    if (dateOfBirth && new Date(dateOfBirth) > new Date()) {
      setErrorMsg('Date of birth cannot be in the future.');
      return;
    }

    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      setErrorMsg(phoneCheck.error);
      return;
    }

    if (medicaidNumber.trim().length > 50) {
      setErrorMsg('Medicaid ID / Insurance number must not exceed 50 characters.');
      return;
    }

    setSubmitting(true);

    const payload = {
      state_id: parseInt(stateId, 10),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      date_of_birth: dateOfBirth || null,
      phone: phoneCheck.value,
      address: address.trim() || null,
      medicaid_number: medicaidNumber.trim() || null,
      signature_data: signatureData,
      signed_name: signedName.trim(),
    };

    try {
      await api.post('/clients/intake', payload, token);
      setSuccessMsg('Your admission intake has been saved and signed successfully. Your care coordinator has been notified.');
      setIsEditing(false);
      await onRefetch();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to submit client intake. Please verify your information.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer size="narrow">
      <PageHeader
        title="Admission & Service Intake"
        subtitle="Manage care recipient registration, state admission packets, and onboarding progress."
      />

      {(errorMsg || fetchError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg || fetchError}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-950 font-semibold">Intake Recorded</AlertTitle>
          <AlertDescription className="text-emerald-800 text-xs">{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* 4-Step Onboarding Lifecycle Stepper */}
      <Card className="bg-white border-slate-200 shadow-sm mb-6">
        <CardHeader className="p-4 pb-3 border-b border-slate-100">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Admission & Onboarding Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Step 1 */}
            <div className={`p-3 rounded-lg border text-xs ${isIntakeComplete ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/60 border-amber-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">1. Intake Details</span>
                {isIntakeComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold">Action Needed</span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 m-0">
                {isIntakeComplete ? 'Profile & demographics on file' : 'Submit recipient identification'}
              </p>
            </div>

            {/* Step 2 */}
            <div className={`p-3 rounded-lg border text-xs ${docsUploaded ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">2. Documents</span>
                {docsUploaded ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Link to="/client/documents" className="text-[10px] text-emerald-700 font-semibold hover:underline">
                    Upload
                  </Link>
                )}
              </div>
              <p className="text-[11px] text-slate-600 m-0">
                {docsUploaded ? 'All required files received' : 'Insurance & Medicaid cards'}
              </p>
            </div>

            {/* Step 3 */}
            <div className={`p-3 rounded-lg border text-xs ${agreementsSigned ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">3. Agreements</span>
                {agreementsSigned ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Link to="/client/forms" className="text-[10px] text-emerald-700 font-semibold hover:underline">
                    Sign
                  </Link>
                )}
              </div>
              <p className="text-[11px] text-slate-600 m-0">
                {agreementsSigned ? 'All agreements signed' : 'Electronic consent forms'}
              </p>
            </div>

            {/* Step 4 */}
            <div className={`p-3 rounded-lg border text-xs ${serviceActive ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">4. Active Care</span>
                {serviceActive ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Pending</span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 m-0">
                {serviceActive ? 'Services scheduled & active' : 'Nurse assessment & scheduling'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Case A: Intake is already complete and user is not editing */}
      {isIntakeComplete && !isEditing ? (
        <div className="space-y-6">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Intake Profile on File
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Recipient identification registered with {profile?.states?.name || stateLabel}.
                </CardDescription>
              </div>
              <StatusBadge
                status={profile?.status || 'pending'}
                label={STATUS_LABELS[profile?.status] || 'Pending Review'}
              />
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex items-start gap-2.5 p-3 rounded-md bg-slate-50 border border-slate-200">
                  <UserPlus className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 block">Legal Name</span>
                    <strong className="text-sm text-slate-900 font-semibold">
                      {profile.first_name} {profile.last_name}
                    </strong>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-md bg-slate-50 border border-slate-200">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 block">Date of Birth</span>
                    <strong className="text-slate-800">
                      {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not provided'}
                    </strong>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-md bg-slate-50 border border-slate-200">
                  <CreditCard className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 block">Medicaid / Member ID</span>
                    <strong className="text-slate-800 font-mono">
                      {profile.medicaid_number || 'On file'}
                    </strong>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-md bg-slate-50 border border-slate-200">
                  <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 block">Primary Contact Phone</span>
                    <strong className="text-slate-800">
                      {profile.phone || 'Not provided'}
                    </strong>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-md bg-slate-50 border border-slate-200 sm:col-span-2">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 block">Home Service Location</span>
                    <strong className="text-slate-800">
                      {profile.address || 'Address on file'}
                    </strong>
                  </div>
                </div>
              </div>

              {profile.signed_at && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Digitally signed by <strong>{profile.signed_name || `${profile.first_name} ${profile.last_name}`}</strong> on {new Date(profile.signed_at).toLocaleDateString()}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-7 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 gap-1 font-medium"
                  >
                    <Edit3 size={12} />
                    Edit Intake Submission
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admission Packet Section */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                State Admission Packet ({stateCode})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Official statutory disclosures and service rights packet for your records.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPacketOpen(!packetOpen)}
                className="h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1 mb-3"
              >
                {packetOpen ? <>Hide included disclosures <ChevronUp size={12} /></> : <>View included disclosures ({admissionItems.length}) <ChevronDown size={12} /></>}
              </Button>

              {packetOpen && (
                <ul className="list-disc pl-5 mb-4 text-xs text-slate-600 space-y-1">
                  {admissionItems.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" asChild className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5">
                  <a
                    href={admissionPacketUrl(stateCode)}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download size={13} />
                    Download Complete Packet (PDF)
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5">
                  <Link to="/client/documents">
                    Upload Documents <ArrowRight size={13} />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Case B: Intake Form (Initial submission or editing) */
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-emerald-600" />
                  Care Recipient Information
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Please provide legal identification for the person receiving care.
                </CardDescription>
              </div>
              {isIntakeComplete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="h-7 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="First Name" htmlFor="client-first-name" required>
                    <Input
                      id="client-first-name"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g., Eleanor"
                      className="h-9 text-xs"
                    />
                  </FormField>

                  <FormField label="Last Name" htmlFor="client-last-name" required>
                    <Input
                      id="client-last-name"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g., Vance"
                      className="h-9 text-xs"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Service State Jurisdiction" htmlFor="client-state" required>
                    <Select value={stateId} onValueChange={(val) => setStateId(val)}>
                      <SelectTrigger id="client-state" className="h-9 text-xs">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1" className="text-xs">Florida (FL)</SelectItem>
                        <SelectItem value="2" className="text-xs">Indiana (IN)</SelectItem>
                        <SelectItem value="3" className="text-xs">Georgia (GA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Date of Birth" htmlFor="client-dob" required>
                    <Input
                      id="client-dob"
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Primary Contact Phone" htmlFor="client-phone">
                    <Input
                      id="client-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="h-9 text-xs"
                    />
                  </FormField>

                  <FormField label="Medicaid ID or Insurance Number" htmlFor="client-medicaid">
                    <Input
                      id="client-medicaid"
                      type="text"
                      value={medicaidNumber}
                      onChange={(e) => setMedicaidNumber(e.target.value)}
                      placeholder="e.g., 9-digit State Medicaid ID"
                      className="h-9 text-xs"
                    />
                  </FormField>
                </div>

                <FormField label="Home Service Address (Street, City, ZIP)" htmlFor="client-address">
                  <Input
                    id="client-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g., 123 Main St, Orlando, FL 32801"
                    className="h-9 text-xs"
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Electronic Signature Confirmation */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Admission Acknowledgement & Signature
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                By signing below, you affirm that the care recipient information provided is accurate and request initiation of home care services.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                <FormField label="Full Legal Name of Signer (typed)" htmlFor="client-signed-name" required>
                  <Input
                    id="client-signed-name"
                    type="text"
                    required
                    value={signedName}
                    onChange={(e) => setSignedName(e.target.value)}
                    placeholder="Enter the signer's full legal name"
                    className="h-9 text-xs"
                  />
                </FormField>

                <FormField label="Draw Legal Signature" required>
                  <div className="border border-slate-200 rounded-md p-1 bg-white">
                    <SignaturePad value={signatureData} onChange={setSignatureData} height={160} />
                  </div>
                </FormField>

                <div className="flex justify-end gap-2 pt-2">
                  {isIntakeComplete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      className="h-9 text-xs text-slate-600"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Saving Admission...
                      </>
                    ) : (
                      <>
                        Sign & Submit Admission Intake <ArrowRight size={13} />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Navigation footer */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
        <Link to="/client/dashboard" className="text-slate-600 hover:text-slate-900">
          ← Back to Dashboard
        </Link>
        <Link to="/client/forms" className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1">
          Next: Sign Agreements <ArrowRight size={11} />
        </Link>
      </div>
    </PageContainer>
  );
}
