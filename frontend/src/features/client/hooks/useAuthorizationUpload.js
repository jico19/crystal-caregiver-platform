import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  authorizationUploadSchema,
  authorizationUploadDefaults,
} from '../schemas/authorizationUploadSchema';
import { uploadAuthorization } from '../services/authorizationService';

export default function useAuthorizationUpload({ token, onUploaded }) {
  const [showUpload, setShowUpload] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const pending = useRef(false);
  const {
    register,
    setValue,
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: authorizationUploadDefaults,
    resolver: zodResolver(authorizationUploadSchema),
  });

  async function save(values) {
    if (pending.current) return;
    pending.current = true;
    try {
      await uploadAuthorization(values, token);
      setToastMsg(
        'Authorization letter received and submitted for administrative review.'
      );
      setShowUpload(false);
      reset(authorizationUploadDefaults);
      await onUploaded();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to submit authorization document.');
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
    setToastMsg('');
    return handleSubmit(save, (errors) =>
      setErrorMsg(Object.values(errors)[0]?.message || '')
    )(event);
  }

  return {
    showUpload,
    setShowUpload,
    errorMsg,
    toastMsg,
    setToastMsg,
    register,
    submit,
    submitting: isSubmitting,
    setFile: (file) => setValue('file', file),
  };
}
