import { useAuthorizationEditor } from './useAuthorizationEditor';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/shared/services/api';
import {
  calculateAuthMetrics,
  filterAndSortAuthorizations,
} from './authorizationConstants.js';

export function useAuthorizationsData(token) {
  const [searchParams] = useSearchParams();

  const [authorizations, setAuthorizations] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pending-review actions
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewAction, setReviewAction] = useState('');

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('end_date_asc');
  const [copiedAuthId, setCopiedAuthId] = useState(null);

  const refreshAuthorizations = useCallback(async () => {
    try {
      const res = await api.get('/admin/authorizations?page_size=100', token);
      setAuthorizations(res?.authorizations || res?.results || (Array.isArray(res) ? res : []));
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to refresh authorizations.');
    }
  }, [token]);

  const editor = useAuthorizationEditor({ token, clients, searchParams, refreshAuthorizations, setErrorMsg, setSuccessMsg });
  const { initializeClient } = editor;

  useEffect(() => {
    let isMounted = true;
    const initialParamClientId = searchParams.get('client_id');

    async function loadData() {
      try {
        const [authRes, clientRes] = await Promise.all([
          api.get('/admin/authorizations?page_size=100', token),
          api.get('/admin/clients?page_size=100', token),
        ]);

        if (!isMounted) return;
        setAuthorizations(authRes?.authorizations || authRes?.results || (Array.isArray(authRes) ? authRes : []));
        const cl = clientRes?.clients || clientRes?.results || (Array.isArray(clientRes) ? clientRes : []);
        setClients(cl);

        initializeClient(cl, initialParamClientId);
      } catch {
        if (!isMounted) return;
        setErrorMsg('Failed to load authorization records.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [token, searchParams, initializeClient]);

  function handleCopyAuthNumber(num, id) {
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopiedAuthId(id);
    setTimeout(() => setCopiedAuthId(null), 2000);
  }

  async function handleReview(authorizationId, action, reviewDetails = {}) {
    if (!window.confirm(`Mark this authorization ${action === 'approved' ? 'approved (Active)' : 'rejected'}? The client will be notified.`)) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setReviewingId(authorizationId);
    setReviewAction(action);
    try {
      await api.post(`/admin/authorizations/${authorizationId}/review`, { status: action, ...reviewDetails }, token);
      setSuccessMsg(action === 'approved'
        ? 'Authorization approved and activated.'
        : 'Authorization rejected.');
      setReviewingId(null);
      setReviewAction('');
      await refreshAuthorizations();
    } catch (err) {
      setErrorMsg(err.detail || `Failed to ${action} the authorization.`);
      setReviewingId(null);
      setReviewAction('');
    }
  }

  const metrics = useMemo(() => calculateAuthMetrics(authorizations), [authorizations]);

  const filteredAuthorizations = useMemo(
    () => filterAndSortAuthorizations(authorizations, searchTerm, filterState, filterStatus, sortBy),
    [authorizations, searchTerm, filterState, filterStatus, sortBy]
  );

  const hasActiveFilters = searchTerm !== '' || filterState !== 'all' || filterStatus !== 'all';

  function handleResetFilters() {
    setSearchTerm('');
    setFilterState('all');
    setFilterStatus('all');
    setSortBy('end_date_asc');
  }

  return {
    editor,
    authorizations,
    clients,
    loading,
    errorMsg,
    setErrorMsg,
    successMsg,
    setSuccessMsg,
    reviewingId,
    reviewAction,
    searchTerm,
    setSearchTerm,
    filterState,
    setFilterState,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    copiedAuthId,
    handleReview,
    handleCopyAuthNumber,
    metrics,
    filteredAuthorizations,
    hasActiveFilters,
    handleResetFilters,
  };
}
