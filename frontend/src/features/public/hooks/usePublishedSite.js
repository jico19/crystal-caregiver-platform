import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PUBLIC_STATES } from '../../../shared/constants/states';
import { emptyPublicSite, loadPublishedSite } from '../lib/publishedSite';

const EMPTY_SITES = Object.fromEntries(Object.keys(PUBLIC_STATES).map((slug) => [slug, emptyPublicSite(slug)]));

export default function usePublishedSite() {
  const { state = 'florida' } = useParams();
  const query = useQuery({
    queryKey: ['published-site', state],
    queryFn: ({ signal }) => loadPublishedSite(state, { signal }),
    enabled: Boolean(PUBLIC_STATES[state]),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: false,
  });
  return {
    site: query.data || EMPTY_SITES[state] || EMPTY_SITES.florida,
    error: query.isError && !query.data ? 'Public information is being updated. You can still browse our state pages.' : '',
  };
}
