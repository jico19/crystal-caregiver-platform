import { Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import FormField from '@/shared/components/common/FormField';
import EmptyState from '@/shared/components/common/EmptyState';

export default function CaregiverAssignmentsSection({
  assignments,
  availableCaregivers,
  selectedCaregiverId,
  setSelectedCaregiverId,
  selectedRole,
  setSelectedRole,
  assigning,
  handleAssignCaregiver,
  handleEndAssignment,
  isSuperAdmin = false,
  overrideCompliance = false,
  setOverrideCompliance = () => {},
  overrideReason = '',
  setOverrideReason = () => {},
  caregiverCompliance = null,
  checkingCompliance = false,
}) {
  const selectedCg = availableCaregivers.find((cg) => cg.id === selectedCaregiverId);
  const compliance = caregiverCompliance ?? selectedCg?.compliance;
  const isCompliant = Boolean(compliance?.compliant);
  const canAssign = isCompliant || (isSuperAdmin && overrideCompliance && overrideReason.trim().length > 0);

  return (
    <Card className="bg-white border-slate-200 shadow-sm mb-6 p-0 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-base text-slate-900 m-0 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Assigned Caregivers ({assignments.length})
        </h2>
      </div>

      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <form onSubmit={handleAssignCaregiver}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <FormField label="Select Caregiver" htmlFor="assign-cg" required>
              <select
                id="assign-cg"
                required
                value={selectedCaregiverId}
                onChange={(e) => setSelectedCaregiverId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
              >
                <option value="">-- Choose Caregiver --</option>
                {availableCaregivers.map((cg) => (
                  <option key={cg.id} value={cg.id}>
                    {cg.first_name} {cg.last_name} ({cg.ssn_last4 ? `SSN: ***-${cg.ssn_last4}` : cg.id})
                    {cg.compliance?.status ? ` — [${cg.compliance.status}]` : ''}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Assignment Role" htmlFor="assign-role">
              <select
                id="assign-role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
              >
                <option value="primary">Primary Caregiver</option>
                <option value="backup">Backup Caregiver</option>
                <option value="relief">Relief Caregiver</option>
              </select>
            </FormField>

            <div>
              <Button
                type="submit"
                disabled={assigning || !selectedCaregiverId || !canAssign}
                title={!isCompliant && !overrideCompliance ? compliance?.blocking_reasons?.join('; ') : ''}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs w-full gap-1.5"
              >
                {assigning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  '+ Assign Caregiver'
                )}
              </Button>
            </div>
          </div>

          {selectedCg && (checkingCompliance || !compliance) && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                <span>Checking caregiver compliance status...</span>
              </div>
            </div>
          )}

          {selectedCg && compliance && !checkingCompliance && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-slate-600 font-medium">Compliance Status:</span>
                {compliance.compliant ? (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">
                    Compliant
                  </Badge>
                ) : compliance.status === 'Credentials Expired' ? (
                  <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-xs">
                    Credentials Expired
                  </Badge>
                ) : compliance.status === 'Missing Documents' ? (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-xs">
                    Missing Documents
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-xs">
                    {compliance.status || 'Non-Compliant'}
                  </Badge>
                )}
              </div>

              {!compliance.compliant && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1 text-rose-800">
                    <AlertTriangle size={14} />
                    <span>Compliance Lock Active: Cannot assign non-compliant caregiver</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                    {compliance.blocking_reasons?.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!compliance.compliant && isSuperAdmin && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-amber-900">
                    <input
                      type="checkbox"
                      className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      checked={overrideCompliance}
                      onChange={(e) => setOverrideCompliance(e.target.checked)}
                    />
                    <span>Super Admin Compliance Override</span>
                  </label>
                  {overrideCompliance && (
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-medium text-xs">
                        Override Justification (Required for audit log) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        required
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="e.g. State director emergency authorization"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {assignments.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No caregivers assigned"
            description="No caregivers assigned yet. Assign a caregiver above."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent bg-slate-50/50">
                <TableHead className="text-slate-500 text-xs font-semibold">Caregiver</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold">Role</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold">Contact</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold">Assigned Date</TableHead>
                <TableHead className="text-right text-slate-500 text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((asg) => {
                const cg = asg.caregivers;
                const cgId = asg.caregiver_id || cg?.id;
                return (
                  <TableRow key={asg.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-slate-900 text-xs">
                      {cg ? (
                        <span className="text-slate-900">
                          {cg.first_name} {cg.last_name}
                        </span>
                      ) : (cgId || 'Caregiver')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-slate-700 border-slate-200 text-xs capitalize font-normal">
                        {asg.role || 'primary'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">{cg?.phone || '—'}</TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {asg.assigned_at ? new Date(asg.assigned_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEndAssignment(cgId)}
                        className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        End Assignment
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
