import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function ReferralConversionDialog({ target: confirmTarget, updatingId, onClose, onConfirm }) {
  return (<>
      {/* Confirmation Modal for Client Conversion */}
      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && onClose()}>
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
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updatingId === confirmTarget?.id}
              onClick={onConfirm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {updatingId === confirmTarget?.id ? 'Converting...' : 'Confirm & Convert to Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

  </>);
}
