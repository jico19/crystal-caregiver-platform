import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import useDocumentUpload from '../../../shared/hooks/useDocumentUpload';
import {
  documentTypesPath,
  getDocumentTypes,
} from '../../../shared/services/documentService';
import { getClientDocumentRecords } from '../services/clientDocumentService';

const uploadMessages = {
  missingFile: 'Please select a PDF or image file to upload.',
  success: (name) =>
    `'${name}' uploaded successfully. It is now queued for coordinator verification.`,
  failure:
    'Failed to submit document. Ensure file is under 10 MB in PDF, JPEG, or PNG format.',
};

export default function useClientDocuments() {
  const { token } = useAuth();
  const { data: typesData } = useFetch(documentTypesPath, {
    params: { role: 'client' },
    enabled: !!token,
    staleTime: Infinity,
    defaultData: { document_types: [] },
    fetcher: getDocumentTypes,
  });
  const docTypes =
    typesData?.document_types || (Array.isArray(typesData) ? typesData : []);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [docStatus, setDocStatus] = useState(null);
  const uploadCardRef = useRef(null);

  async function refreshRecords() {
    const records = await getClientDocumentRecords(token);
    setDocuments(records.documents);
    setDocStatus(records.docStatus);
  }

  const upload = useDocumentUpload({
    docTypes,
    token,
    onUploaded: refreshRecords,
    messages: uploadMessages,
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const records = await getClientDocumentRecords(token);
        if (!mounted) return;
        setDocuments(records.documents);
        setDocStatus(records.docStatus);
      } catch {
        if (mounted) setLoadError('Failed to load document records.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (token) load();
    return () => {
      mounted = false;
    };
  }, [token]);

  function handleSelectMissingDoc(typeId) {
    upload.setSelectedTypeId(String(typeId));
    uploadCardRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    upload.fileInputRef.current?.focus();
  }

  function handleUploadSubmit(event) {
    setLoadError('');
    return upload.handleUploadSubmit(event);
  }
  const missingList = docStatus?.missing || [];

  return {
    token,
    documents,
    loading,
    errorMsg: upload.errorMsg || loadError,
    successMsg: upload.successMsg,
    setSuccessMsg: upload.setSuccessMsg,
    upload: { ...upload, docTypes, handleUploadSubmit },
    docStatus,
    missingList,
    isCompliant: docStatus?.summary?.compliant ?? missingList.length === 0,
    uploadCardRef,
    handleSelectMissingDoc,
  };
}
