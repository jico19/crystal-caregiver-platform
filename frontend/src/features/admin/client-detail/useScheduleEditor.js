import { useState } from 'react';
import { addScheduleSlotApi, deleteScheduleSlotApi } from './clientDetailService';
import { validateTimeRange } from '@/shared/utils/validation';

export function useScheduleEditor({ id, token, setSchedule, refreshDetail, setErrorMsg, setSuccessMsg }) {
  // Schedule form state
  const [schedDay, setSchedDay] = useState('Monday');
  const [schedStart, setSchedStart] = useState('09:00');
  const [schedEnd, setSchedEnd] = useState('13:00');
  const [schedService, setSchedService] = useState('');
  const [schedCustomService, setSchedCustomService] = useState('');
  const [schedStatus, setSchedStatus] = useState('scheduled');
  const [schedNotes, setSchedNotes] = useState('');
  const [addingSched, setAddingSched] = useState(false);

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    const serviceName = schedService === 'other' ? schedCustomService.trim() : schedService;
    if (!serviceName) {
      setErrorMsg('Please specify a service type.');
      return;
    }
    const timeCheck = validateTimeRange(schedStart, schedEnd);
    if (!timeCheck.valid) {
      setErrorMsg(timeCheck.error);
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setAddingSched(true);
    try {
      const res = await addScheduleSlotApi(
        id,
        {
          day_of_week: schedDay,
          start_time: schedStart,
          end_time: schedEnd,
          service_type: serviceName,
          status: schedStatus,
          notes: schedNotes.trim() || null,
        },
        token
      );
      if (Array.isArray(res?.schedule)) {
        setSchedule(res.schedule);
      } else if (res?.schedule) {
        setSchedule((prev) => [...prev, res.schedule]);
      }
      setSuccessMsg('Schedule slot added.');
      setSchedNotes('');
      setSchedCustomService('');
      await refreshDetail();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to add schedule slot.');
    } finally {
      setAddingSched(false);
    }
  };

  const handleDeleteSchedule = async (target) => {
    const scheduleId = typeof target === 'object' && target !== null ? target.id : target;
    if (!scheduleId) return;
    if (!window.confirm('Remove this schedule slot?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await deleteScheduleSlotApi(id, scheduleId, token);
      setSchedule((prev) => prev.filter((item) => item.id !== scheduleId));
      setSuccessMsg('Schedule slot removed.');
      await refreshDetail();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to remove schedule slot.');
    }
  };

  return {
    schedDay,
    setSchedDay,
    schedStart,
    setSchedStart,
    schedEnd,
    setSchedEnd,
    schedService,
    setSchedService,
    schedCustomService,
    setSchedCustomService,
    schedStatus,
    setSchedStatus,
    schedNotes,
    setSchedNotes,
    addingSched,
    handleAddSchedule,
    handleDeleteSchedule,
  };
}
