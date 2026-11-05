import { RefreshCw, X, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FormField from '@/shared/components/common/FormField';
import {
  STATE_CODE_MAP,
  COMMON_NOTE_PRESETS,
  HCPCS_PROCEDURES,
  UNIT_TYPES,
} from './authorizationConstants.js';

export default function AuthorizationForm({
  clients,
  clientId,
  selectedClient,
  onClientChange,
  authNumber,
  setAuthNumber,
  onRegenerateAuthNumber,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onApplyDurationPreset,
  notes,
  setNotes,
  submitting,
  onSubmit,
  onClose,
  editingAuth,
  hcpcsCode,
  setHcpcsCode,
  serviceDescription,
  setServiceDescription,
  totalUnits,
  setTotalUnits,
  unitsUsed,
  setUnitsUsed,
  maxWeeklyHours,
  setMaxWeeklyHours,
  unitType,
  setUnitType,
}) {
  const unitsNum = parseInt(totalUnits, 10) || 0;
  const usedNum = parseInt(unitsUsed, 10) || 0;
  const remNum = unitsNum - usedNum;
  const totalHoursCalculated = unitType === '15_min' ? (unitsNum * 0.25).toFixed(1) : unitsNum;
  const remainingHoursCalculated = unitType === '15_min' ? (remNum * 0.25).toFixed(1) : remNum;

  function handleProcedureChange(code) {
    setHcpcsCode(code);
    const matched = HCPCS_PROCEDURES.find((p) => p.code === code);
    if (matched) {
      setServiceDescription(matched.name);
      if (matched.defaultUnitType) setUnitType(matched.defaultUnitType);
    }
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm mb-6 p-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900 m-0">
            {editingAuth ? `Edit Authorization #${authNumber}` : 'Issue Medicaid Service Authorization'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure HCPCS billing code, unit allowance (1 unit = 15m), and weekly caps per state Medicaid plan.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full"
          title="Close"
        >
          <X size={15} />
        </Button>
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Select Client */}
          <FormField
            label="Client"
            required
            htmlFor="auth-client"
            helpText={selectedClient?.medicaid_number ? `Medicaid ID: ${selectedClient.medicaid_number}` : undefined}
          >
            <select
              id="auth-client"
              required
              disabled={Boolean(editingAuth)}
              value={clientId}
              onChange={(e) => onClientChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:bg-slate-50 disabled:text-slate-400"
            >
              {clients.map((c) => {
                const stCode = c.states?.code || STATE_CODE_MAP[c.state_id] || 'FL';
                return (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({stCode}) {c.medicaid_number ? `— Medicaid: ${c.medicaid_number}` : ''}
                  </option>
                );
              })}
            </select>
          </FormField>

          {/* Authorization # */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="auth-num" className="text-xs font-medium text-slate-700">
                Authorization # <span className="text-rose-600">*</span>
              </label>
              {!editingAuth && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-emerald-700 border-emerald-200 bg-emerald-50">
                  Auto-generated
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="auth-num"
                type="text"
                required
                value={authNumber}
                onChange={(e) => setAuthNumber(e.target.value)}
                placeholder="E.g., AUTH-FL-2026-1049"
                className="flex-1 font-mono text-xs h-9"
              />
              {!editingAuth && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRegenerateAuthNumber}
                  title="Generate new authorization code"
                  className="h-9 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1 font-normal"
                >
                  <RefreshCw size={13} />
                  Re-roll
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Official state prior authorization (PA) approval tracking number.
            </p>
          </div>

          {/* Procedure Code (HCPCS) */}
          <FormField label="HCPCS Procedure Code" required htmlFor="auth-hcpcs">
            <div className="flex gap-2">
              <select
                id="auth-hcpcs"
                value={hcpcsCode}
                onChange={(e) => handleProcedureChange(e.target.value)}
                className="flex h-9 w-44 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 font-medium"
              >
                {HCPCS_PROCEDURES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
              <Input
                id="auth-service-desc"
                type="text"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                placeholder="Service description"
                className="flex-1 text-xs h-9"
              />
            </div>
          </FormField>

          {/* Unit Type */}
          <FormField label="Billing Unit Increment" required htmlFor="auth-unit-type">
            <select
              id="auth-unit-type"
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
            >
              {UNIT_TYPES.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </FormField>

          {/* Total Units Authorized */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="auth-total-units" className="text-xs font-medium text-slate-700">
                Total Authorized Units <span className="text-rose-600">*</span>
              </label>
              <span className="text-xs font-semibold text-emerald-700">
                ≈ {totalHoursCalculated} {unitType === '15_min' ? 'Hours' : 'Units'} Total
              </span>
            </div>
            <Input
              id="auth-total-units"
              type="number"
              min="0"
              required
              value={totalUnits}
              onChange={(e) => setTotalUnits(e.target.value)}
              placeholder="e.g. 120"
              className="h-9 text-xs"
            />
            <p className="text-xs text-slate-400 mt-1">
              At 15 min/unit, 4 units = 1 hr (e.g. 120 units = 30 hrs total allowance).
            </p>
          </div>

          {/* Units Used & Balance Info */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="auth-units-used" className="text-xs font-medium text-slate-700">
                Units Burned / Used
              </label>
              <span className={`text-xs font-semibold ${remNum >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {remNum >= 0
                  ? `${remNum} Units (${remainingHoursCalculated} hrs) Remaining`
                  : `${Math.abs(remNum)} Units (${Math.abs(remainingHoursCalculated)} hrs) Over allowance`}
              </span>
            </div>
            <Input
              id="auth-units-used"
              type="number"
              min="0"
              value={unitsUsed}
              onChange={(e) => setUnitsUsed(e.target.value)}
              placeholder="0"
              className="h-9 text-xs"
            />
            <p className="text-xs text-slate-400 mt-1">
              Logged units deducted as visits occur against this authorization.
            </p>
          </div>

          {/* Max Weekly Hours Cap */}
          <FormField
            label="Weekly Hour Cap (hrs/week)"
            htmlFor="auth-max-weekly-hours"
            helpText="Maximum reimbursable service hours per 7-day schedule period."
          >
            <Input
              id="auth-max-weekly-hours"
              type="number"
              step="0.5"
              min="0"
              max="168"
              value={maxWeeklyHours}
              onChange={(e) => setMaxWeeklyHours(e.target.value)}
              placeholder="e.g. 30.0"
              className="h-9 text-xs"
            />
          </FormField>

          {/* Start Date */}
          <FormField label="Start Date" required htmlFor="auth-start">
            <Input
              id="auth-start"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 text-xs"
            />
          </FormField>

          {/* End Date + Presets */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="auth-end" className="text-xs font-medium text-slate-700">
                End Date <span className="text-rose-600">*</span>
              </label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyDurationPreset(90)}
                  className="h-6 px-1.5 text-[11px] border-slate-200 text-slate-700 hover:bg-slate-50 font-normal"
                >
                  +90d
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyDurationPreset(180)}
                  className="h-6 px-1.5 text-[11px] border-slate-200 text-slate-700 hover:bg-slate-50 font-normal"
                >
                  +6mo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyDurationPreset(365)}
                  className="h-6 px-1.5 text-[11px] border-slate-200 text-slate-700 hover:bg-slate-50 font-normal"
                >
                  +1yr
                </Button>
              </div>
            </div>
            <Input
              id="auth-end"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Covered Services / Notes */}
          <div className="col-span-full">
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label htmlFor="auth-notes" className="text-xs font-medium text-slate-700">
                Covered Services & Clinical Notes
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                {COMMON_NOTE_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNotes(preset)}
                    className="h-6 px-2 text-[11px] border-slate-200 text-slate-600 hover:bg-slate-50 font-normal"
                  >
                    + {preset.split('—')[0].trim()}
                  </Button>
                ))}
              </div>
            </div>
            <Input
              id="auth-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., 20 hours/week Personal Care Assistance, Level 2 assistance"
              className="h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {editingAuth ? 'Saving Changes...' : 'Issuing Authorization...'}
              </>
            ) : (
              editingAuth ? 'Save Changes' : 'Issue Authorization'
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
