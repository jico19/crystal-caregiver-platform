import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function ReferralDialogs({
  confirmTarget,
  setConfirmTarget,
  updatingId,
  executeStatusChange,
  notesTarget,
  setNotesTarget,
  notesDraft,
  setNotesDraft,
  handleSaveNotes,
  savingNotes,
}) {
  return (
    <>
      <Dialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Client Admission Conversion</DialogTitle>
            <DialogDescription>
              {confirmTarget
                ? `Converting ${confirmTarget.first_name} ${confirmTarget.last_name} will automatically provision an active client profile and intake file mapped to state jurisdiction ${confirmTarget.states?.code || confirmTarget.state_code || 'assigned'}.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updatingId === confirmTarget?.id}
              onClick={() => executeStatusChange(confirmTarget, 'converted')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {updatingId === confirmTarget?.id
                ? 'Converting...'
                : 'Confirm & Convert to Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog
        open={!!notesTarget}
        onOpenChange={(open) => !open && setNotesTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Intake & Coordination Notes</DialogTitle>
            <DialogDescription>
              {notesTarget
                ? `${notesTarget.first_name} ${notesTarget.last_name} · ${notesTarget.phone || 'No phone'}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label
              htmlFor="referral-notes"
              className="text-xs font-semibold text-slate-700 block mb-1.5"
            >
              Internal Intake Notes
            </label>
            <textarea
              id="referral-notes"
              rows={4}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Record phone contact outcomes, care requirements, physician details, or follow-up dates..."
              className="w-full text-xs p-2.5 rounded-md border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNotesTarget(null)}
            >
              Close
            </Button>
            <Button
              size="sm"
              disabled={savingNotes}
              onClick={handleSaveNotes}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
