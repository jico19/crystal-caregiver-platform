import { useRef, useState } from 'react';
import {
  updateReferralStatus,
  saveReferralNotes,
} from '../services/referralService';
import { STATUS_CONFIG } from '../components/referralConfig';

export default function useReferralActions({
  token,
  reloadAll,
  handleResetFilters: resetFilters,
}) {
  const pending = useRef(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [convertedClientId, setConvertedClientId] = useState(null);

  // Modals state
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [notesTarget, setNotesTarget] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');

  async function executeStatusChange(referral, targetStatus) {
    if (!referral || referral.status === targetStatus || pending.current)
      return;
    pending.current = true;
    setUpdatingId(referral.id);
    setErrorMsg('');
    setSuccessMsg('');
    setConvertedClientId(null);
    try {
      const res = await updateReferralStatus(referral.id, targetStatus, token);
      if (targetStatus === 'converted' && res?.client_id) {
        setConvertedClientId(res.client_id);
        setSuccessMsg(
          `Referral for ${referral.first_name} ${referral.last_name} converted to client profile.`
        );
      } else {
        setSuccessMsg(
          `Referral marked as "${STATUS_CONFIG[targetStatus]?.label || targetStatus}".`
        );
      }
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to update referral status.');
      return;
    } finally {
      pending.current = false;
      setUpdatingId(null);
      setConfirmTarget(null);
    }
    reloadAll();
  }

  function handleStatusSelect(referral, targetStatus) {
    if (targetStatus === 'converted') {
      setConfirmTarget(referral);
    } else {
      executeStatusChange(referral, targetStatus);
    }
  }

  async function handleSaveNotes() {
    if (!notesTarget || pending.current) return;
    pending.current = true;
    setSavingNotes(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await saveReferralNotes(notesTarget.id, notesDraft, token);
      setSuccessMsg(
        `Intake notes updated for ${notesTarget.first_name} ${notesTarget.last_name}.`
      );
      setNotesTarget(null);
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to save intake notes.');
      return;
    } finally {
      pending.current = false;
      setSavingNotes(false);
    }
    reloadAll();
  }

  function onOpenNotes(referral) {
    setNotesTarget(referral);
    setNotesDraft(referral.handled_notes || '');
  }

  function handleResetFilters() {
    resetFilters();
    setErrorMsg('');
    setSuccessMsg('');
    setConvertedClientId(null);
  }

  return {
    updatingId,
    errorMsg,
    successMsg,
    convertedClientId,
    confirmTarget,
    setConfirmTarget,
    notesTarget,
    setNotesTarget,
    notesDraft,
    setNotesDraft,
    savingNotes,
    executeStatusChange,
    handleStatusSelect,
    handleSaveNotes,
    onOpenNotes,
    handleResetFilters,
  };
}
