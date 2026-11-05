import StatusBadge from '@/shared/components/common/StatusBadge';
import EmptyState from '@/shared/components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function fmtDate(value) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

function daysLabel(days) {
  if (days === null || days === undefined) return '—';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  return `in ${days}d`;
}

export function ComplianceReport({ compliance }) {
  return (<>
      {/* Caregiver compliance */}
      <Card className="overflow-hidden mb-6 border-slate-200">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-900">Caregiver Compliance</CardTitle>
          <Badge variant={compliance.compliant === compliance.total ? 'secondary' : 'destructive'} className="font-medium text-xs">
            {compliance.compliant} of {compliance.total} compliant
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {compliance.rows.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No caregivers found" message="No caregiver records available." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-xs font-semibold text-slate-600">Caregiver</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">State</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600">Missing</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600">Expired</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600">Expiring</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600">Valid</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compliance.rows.map((r) => (
                  <TableRow key={r.caregiver_id} className="border-slate-100 hover:bg-slate-50">
                    <TableCell>
                      <div className="font-medium text-slate-900 text-xs">{r.name}</div>
                      <div className="text-[11px] text-slate-500">{r.email || 'No portal email'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium text-xs text-slate-600">{r.state_code || '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-600">{r.missing}</TableCell>
                    <TableCell className="text-right text-xs text-slate-600">{r.expired}</TableCell>
                    <TableCell className="text-right text-xs text-slate-600">{r.expiring_soon}</TableCell>
                    <TableCell className="text-right text-xs text-slate-600">{r.valid}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={r.compliant ? 'active' : 'error'}
                        label={r.compliant ? 'Compliant' : 'Action needed'}
                      />
                      {r.missing_names?.length > 0 && (
                        <div className="text-[11px] text-slate-500 mt-1">Missing: {r.missing_names.join(', ')}</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

  </>);
}

export function CredentialsReport({ credentials }) {
  return (<>
      {/* Expiring credentials */}
      <Card className="overflow-hidden mb-6 border-slate-200">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-900">Expiring Credentials</CardTitle>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium text-xs">{credentials.total} total</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {credentials.rows.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No expiring credentials" message="No credentials expiring or expired in the next 30 days." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-xs font-semibold text-slate-600">Caregiver</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Credential</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">State</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Expires</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.rows.map((r, i) => (
                  <TableRow key={`${r.caregiver_id}-${r.document_name}-${i}`} className="border-slate-100 hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900 text-xs">{r.caregiver_name}</TableCell>
                    <TableCell className="text-slate-600 text-xs">{r.document_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium text-xs text-slate-600">{r.state_code || '—'}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">{fmtDate(r.expiration_date)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={r.status === 'expired' ? 'expired' : 'warning'}
                        label={r.status === 'expired' ? `Expired ${daysLabel(r.days_remaining)}` : daysLabel(r.days_remaining)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

  </>);
}

export function TrainingReport({ training }) {
  return (<>
      {/* In-Service training completion */}
      <Card className="overflow-hidden mb-6 border-slate-200">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-900">In-Service Training Completion</CardTitle>
          <Badge variant="secondary" className="font-medium text-xs">{training.total_courses} courses</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {training.rows.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No course enrollments" message="No training courses have enrollments yet." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-xs font-semibold text-slate-600">Course</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">State</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600">Enrolled</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600">Completed</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600">Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {training.rows.map((r) => (
                  <TableRow key={`${r.course_id}-${r.state_code}`} className="border-slate-100 hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900 text-xs">{r.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium text-xs text-slate-600">{r.state_code || '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-600">{r.enrolled}</TableCell>
                    <TableCell className="text-right text-xs text-slate-600">{r.completed}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={r.completion_pct === 100 ? 'default' : 'secondary'}
                        className="font-medium text-xs"
                      >
                        {r.completion_pct}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

  </>);
}

export function AuthorizationsReport({ authorizations }) {
  return (<>
      {/* Client authorizations */}
      <Card className="overflow-hidden mb-6 border-slate-200">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-900">Client Authorizations</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            {['active', 'expiring_soon', 'expired', 'pending', 'rejected'].map((s) => (
              <Badge key={s} variant="outline" className="text-[11px] font-medium text-slate-600">
                {s.replace('_', ' ')}: {authorizations.summary[s] ?? 0}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {authorizations.rows.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No authorizations" message="No authorizations on record." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-xs font-semibold text-slate-600">Authorization</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Client</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">State</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Start</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">End</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authorizations.rows.map((r) => (
                  <TableRow key={r.id} className="border-slate-100 hover:bg-slate-50">
                    <TableCell className="font-mono text-xs font-medium text-slate-900 whitespace-nowrap">{r.authorization_number || '—'}</TableCell>
                    <TableCell className="font-medium text-slate-900 text-xs">{r.client_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium text-xs text-slate-600">{r.state_code || '—'}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">{fmtDate(r.start_date)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">{fmtDate(r.end_date)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status || 'neutral'} label={r.status ? r.status.replace('_', ' ') : '—'} />
                      <div className="text-[11px] text-slate-500 mt-0.5">{daysLabel(r.days_left)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

  </>);
}

export function SourcesReport({ sources }) {
  return (<>
      {/* Referral sources */}
      <Card className="overflow-hidden mb-6 border-slate-200">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-900">Referral Sources</CardTitle>
          <Badge variant="secondary" className="font-medium text-xs">{sources.total} total</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {sources.rows.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No referrals" message="No referrals recorded yet." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-xs font-semibold text-slate-600">Source</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600">Referrals</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">By State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.rows.map((r) => (
                  <TableRow key={r.source} className="border-slate-100 hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900 text-xs">{r.source}</TableCell>
                    <TableCell className="text-right text-xs font-semibold text-slate-900">{r.count}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(r.states || []).map((s) => (
                          <Badge key={s.code} variant="secondary" className="text-[11px]">
                            {s.code}: {s.count}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

  </>);
}

export function InquiriesReport({ inquiries }) {
  return (<>
      {/* Website inquiries */}
      <Card className="overflow-hidden mb-6 border-slate-200">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-900">Website Inquiries</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            {inquiries.by_state.map((s) => (
              <Badge key={s.code} variant="secondary" className="text-[11px]">
                {s.code}: {s.count}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {inquiries.recent.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No inquiries" message="No website inquiries recorded yet." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-xs font-semibold text-slate-600">Lead</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">State</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Contact</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Received</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.recent.map((r) => (
                  <TableRow key={r.id} className="border-slate-100 hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900 text-xs">
                      {r.first_name} {r.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium text-xs text-slate-600">{r.state_code || '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {r.phone || 'No phone'}
                      {r.email && ` · ${r.email}`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">{fmtDate(r.created_at)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status || 'neutral'} label={r.status || '—'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
  </>);
}
