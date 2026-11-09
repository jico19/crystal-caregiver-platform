import { Search, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STATUS_CONFIG } from './referralConfig';

export default function ReferralToolbar({
  searchQuery,
  setSearchQuery,
  filterState,
  setFilterState,
  isSuperAdminUser,
  states,
  viewMode,
  filterStatus,
  setFilterStatus,
  filterUnassigned,
  setFilterUnassigned,
  hasActiveFilters,
  handleResetFilters,
  visibleCount,
  total,
}) {
  return (
    <Card className="p-2.5 mb-5 border-slate-200 shadow-2xs bg-slate-50/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Instant Search Bar */}
          <div className="relative min-w-[220px] max-w-xs">
            <Search
              size={13}
              aria-hidden="true"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              type="text"
              aria-label="Search leads by name, phone, email"
              placeholder="Search leads by name, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs"
            />
          </div>

          {/* Jurisdiction Dropdown */}
          <Select
            value={filterState}
            onValueChange={(val) => {
              setFilterState(val);
            }}
          >
            <SelectTrigger className="h-8 w-40 text-xs bg-white border-slate-200">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {isSuperAdminUser && (
                  <SelectItem value="all">All Jurisdictions</SelectItem>
                )}
                {states.map((st) => (
                  <SelectItem key={st.id} value={String(st.id)}>
                    {st.name} ({st.code})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Stage Dropdown (Table view) */}
          {viewMode === 'table' && (
            <Select
              value={filterStatus}
              onValueChange={(val) => {
                setFilterStatus(val);
              }}
            >
              <SelectTrigger className="h-8 w-36 text-xs bg-white border-slate-200">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Stages</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                    <SelectItem key={k} value={k}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}

          {/* Unassigned Filter Checkbox */}
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer border border-slate-200 rounded-md px-2.5 py-1.5 bg-white hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={filterUnassigned}
              onChange={(e) => setFilterUnassigned(e.target.checked)}
              className="accent-slate-900 size-3.5"
            />
            Unassigned Only
          </label>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 text-xs text-slate-500 hover:text-slate-900 gap-1 px-2"
            >
              <RotateCcw size={12} /> Reset
            </Button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium whitespace-nowrap self-center">
          Showing{' '}
          <strong className="text-slate-900 tabular-nums">
            {visibleCount}
          </strong>{' '}
          of <strong className="text-slate-900 tabular-nums">{total}</strong>{' '}
          leads
        </div>
      </div>
    </Card>
  );
}
