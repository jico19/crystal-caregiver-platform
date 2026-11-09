import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Users,
  UserCheck,
  Clock,
  ShieldCheck,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { isSuperAdmin } from '../../../shared/lib/roles';
import usePaginatedFetch from '../../../shared/hooks/usePaginatedFetch';
import Pagination from '../../../shared/components/common/Pagination';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import EmptyState from '../../../shared/components/common/EmptyState';
import { CLIENT_STATUS_LABELS } from '../../../shared/constants/clientStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATE_BADGE_STYLES = {
  FL: 'bg-amber-50 text-amber-900 border-amber-200',
  IN: 'bg-sky-50 text-sky-900 border-sky-200',
  GA: 'bg-emerald-50 text-emerald-900 border-emerald-200',
};

export default function ClientsPage() {
  const { token, user } = useAuth();
  const isSuper = isSuperAdmin(user);

  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const queryParams = {
    ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(stateFilter && stateFilter !== 'all' ? { state: stateFilter } : {}),
    ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
    ...(sortBy && sortBy !== 'newest' ? { sort_by: sortBy } : {}),
  };

  const {
    items: clients,
    total,
    pages,
    page,
    pageSize,
    loading,
    error,
    setPage,
    setPageSize,
  } = usePaginatedFetch({
    url: '/admin/clients',
    token,
    params: queryParams,
    listKey: 'clients',
  });

  return (
    <PageContainer>
      <PageHeader
        title="Client Admissions & Roster"
        subtitle="Active care recipients, Medicaid enrollment records, and service jurisdictions."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" asChild variant="outline" className="h-8 text-xs">
              <Link to="/admin/referrals">View Inbound Leads</Link>
            </Button>
            <Button size="sm" asChild className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
              <Link to="/admin/authorizations">Issue Authorization</Link>
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="p-3 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Roster</span>
            <Users className="size-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Records in current scope</div>
        </Card>

        <Card className="p-3 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">Pending Review</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-900 mt-1">
            {clients.filter((c) => c.status === 'pending').length}
          </div>
          <div className="text-[11px] text-amber-600/80 mt-0.5">On current page view</div>
        </Card>

        <Card className="p-3 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">Active Services</span>
            <UserCheck className="size-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-900 mt-1">
            {clients.filter((c) => c.status === 'active').length}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">Receiving active care</div>
        </Card>

        <Card className="p-3 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-sky-700 uppercase tracking-wider">Approved Admissions</span>
            <ShieldCheck className="size-4 text-sky-500" />
          </div>
          <div className="text-xl font-bold font-mono text-sky-900 mt-1">
            {clients.filter((c) => c.status === 'approved').length}
          </div>
          <div className="text-[11px] text-sky-600/80 mt-0.5">Awaiting start date</div>
        </Card>
      </div>

      {/* Control Bar: Search + Filters + Sort */}
      <Card className="p-3 mb-4 border-slate-200 shadow-xs bg-white">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status Tabs */}
            <Tabs
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              className="w-auto"
            >
              <TabsList className="h-8 bg-slate-100 p-0.5">
                <TabsTrigger value="all" className="text-xs px-2.5 py-1">All Statuses</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs px-2.5 py-1">Pending</TabsTrigger>
                <TabsTrigger value="approved" className="text-xs px-2.5 py-1">Approved</TabsTrigger>
                <TabsTrigger value="active" className="text-xs px-2.5 py-1">Active</TabsTrigger>
                <TabsTrigger value="discharged" className="text-xs px-2.5 py-1">Discharged</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Jurisdiction Filter (For Super Admin) */}
            {isSuper && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-slate-500">State:</span>
                <Select
                  value={stateFilter}
                  onValueChange={(val) => {
                    setStateFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-28 text-xs bg-white">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All States</SelectItem>
                      <SelectItem value="FL">Florida (FL)</SelectItem>
                      <SelectItem value="IN">Indiana (IN)</SelectItem>
                      <SelectItem value="GA">Georgia (GA)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Instant Search Bar */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by client name, Medicaid #, or phone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Sort Order Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Sort:</span>
              <Select
                value={sortBy}
                onValueChange={(val) => {
                  setSortBy(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-56 text-xs bg-white">
                  <SelectValue placeholder="Sort Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="newest">Registration Date (Newest)</SelectItem>
                    <SelectItem value="service_start_date">Upcoming Start Date</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Roster Table */}
      <Card className="overflow-hidden border-slate-200 shadow-xs bg-white">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-14 text-center text-slate-500 text-xs">
              <div className="inline-block animate-pulse font-medium">Loading client directory...</div>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No client records found"
                description={
                  searchTerm
                    ? `No clients match search query "${searchTerm}".`
                    : 'No clients found matching the selected filters.'
                }
                action={
                  searchTerm ? (
                    <Button size="sm" variant="outline" onClick={() => setSearchTerm('')} className="mt-2 text-xs">
                      Clear Search
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/75">
                  <TableHead className="text-xs font-semibold text-slate-600">Client</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">State</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Admission Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Medicaid #</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Contact</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Start Date</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => {
                  const stateCode = c.state_code || c.states?.code || 'FL';
                  const badgeStyle = STATE_BADGE_STYLES[stateCode] || 'bg-slate-50 text-slate-700 border-slate-200';

                  return (
                    <TableRow key={c.id} className="border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <TableCell className="py-2.5">
                        <div className="font-semibold text-slate-900 text-xs">
                          <Link to={`/admin/clients/${c.id}`} className="hover:text-emerald-700 hover:underline">
                            {c.first_name} {c.last_name}
                          </Link>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {c.id ? String(c.id).substring(0, 8) : '—'}
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5">
                        <Badge variant="outline" className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 ${badgeStyle}`}>
                          {stateCode}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-2.5">
                        <StatusBadge
                          status={c.status}
                          label={CLIENT_STATUS_LABELS[c.status] || c.status || 'Pending'}
                        />
                      </TableCell>

                      <TableCell className="py-2.5">
                        <span className="font-mono text-xs text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                          {c.medicaid_number || 'Pending'}
                        </span>
                      </TableCell>

                      <TableCell className="py-2.5">
                        <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                          {c.phone ? (
                            <a
                              href={`tel:${c.phone}`}
                              className="inline-flex items-center gap-1 hover:text-emerald-700 hover:underline"
                            >
                              <Phone className="size-3 text-slate-400" />
                              <span>{c.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700"
                            >
                              <Mail className="size-2.5" />
                              <span className="truncate max-w-[130px]">{c.email}</span>
                            </a>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5 text-slate-600 text-xs">
                        {c.service_start_date ? (
                          <div className="inline-flex items-center gap-1 font-mono text-[11px]">
                            <Calendar className="size-3 text-slate-400" />
                            {new Date(c.service_start_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </TableCell>

                      <TableCell className="py-2.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-7 px-2 text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                          >
                            <Link to={`/admin/clients/${c.id}`}>
                              {c.status === 'pending' ? 'Review & Admit' : 'Manage File'}
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                          >
                            <Link
                              to={`/admin/authorizations?client_id=${c.id}&client_name=${encodeURIComponent(`${c.first_name} ${c.last_name}`)}&state_id=${c.state_id}`}
                            >
                              Auths
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <Pagination
              page={page}
              pages={pages}
              total={total}
              pageSize={pageSize}
              listLabel="clients"
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
