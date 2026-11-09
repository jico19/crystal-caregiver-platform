import { Plus, X, Loader2, ClipboardCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormField from '../../../../shared/components/common/FormField';
import StatusBadge from '../../../../shared/components/common/StatusBadge';
import {
  PLAN_STATUS_LABELS,
  ACTIVITY_OPTIONS,
  FREQUENCY_OPTIONS,
} from '../../constants/clientDetailConstants';

export default function CarePlanSection({
  carePlan,
  cpStatus,
  setCpStatus,
  cpEffectiveDate,
  setCpEffectiveDate,
  cpPrimaryNurse,
  setCpPrimaryNurse,
  cpEmergencyProtocol,
  setCpEmergencyProtocol,
  activities,
  setActivityField,
  addActivityRow,
  removeActivityRow,
  savingPlan,
  handleSavePlan,
}) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm mb-6 p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h2 className="font-semibold text-base text-slate-900 m-0 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-emerald-600" />
          Plan of Care
        </h2>
        {carePlan && (
          <StatusBadge
            status={carePlan.status}
            label={PLAN_STATUS_LABELS[carePlan.status] || carePlan.status}
          />
        )}
      </div>
      {!carePlan && (
        <p className="text-slate-500 text-xs mb-4">
          No plan on file yet. Create one below — the client portal will show it immediately.
        </p>
      )}

      <form onSubmit={handleSavePlan} className="space-y-4 mt-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Plan Status" id="cp-status">
            <select
              id="cp-status"
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
              value={cpStatus}
              onChange={(e) => setCpStatus(e.target.value)}
            >
              {Object.entries(PLAN_STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Effective Date" id="cp-effective-date">
            <Input
              id="cp-effective-date"
              type="date"
              className="h-9 text-xs"
              value={cpEffectiveDate}
              onChange={(e) => setCpEffectiveDate(e.target.value)}
            />
          </FormField>
          <FormField label="Clinical Supervisor" id="cp-primary-nurse">
            <Input
              id="cp-primary-nurse"
              type="text"
              maxLength={200}
              className="h-9 text-xs"
              value={cpPrimaryNurse}
              onChange={(e) => setCpPrimaryNurse(e.target.value)}
              placeholder="E.g., RN Maria Alvarez"
            />
          </FormField>
        </div>

        <FormField label="Emergency Protocol" id="cp-emergency-protocol">
          <Textarea
            id="cp-emergency-protocol"
            rows={3}
            className="text-xs resize-none"
            value={cpEmergencyProtocol}
            onChange={(e) => setCpEmergencyProtocol(e.target.value)}
            placeholder="Safety instructions and steps for medical emergencies."
          />
        </FormField>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-xs font-semibold text-slate-700">Daily Living Activities</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addActivityRow}
              className="h-7 text-xs border-slate-200 text-emerald-700 hover:bg-emerald-50 gap-1"
            >
              <Plus size={12} /> Add Activity
            </Button>
          </div>

          {activities.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-md">
              No activities added. Click "Add Activity" to build the daily care routine.
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((act, idx) => (
                <div key={idx} className="p-3 rounded-md border border-slate-200 bg-slate-50/50 grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-12 md:col-span-4 flex flex-col gap-1.5">
                    <select
                      className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm"
                      value={act.custom ? 'custom' : act.task}
                      onChange={(e) => {
                        const v = e.target.value;
                        setActivityField(idx, 'task', v === 'custom' ? '' : v);
                        setActivityField(idx, 'custom', v === 'custom');
                      }}
                      aria-label="Activity"
                    >
                      <option value="">Select activity…</option>
                      {ACTIVITY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                      <option value="custom">Custom…</option>
                    </select>
                    {act.custom && (
                      <Input
                        type="text"
                        className="h-8 text-xs"
                        value={act.task}
                        onChange={(e) => setActivityField(idx, 'task', e.target.value)}
                        placeholder="Custom activity name"
                      />
                    )}
                  </div>
                  <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
                    <select
                      className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm"
                      value={act.freqCustom ? 'custom' : act.frequency}
                      onChange={(e) => {
                        const v = e.target.value;
                        setActivityField(idx, 'frequency', v === 'custom' ? '' : v);
                        setActivityField(idx, 'freqCustom', v === 'custom');
                      }}
                      aria-label="Frequency"
                    >
                      <option value="">Select frequency…</option>
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                      <option value="custom">Custom…</option>
                    </select>
                    {act.freqCustom && (
                      <Input
                        type="text"
                        className="h-8 text-xs"
                        value={act.frequency}
                        onChange={(e) => setActivityField(idx, 'frequency', e.target.value)}
                        placeholder="Custom frequency"
                      />
                    )}
                  </div>
                  <div className="col-span-10 md:col-span-4">
                    <Input
                      type="text"
                      className="h-8 text-xs"
                      value={act.notes}
                      onChange={(e) => setActivityField(idx, 'notes', e.target.value)}
                      placeholder="Caregiver directive"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeActivityRow(idx)}
                      title="Remove activity"
                      className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-full"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={savingPlan}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs gap-1.5"
          >
            {savingPlan ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : carePlan ? (
              'Save Plan of Care'
            ) : (
              'Create Plan of Care'
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
