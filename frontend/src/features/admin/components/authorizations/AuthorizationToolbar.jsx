import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AuthorizationToolbar({
  searchTerm,
  onSearchChange,
  onClearSearch,
  filterState,
  onFilterStateChange,
  filterStatus,
  onFilterStatusChange,
  sortBy,
  onSortByChange,
  hasActiveFilters,
  onResetFilters,
  filteredCount,
  totalCount,
  stateOptions = [
    { value: 'all', label: 'All States' },
    { value: 'FL', label: 'Florida (FL)' },
    { value: 'IN', label: 'Indiana (IN)' },
    { value: 'GA', label: 'Georgia (GA)' },
  ],
}) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm p-4 mb-6">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative min-w-[280px] flex-1 max-w-md">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by Auth #, Client name, Medicaid #..."
              className="h-8 pr-8 text-xs bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters & Sort */}
          <div className="flex flex-wrap items-center gap-2">
            {/* State filter */}
            <Select value={filterState} onValueChange={onFilterStateChange}>
              <SelectTrigger className="h-8 text-xs w-36 bg-white">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                {stateOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={filterStatus} onValueChange={onFilterStatusChange}>
              <SelectTrigger className="h-8 text-xs w-44 bg-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="active" className="text-xs">Active Only</SelectItem>
                <SelectItem value="expiring_soon" className="text-xs">Expiring Soon (≤30d)</SelectItem>
                <SelectItem value="expired" className="text-xs">Expired</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort order */}
            <Select value={sortBy} onValueChange={onSortByChange}>
              <SelectTrigger className="h-8 text-xs w-52 bg-white">
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="end_date_asc" className="text-xs">Expiration: Soonest First</SelectItem>
                <SelectItem value="end_date_desc" className="text-xs">Expiration: Latest First</SelectItem>
                <SelectItem value="created_desc" className="text-xs">Recently Issued</SelectItem>
                <SelectItem value="client_name" className="text-xs">Client Name (A–Z)</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="h-8 text-xs text-slate-600 hover:text-slate-900"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        {/* Results counter */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-900">{filteredCount}</strong> of <strong className="text-slate-900">{totalCount}</strong> authorization{totalCount === 1 ? '' : 's'}
          </span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="font-medium text-[11px]">
              Filtered view active
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
