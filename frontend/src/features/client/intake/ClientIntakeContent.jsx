import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, UserPlus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/shared/services/api';
import { validatePhone } from '@/shared/utils/validation';
import SignaturePad from '@/shared/components/common/SignaturePad';
import PageContainer from '@/shared/components/common/PageContainer';
import PageHeader from '@/shared/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import FormField from '@/shared/components/common/FormField';
import { STATE_PACKET_CODE } from '@/shared/utils/packets';
import IntakeProgress from './IntakeProgress';
import AdmissionPacket from './AdmissionPacket';
import IntakeSummary from './IntakeSummary';

export default function ClientIntakeContent({
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
  const stateId = String(profile?.state_id || user?.state_id || 1);

  // E-signature
  const [signatureData, setSignatureData] = useState(null);
  const [signedName, setSignedName] = useState(
    profile?.signed_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
  );

  const stateCode = STATE_PACKET_CODE[stateId] || STATE_PACKET_CODE[1] || 'FL';
  const stateLabel = stateId === '2' ? 'Indiana (IN)' : stateId === '3' ? 'Georgia (GA)' : 'Florida (FL)';

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

    const phoneCheck = phone.trim() ? validatePhone(phone) : { valid: true, value: '' };
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
      address: address.trim(),
      medicaid_number: medicaidNumber.trim(),
      signature_data: signatureData,
      signed_name: signedName.trim(),
    };

    try {
      await api.post('/clients/intake', payload, token);
      setSuccessMsg('Your admission intake has been saved and signed successfully.');
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

      <IntakeProgress isIntakeComplete={isIntakeComplete} docStatus={docStatus} agreements={agreements} profile={profile} />

      {/* Case A: Intake is already complete and user is not editing */}
      {isIntakeComplete && !isEditing ? (
        <div className="space-y-6">
          <IntakeSummary profile={profile} stateLabel={stateLabel} onEdit={() => setIsEditing(true)} />

          <AdmissionPacket stateCode={stateCode} />
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
                    <Select value={stateId} disabled>
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
