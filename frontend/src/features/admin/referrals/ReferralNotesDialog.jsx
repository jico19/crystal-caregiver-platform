import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function ReferralNotesDialog({ target: notesTarget, onClose, onSave }) {
  const [notesDraft, setNotesDraft] = useState(notesTarget.handled_notes || '');
  const [saving, setSaving] = useState(false);
  async function handleSaveNotes() {
    if (saving) return;
    setSaving(true);
    try { await onSave(notesDraft); } finally { setSaving(false); }
  }
  return (<>
      {/* Notes Dialog */}
      <Dialog open={!!notesTarget} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Intake & Coordination Notes</DialogTitle>
            <DialogDescription>
              {notesTarget ? `${notesTarget.first_name} ${notesTarget.last_name} · ${notesTarget.phone || 'No phone'}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Internal Intake Notes</label>
            <textarea
              rows={4}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Record phone contact outcomes, care requirements, physician details, or follow-up dates..."
              className="w-full text-xs p-2.5 rounded-md border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button size="sm" disabled={saving} onClick={handleSaveNotes} className="bg-slate-900 hover:bg-slate-800 text-white">
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  </>);
}
