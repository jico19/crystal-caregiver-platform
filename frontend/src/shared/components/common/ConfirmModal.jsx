import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';

export default function ConfirmModal({
  isOpen = false,
  title = 'Confirm action',
  description = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
  isLoading = false,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onCancel?.()}>
      <DialogContent className="max-w-md sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900">{title}</DialogTitle>
          <DialogDescription className="text-xs text-slate-500 leading-normal">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 flex gap-2 justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="text-xs text-slate-700"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={isDestructive ? 'destructive' : 'default'}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="text-xs font-medium"
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
