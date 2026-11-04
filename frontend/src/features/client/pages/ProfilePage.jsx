import { useState } from 'react';
import {
  User,
  AlertCircle,
  Save,
  Loader2,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import { api } from '../../../shared/services/api';
import { validatePhone } from '../../../shared/utils/validation';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import FormField from '../../../shared/components/common/FormField';
import Toast from '../../../shared/components/common/Toast';
import LoadingState from '../../../shared/components/common/LoadingState';

export default function ProfilePage() {
  const { token, user } = useAuth();
  const { data, isLoading: loading, error: fetchError, refetch } = useFetch('/clients/me', {
    enabled: !!token,
  });

  if (loading) {
    return (
      <LoadingState
        title="Loading Contact Information..."
        subtitle="Retrieving client account and emergency details..."
        variant="page"
      />
    );
  }

  const profile = data?.profile || data || null;

  return (
    <ClientProfileForm
      key={profile?.id || user?.id || 'client-profile'}
      initialProfile={profile}
      token={token}
      user={user}
      fetchError={fetchError}
      onRefetch={refetch}
    />
  );
}

function ClientProfileForm({ initialProfile, token, user, fetchError, onRefetch }) {
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const firstName = initialProfile?.first_name || '';
  const lastName = initialProfile?.last_name || '';
  const [phone, setPhone] = useState(initialProfile?.phone || '');
  const [address, setAddress] = useState(initialProfile?.address || '');
  const [medicaidNumber, setMedicaidNumber] = useState(initialProfile?.medicaid_number || '');
  const stateName = initialProfile?.states?.name || (user?.state_id === 1 ? 'Florida' : user?.state_id === 2 ? 'Indiana' : 'Georgia');

  async function handleSave(e) {
    e.preventDefault();
    setErrorMsg('');
    setToastMsg('');
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      setErrorMsg(phoneCheck.error);
      return;
    }

    if (medicaidNumber.trim().length > 50) {
      setErrorMsg('Medicaid number must not exceed 50 characters.');
      return;
    }

    setSaving(true);

    const payload = {
      phone: phoneCheck.value,
      address: address.trim() || null,
      medicaid_number: medicaidNumber.trim() || null,
    };

    try {
      await api.patch('/clients/me/profile', payload, token);
      setToastMsg('Your contact information and address have been updated successfully.');
      if (onRefetch) await onRefetch();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to update contact details. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer size="narrow">
      <PageHeader
        title="Contact & Emergency Details"
        subtitle={`Registered with ${stateName} Office · Account: ${user?.email}`}
      />

      {(errorMsg || fetchError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg || fetchError}</AlertDescription>
        </Alert>
      )}

      <Toast message={toastMsg} type="success" onClose={() => setToastMsg('')} />

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-600" />
            Care Recipient Identification
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Legal identity and primary contact information on file with your state care coordinator.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSave} className="space-y-4">
            {/* Locked Legal Demographics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Legal First Name" htmlFor="profile-first">
                <Input
                  id="profile-first"
                  type="text"
                  disabled
                  value={firstName}
                  className="bg-slate-50 text-slate-700 font-medium cursor-not-allowed h-9 text-xs"
                />
              </FormField>

              <FormField label="Legal Last Name" htmlFor="profile-last">
                <Input
                  id="profile-last"
                  type="text"
                  disabled
                  value={lastName}
                  className="bg-slate-50 text-slate-700 font-medium cursor-not-allowed h-9 text-xs"
                />
              </FormField>
            </div>

            <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
              <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
              <span>
                Legal names are locked to statutory admission records. To request a legal name correction or update guardianship records, contact your agency administrator.
              </span>
            </div>

            {/* Editable Contact Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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

              <FormField label="Medicaid ID / Member Number" htmlFor="client-medicaid">
                <Input
                  id="client-medicaid"
                  type="text"
                  value={medicaidNumber}
                  onChange={(e) => setMedicaidNumber(e.target.value)}
                  placeholder="State Medicaid ID Number"
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </div>

            <FormField label="Home Service Address (Street, City, State, ZIP)" htmlFor="client-address">
              <Input
                id="client-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street, City, State, ZIP"
                className="h-9 text-xs"
              />
            </FormField>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck size={13} className="text-emerald-600" />
                <span>Changes update your coordinator dispatch records immediately.</span>
              </div>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-xs gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save Contact Details
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
