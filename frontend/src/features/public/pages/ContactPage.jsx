import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../shared/services/api';
import { validateEmail, validatePhone } from '../../../shared/utils/validation';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import Toast from '../../../shared/components/common/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Alert, AlertDescription } from '../../../components/ui/alert';

export default function ContactPage() {
  const { state = 'florida' } = useParams();
  const stateName = state.charAt(0).toUpperCase() + state.slice(1);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [referralSource, setReferralSource] = useState('Family Member');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setToastMsg('');

    if (!email.trim() && !phone.trim()) {
      setErrorMsg('Please provide at least one contact method (email or telephone).');
      return;
    }

    let validEmail = null;
    if (email.trim()) {
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) {
        setErrorMsg(emailCheck.error);
        return;
      }
      validEmail = emailCheck.value;
    }

    let validPhone = null;
    if (phone.trim()) {
      const phoneCheck = validatePhone(phone);
      if (!phoneCheck.valid) {
        setErrorMsg(phoneCheck.error);
        return;
      }
      validPhone = phoneCheck.value;
    }

    setSubmitting(true);

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: validPhone,
      email: validEmail,
      referral_source: referralSource,
      notes: notes.trim() || null,
    };

    try {
      const res = await api.post(`/states/${state}/contact/`, payload);
      setToastMsg(res.message || 'Thank you! Your inquiry has been received.');
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setNotes('');
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={
          <Link to={`/${state}`} className="text-slate-600 hover:text-slate-900 hover:underline">
            ← Back to {stateName} Office
          </Link>
        }
        title={`Contact Our ${stateName} Regional Office`}
        subtitle="Request care consultations, submit physician referrals, or inquire about Medicaid waiver eligibility."
      />

      {errorMsg && (
        <Alert variant="destructive" className="my-4">
          <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Toast message={toastMsg} type="success" onClose={() => setToastMsg('')} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start my-6">
        {/* Form Card */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Request Care Consultation / Referral</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Provide your contact details and care requirements to connect with our regional triage team.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="inquiry-first" className="text-xs font-semibold text-slate-700">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="inquiry-first"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="h-9 text-xs bg-white border-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="inquiry-last" className="text-xs font-semibold text-slate-700">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="inquiry-last"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="h-9 text-xs bg-white border-slate-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="inquiry-phone" className="text-xs font-semibold text-slate-700">
                  Telephone <span className="text-red-500">*</span>
                </label>
                <Input
                  id="inquiry-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="h-9 text-xs bg-white border-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="inquiry-email" className="text-xs font-semibold text-slate-700">
                  Email Address
                </label>
                <Input
                  id="inquiry-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-9 text-xs bg-white border-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="inquiry-source" className="text-xs font-semibold text-slate-700">
                  I am reaching out as a
                </label>
                <Select value={referralSource} onValueChange={setReferralSource}>
                  <SelectTrigger id="inquiry-source" className="w-full h-9 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Family Member" className="text-xs">Family Member Seeking Care</SelectItem>
                    <SelectItem value="Self / Patient" className="text-xs">Care Recipient (Self)</SelectItem>
                    <SelectItem value="Physician / Hospital" className="text-xs">Physician / Hospital Discharge Planner</SelectItem>
                    <SelectItem value="Medicaid Case Manager" className="text-xs">Medicaid Case Manager / Waiver Coordinator</SelectItem>
                    <SelectItem value="Other" className="text-xs">Other Community Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="inquiry-notes" className="text-xs font-semibold text-slate-700">
                  Care Needs or Specific Inquiries
                </label>
                <Textarea
                  id="inquiry-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tell us about required hours, mobility needs, or Medicaid program status..."
                  className="text-xs bg-white border-slate-200"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium mt-2 w-full sm:w-auto self-start"
              >
                {submitting ? 'Submitting...' : `Send Inquiry to ${stateName} Team`}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Office Details */}
        <div className="flex flex-col gap-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">{stateName} Regional Coordination Center</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-xs text-slate-600 leading-relaxed flex flex-col gap-2">
                <div><strong className="text-slate-800">Operating Hours:</strong> Mon - Fri: 8:00 AM - 5:00 PM EST</div>
                <div><strong className="text-slate-800">Clinical On-Call:</strong> 24/7 Registered Nurse Emergency Line</div>
                <div><strong className="text-slate-800">Response Time:</strong> Clinical triage within 2 business hours</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-900">Already registered?</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Existing caregivers and client families can access direct messaging and real-time records inside the portals.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="flex gap-3 flex-wrap mt-2">
                <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 text-xs hover:bg-slate-100" asChild>
                  <Link to="/caregiver/login">
                    Caregiver Portal →
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 text-xs hover:bg-slate-100" asChild>
                  <Link to="/client/login">
                    Client Portal →
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}