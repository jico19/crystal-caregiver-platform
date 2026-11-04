import { useState } from 'react';
import { User, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import { api } from '../../../shared/services/api';
import { queryClient } from '../../../shared/lib/queryClient';
import { validateSsnLast4, validatePhone } from '../../../shared/utils/validation';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

export default function ProfilePage() {
  const { token, user } = useAuth();
  const { data, isLoading: loading, error: fetchError } = useFetch('/caregivers/me', {
    enabled: !!token,
  });

  if (loading) {
    return (
      <LoadingState
        title="Loading Profile Information..."
        subtitle="Retrieving contact information and licensing records..."
        variant="page"
      />
    );
  }

  return (
    <CaregiverProfileForm
      key={data?.id || user?.id}
      initialProfile={data}
      token={token}
      user={user}
      fetchError={fetchError}
    />
  );
}

function CaregiverProfileForm({ initialProfile, token, user, fetchError }) {
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [firstName, setFirstName] = useState(initialProfile?.first_name || '');
  const [lastName, setLastName] = useState(initialProfile?.last_name || '');
  const [phone, setPhone] = useState(initialProfile?.phone || '');
  const [address, setAddress] = useState(initialProfile?.address || '');
  const [dateOfBirth, setDateOfBirth] = useState(initialProfile?.date_of_birth || '');
  const [ssnLast4, setSsnLast4] = useState(initialProfile?.ssn_last4 || '');
  const stateId = String(initialProfile?.state ?? initialProfile?.state_id ?? user?.state_id ?? '');

  async function handleSave(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const ssnCheck = validateSsnLast4(ssnLast4);
    if (!ssnCheck.valid) {
      setErrorMsg(ssnCheck.error);
      return;
    }

    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      setErrorMsg(phoneCheck.error);
      return;
    }

    if (dateOfBirth && new Date(dateOfBirth) > new Date()) {
      setErrorMsg('Date of birth cannot be in the future.');
      return;
    }

    setSaving(true);

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phoneCheck.value || '',
      address: address.trim(),
      date_of_birth: dateOfBirth || null,
      ssn_last4: ssnCheck.value || '',
    };

    try {
      await api.patch('/caregivers/me/profile', payload, token);
      await queryClient.invalidateQueries({ queryKey: ['/caregivers/me'] });
      setSuccessMsg('Your profile has been updated successfully.');
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to update profile. Please verify your information.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer size="narrow">
      <PageHeader
        title="Caregiver Profile & Settings"
        subtitle="Keep your contact information, residential address, and licensing jurisdiction accurate for state compliance."
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
          <AlertTitle className="text-emerald-950 font-semibold">Success</AlertTitle>
          <AlertDescription className="text-emerald-800 text-xs">{successMsg}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-600" />
            Personal & Contact Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="First Name" id="first-name" required>
                <Input
                  id="first-name"
                  type="text"
                  required
                  className="h-9 text-xs"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </FormField>

              <FormField label="Last Name" id="last-name" required>
                <Input
                  id="last-name"
                  type="text"
                  required
                  className="h-9 text-xs"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Licensing State Branch" id="state" required>
                <Select value={stateId} disabled>
                  <SelectTrigger id="state" className="h-9 text-xs">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" className="text-xs">Florida (FL)</SelectItem>
                    <SelectItem value="2" className="text-xs">Indiana (IN)</SelectItem>
                    <SelectItem value="3" className="text-xs">Georgia (GA)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Contact Telephone" id="phone">
                <Input
                  id="phone"
                  type="tel"
                  className="h-9 text-xs"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                />
              </FormField>
            </div>

            <FormField label="Residential Address" id="address">
              <Input
                id="address"
                type="text"
                className="h-9 text-xs"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, City, State, ZIP"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Date of Birth" id="dob">
                <Input
                  id="dob"
                  type="date"
                  className="h-9 text-xs"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </FormField>

              <FormField label="SSN (Last 4 Digits)" id="ssn-last4">
                <Input
                  id="ssn-last4"
                  type="password"
                  maxLength={4}
                  className="h-9 text-xs"
                  value={ssnLast4}
                  onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                />
              </FormField>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={saving || !initialProfile || Boolean(fetchError)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save Profile Details
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
