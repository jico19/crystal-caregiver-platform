import { Calendar, Plus, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import FormField from '../../../../shared/components/common/FormField';
import StatusBadge from '../../../../shared/components/common/StatusBadge';
import EmptyState from '../../../../shared/components/common/EmptyState';
import {
  DAY_OPTIONS,
  SCHEDULE_STATUS_LABELS,
  SERVICE_OPTIONS,
} from '../../constants/clientDetailConstants';

export default function ScheduleSection({
  schedule,
  schedDay,
  setSchedDay,
  schedStart,
  setSchedStart,
  schedEnd,
  setSchedEnd,
  schedService,
  setSchedService,
  schedCustomService,
  setSchedCustomService,
  schedStatus,
  setSchedStatus,
  schedNotes,
  setSchedNotes,
  addingSched,
  handleAddSchedule,
  handleDeleteSchedule,
}) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm p-0 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-base text-slate-900 m-0 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-emerald-600" />
          Visit Schedule ({schedule.length})
        </h2>
      </div>

      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <form onSubmit={handleAddSchedule} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <FormField label="Day of Week" id="sched-day">
              <select
                id="sched-day"
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                value={schedDay}
                onChange={(e) => setSchedDay(e.target.value)}
              >
                {DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Status" id="sched-status">
              <select
                id="sched-status"
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                value={schedStatus}
                onChange={(e) => setSchedStatus(e.target.value)}
              >
                {Object.entries(SCHEDULE_STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Start Time" id="sched-start" required>
              <Input
                id="sched-start"
                type="time"
                required
                className="h-9 text-xs"
                value={schedStart}
                onChange={(e) => setSchedStart(e.target.value)}
              />
            </FormField>
            <FormField label="End Time" id="sched-end" required>
              <Input
                id="sched-end"
                type="time"
                required
                className="h-9 text-xs"
                value={schedEnd}
                onChange={(e) => setSchedEnd(e.target.value)}
              />
            </FormField>
            <FormField label="Service" id="sched-service">
              <select
                id="sched-service"
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                value={schedService}
                onChange={(e) => setSchedService(e.target.value)}
              >
                <option value="">No service</option>
                {SERVICE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="custom">Custom…</option>
              </select>
              {schedService === 'custom' && (
                <Input
                  type="text"
                  maxLength={200}
                  value={schedCustomService}
                  onChange={(e) => setSchedCustomService(e.target.value)}
                  placeholder="Enter custom service name"
                  className="h-8 text-xs mt-1"
                />
              )}
            </FormField>
            <FormField label="Notes" id="sched-notes">
              <Input
                id="sched-notes"
                type="text"
                className="h-9 text-xs"
                value={schedNotes}
                onChange={(e) => setSchedNotes(e.target.value)}
                placeholder="Optional care instructions"
              />
            </FormField>
          </div>
          <div>
            <Button
              type="submit"
              disabled={addingSched}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5"
            >
              {addingSched ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus size={13} />
                  Add Schedule Entry
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {schedule.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No schedule entries"
            description="No schedule entries yet. Add the first visit above."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent bg-slate-50/50">
                <TableHead className="text-slate-500 text-xs font-semibold">Day</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold">Time</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold">Service</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold">Status</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold">Notes</TableHead>
                <TableHead className="text-right text-slate-500 text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((entry) => (
                <TableRow key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <TableCell className="font-semibold text-slate-900 text-xs">{entry.day_of_week}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-700">{entry.start_time} – {entry.end_time}</TableCell>
                  <TableCell className="text-slate-600 text-xs">{entry.service || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={entry.status}
                      label={SCHEDULE_STATUS_LABELS[entry.status] || entry.status}
                      size="xs"
                    />
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">{entry.notes || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSchedule(entry.id)}
                      className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
