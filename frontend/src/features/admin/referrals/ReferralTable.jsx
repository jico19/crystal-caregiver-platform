import { Link } from 'react-router-dom';
import { ArrowRight, Phone, Mail, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Pagination from '@/shared/components/common/Pagination';
import EmptyState from '@/shared/components/common/EmptyState';
import { STATUS_CONFIG, STATE_BADGE_STYLES } from './referralPresentation';

export default function ReferralTable({ loading, referrals: filteredReferrals, updatingId, onStatusChange: handleStatusSelect, onOpenNotes, pagination }) {
  const { page, pages, total, pageSize, setPage, setPageSize } = pagination;
  return (
        /* Roster Table View */
        <Card className="border-slate-200 overflow-hidden shadow-2xs bg-white">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading referrals roster...</div>
            ) : filteredReferrals.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No referrals found"
                  description="Adjust your search query or filter parameters."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/75">
                    <TableHead className="text-xs font-semibold text-slate-700">Client Lead</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Jurisdiction</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Stage</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Source</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Contact</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Intake Notes</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((r) => {
                    const stCode = r.states?.code || r.state_code || 'FL';
                    const badgeClass = STATE_BADGE_STYLES[stCode] || 'bg-slate-50 text-slate-700 border-slate-200';
                    return (
                      <TableRow key={r.id} className="border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-semibold text-slate-900 text-xs">
                          {r.first_name} {r.last_name}
                          <div className="text-[10px] text-slate-400 font-normal">
                            Recv: {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-semibold border ${badgeClass}`}>
                            {stCode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={r.status}
                            onValueChange={(val) => handleStatusSelect(r, val)}
                            disabled={updatingId === r.id}
                          >
                            <SelectTrigger className="h-7 w-32 text-[11px] bg-white border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                                  <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                            {r.referral_source || 'Website'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          <div className="flex flex-col gap-0.5">
                            {r.phone && (
                              <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 text-slate-700 hover:text-emerald-700">
                                <Phone size={10} className="text-slate-400" /> {r.phone}
                              </a>
                            )}
                            {r.email && (
                              <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-700 text-[11px]">
                                <Mail size={10} className="text-slate-400" /> {r.email}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                          {r.handled_notes || <span className="text-slate-300 italic">No notes</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenNotes(r)}
                              className="h-7 text-xs border-slate-200 hover:bg-slate-50"
                            >
                              <FileText size={11} className="mr-1" /> Notes
                            </Button>
                            {r.status === 'converted' && r.converted_client_id && (
                              <Button variant="outline" size="sm" asChild className="h-7 text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                                <Link to={`/admin/clients/${r.converted_client_id}`}>
                                  Client <ArrowRight size={10} className="ml-1" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            <div className="p-3 border-t border-slate-100">
              <Pagination
                page={page}
                pages={pages}
                total={total}
                pageSize={pageSize}
                listLabel="referrals"
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </CardContent>
        </Card>
  );
}
