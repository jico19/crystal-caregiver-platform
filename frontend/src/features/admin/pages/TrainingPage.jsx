import { useState } from 'react';
import { useAuth } from '../../../shared/hooks/useAuth';
import usePaginatedFetch from '../../../shared/hooks/usePaginatedFetch';
import useFetch from '../../../shared/hooks/useFetch';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import FormField from '../../../shared/components/common/FormField';
import Pagination from '../../../shared/components/common/Pagination';
import { api } from '../../../shared/services/api';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function TrainingPage() {
  const { token } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ caregiver_id: '', course_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const {
    items: enrollments,
    total,
    pages,
    page,
    pageSize,
    loading,
    error,
    setPage,
    setPageSize,
    refetch,
  } = usePaginatedFetch({
    url: '/admin/training',
    token,
    params: statusFilter === 'all' ? {} : { status: statusFilter },
    listKey: 'enrollments',
  });

  const { data: coursesData } = useFetch('/training/courses', { enabled: !!token, defaultData: [] });
  const coursesList = coursesData?.courses || (Array.isArray(coursesData) ? coursesData : []);

  const { data: caregiversData } = useFetch('/admin/caregivers', { enabled: !!token, defaultData: [] });
  const caregiversList = caregiversData?.applications || caregiversData?.results || (Array.isArray(caregiversData) ? caregiversData : []);

  async function handleAssignSubmit(e) {
    e.preventDefault();
    if (!assignForm.caregiver_id || !assignForm.course_id) return;
    setSubmitting(true);
    setMessage(null);

    try {
      await api.post('/admin/training', assignForm, token);
      setMessage({ type: 'success', text: 'Training course assigned successfully.' });
      setShowAssignModal(false);
      setAssignForm({ caregiver_id: '', course_id: '' });
      refetch();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to assign training course.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="In-Service Training & Compliance Tracking"
        description="Monitor caregiver course completion, track overdue requirements, and assign mandatory training."
        actions={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
              <SelectTrigger className="h-8 w-40 text-xs bg-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button
              onClick={() => setShowAssignModal(true)}
              size="sm"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Assign Course
            </Button>
          </div>
        }
      />

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={`mb-4 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : ''}`}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4 text-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading training enrollments...</div>
          ) : enrollments.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No training enrollments found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/50">
                  <TableHead className="text-xs font-semibold text-slate-600">Caregiver</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Course Name</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Enrolled At</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Completed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enr) => {
                  const caregiver = enr.caregivers || {};
                  const course = enr.training_courses || {};
                  const cgName = caregiver.first_name ? `${caregiver.first_name} ${caregiver.last_name}` : 'Caregiver';

                  return (
                    <TableRow key={enr.id} className="border-slate-100 hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-900 text-xs">
                        {cgName}
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        {course.name || 'Training Course'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={enr.status || 'not_started'}
                          label={enr.status ? enr.status.replace('_', ' ') : 'not started'}
                        />
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                        {enr.enrolled_at ? new Date(enr.enrolled_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                        {enr.completed_at ? new Date(enr.completed_at).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="p-4 border-t border-slate-100">
            <Pagination
              page={page}
              pages={pages}
              total={total}
              pageSize={pageSize}
              listLabel="enrollments"
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Training Course</DialogTitle>
            <DialogDescription>
              Assign a mandatory compliance course to a registered caregiver.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignSubmit}>
            <div className="flex flex-col gap-4 py-4">
              <FormField label="Caregiver" required htmlFor="assign-caregiver">
                <Select
                  value={assignForm.caregiver_id}
                  onValueChange={(val) => setAssignForm((f) => ({ ...f, caregiver_id: val }))}
                >
                  <SelectTrigger id="assign-caregiver" className="w-full text-xs">
                    <SelectValue placeholder="-- Choose Caregiver --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {caregiversList.map((app) => {
                        const cg = app.caregivers || {};
                        const cid = String(app.caregiver_id || cg.id || app.id || '');
                        if (!cid) return null;
                        const cgName = cg.first_name
                          ? `${cg.first_name} ${cg.last_name}`
                          : [app.first_name, app.last_name].filter(Boolean).join(' ') || 'Applicant';
                        return (
                          <SelectItem key={app.id} value={cid}>
                            {cgName} ({app.states?.code || app.state_code || 'FL'})
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Course" required htmlFor="assign-course">
                <Select
                  value={assignForm.course_id}
                  onValueChange={(val) => setAssignForm((f) => ({ ...f, course_id: val }))}
                >
                  <SelectTrigger id="assign-course" className="w-full text-xs">
                    <SelectValue placeholder="-- Choose Course --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {coursesList.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} ({c.duration_hours}h)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !assignForm.caregiver_id || !assignForm.course_id}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? 'Assigning...' : 'Assign Course'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
