import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  clientIntakeDefaults,
  clientIntakeSchema,
} from '../schemas/clientIntakeSchema';
import { submitClientIntake } from '../services/clientIntakeService';
import {
  STATE_PACKET_CODE,
  ADMISSION_PACKET_ITEMS,
} from '../../../shared/utils/packets';

// Mounted after profile hydration so edit defaults and in-progress drafts are retained.
export default function useClientIntake({
  profile,
  user,
  token,
  docStatus,
  agreements,
  onRefetch,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const pending = useRef(false);
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: clientIntakeDefaults(profile, user),
    resolver: zodResolver(clientIntakeSchema),
  });
  const stateId = useWatch({ control, name: 'stateId' });
  const signatureData = useWatch({ control, name: 'signatureData' });
  const stateCode = STATE_PACKET_CODE[stateId] || STATE_PACKET_CODE[1] || 'FL';

  async function save(values) {
    if (pending.current) return;
    pending.current = true;
    try {
      await submitClientIntake(values, token);
      setSuccessMsg(
        'Your admission intake has been saved and signed successfully. Your care coordinator has been notified.'
      );
      setIsEditing(false);
      await onRefetch();
    } catch (err) {
      setErrorMsg(
        err.detail ||
          'Failed to submit client intake. Please verify your information.'
      );
    } finally {
      pending.current = false;
    }
  }

  function submit(event) {
    if (pending.current) {
      event.preventDefault();
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    return handleSubmit(save, (errors) =>
      setErrorMsg(Object.values(errors)[0]?.message || '')
    )(event);
  }

  return {
    isEditing,
    setIsEditing,
    errorMsg,
    successMsg,
    stateCode,
    stateLabel:
      stateId === '2'
        ? 'Indiana (IN)'
        : stateId === '3'
          ? 'Georgia (GA)'
          : 'Florida (FL)',
    admissionItems: ADMISSION_PACKET_ITEMS[stateCode] || [],
    docsUploaded: docStatus?.summary?.missing === 0,
    agreementsSigned:
      agreements.length > 0 &&
      agreements.every((a) => Boolean(a.signed || a.signed_at)),
    serviceActive:
      profile?.status === 'active' || profile?.status === 'approved',
    form: {
      register,
      submit,
      stateId,
      signatureData,
      submitting: isSubmitting,
      setStateId: (value) => setValue('stateId', value),
      setSignatureData: (value) => setValue('signatureData', value),
    },
  };
}
