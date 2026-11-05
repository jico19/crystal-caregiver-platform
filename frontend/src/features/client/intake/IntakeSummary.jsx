import { UserPlus, ShieldCheck, Calendar, CreditCard, Phone, MapPin, CheckCircle2, Edit3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/shared/components/common/StatusBadge';

const STATUS_LABELS = {
  pending: 'Under Review by Care Coordinator',
  approved: 'Admission Approved',
  active: 'Care Services Active',
  discharged: 'Discharged',
  rejected: 'Admission Needs Correction',
};

export default function IntakeSummary({ profile, stateLabel, onEdit }) {
  return (<>
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
                    onClick={onEdit}
                    className="h-7 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 gap-1 font-medium"
                  >
                    <Edit3 size={12} />
                    Edit Intake Submission
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

  </>);
}
