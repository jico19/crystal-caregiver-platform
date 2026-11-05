import AdmissionDecisionSection from './AdmissionDecisionSection';
import CarePlanSection from './CarePlanSection';
import CaregiverAssignmentsSection from './CaregiverAssignmentsSection';
import ScheduleSection from './ScheduleSection';
import { useAdmissionEditor } from './useAdmissionEditor';
import { useAssignmentEditor } from './useAssignmentEditor';
import { useScheduleEditor } from './useScheduleEditor';
import { useCarePlanManagement } from './useCarePlanManagement';

// Each controller belongs to one editor. A server refresh does not initialize other drafts again.
export function AdmissionDecisionSectionEditor({ client, ...actions }) {
  const editor = useAdmissionEditor({ client, ...actions });
  return <AdmissionDecisionSection client={client} {...editor} />;
}

export function ScheduleSectionEditor({ schedule, ...actions }) {
  const editor = useScheduleEditor(actions);
  return <ScheduleSection schedule={schedule} {...editor} />;
}

export function CaregiverAssignmentsSectionEditor({ assignments, availableCaregivers, isSuperAdmin, ...actions }) {
  const editor = useAssignmentEditor(actions);
  return <CaregiverAssignmentsSection assignments={assignments} availableCaregivers={availableCaregivers}
    isSuperAdmin={isSuperAdmin} {...editor} />;
}

export function CarePlanSectionEditor({ initialPlan, id, token, setErrorMsg, setSuccessMsg, refreshDetail }) {
  const { handleSavePlan, ...editor } = useCarePlanManagement(id, token, setErrorMsg, setSuccessMsg, initialPlan);
  return <CarePlanSection {...editor} handleSavePlan={event => handleSavePlan(event, refreshDetail)} />;
}
