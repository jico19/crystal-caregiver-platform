import { useEffect, useState } from 'react';
import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import useDocumentUpload from '../../../shared/hooks/useDocumentUpload';
import {
  documentTypesPath,
  getDocumentTypes,
  getMyDocuments,
} from '../../../shared/services/documentService';

const uploadMessages = {
  missingFile: 'Please select a file to upload.',
  success: (name) =>
    `Document '${name}' uploaded successfully and submitted for review.`,
  failure:
    'Failed to upload document. Ensure file is under 10 MB in PDF, JPEG, or PNG format.',
};

export default function useCaregiverDocuments() {
  const { token } = useAuth();
  const { data: typesData } = useFetch(documentTypesPath, {
    params: { role: 'caregiver' },
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

  async function refreshRecords() {
    setDocuments(await getMyDocuments(token));
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
        const records = await getMyDocuments(token);
        if (!mounted) return;
        setDocuments(records);
      } catch {
        if (mounted)
          setLoadError(
            'Failed to load credentials and required document types.'
          );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (token) load();
    return () => {
      mounted = false;
    };
  }, [token]);

  function handleUploadSubmit(event) {
    setLoadError('');
    return upload.handleUploadSubmit(event);
  }

  return {
    token,
    documents,
    loading,
    errorMsg: upload.errorMsg || loadError,
    successMsg: upload.successMsg,
    setSuccessMsg: upload.setSuccessMsg,
    upload: { ...upload, docTypes, handleUploadSubmit },
  };
}
