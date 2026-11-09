import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { documentUploadSchema } from '../schemas/documentUploadSchema';
import { uploadDocument } from '../services/documentService';

export default function useDocumentUpload({
  docTypes,
  token,
  onUploaded,
  messages,
}) {
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);
  const pending = useRef(false);
  const {
    control,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: { documentTypeId: '', expirationDate: '', file: null },
    resolver: (values, context, options) => {
      const typeId = values.documentTypeId || String(docTypes[0]?.id || '');
      const type = docTypes.find((item) => String(item.id) === typeId);
      return zodResolver(documentUploadSchema(type, messages.missingFile))(
        values,
        context,
        options
      );
    },
  });
  const values = useWatch({ control });
  const selectedTypeId = values.documentTypeId || String(docTypes[0]?.id || '');
  const selectedTypeObj = docTypes.find(
    (item) => String(item.id) === selectedTypeId
  );

  async function save(values) {
    if (pending.current) return;
    pending.current = true;
    try {
      try {
        await uploadDocument({
          file: values.file,
          documentTypeId: selectedTypeId,
          expirationDate: values.expirationDate,
          token,
        });
        setSuccessMsg(messages.success(values.file.name));
        setValue('file', null);
        setValue('expirationDate', '');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        setErrorMsg(err.detail || err.message || messages.failure);
        return;
      }
      try {
        await onUploaded();
      } catch {
        setErrorMsg(
          'Upload succeeded, but the document list could not be refreshed. Please reload the page.'
        );
      }
    } finally {
      pending.current = false;
    }
  }

  function handleUploadSubmit(event) {
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
    selectedTypeId,
    selectedTypeObj,
    expirationDate: values.expirationDate,
    fileInputRef,
    uploading: isSubmitting,
    errorMsg,
    setErrorMsg,
    successMsg,
    setSuccessMsg,
    handleUploadSubmit,
    setSelectedTypeId: (value) => setValue('documentTypeId', value),
    setExpirationDate: (value) => setValue('expirationDate', value),
    setSelectedFile: (value) => setValue('file', value),
  };
}
