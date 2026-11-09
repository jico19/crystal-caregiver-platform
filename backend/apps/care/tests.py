from datetime import date
from rest_framework import status
from apps.core.test_utils import BasePlatformTestCase, User
from apps.caregivers.models import Caregiver
from apps.clients.models import Client
from apps.care.models import CarePlan, CareSchedule, CaregiverClientAssignment

class CareTests(BasePlatformTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.fl_admin = User.objects.create_user(
            email="fl.admin@test.com", password="password123",
            role=cls.admin_role, state=cls.fl,
        )
        cls.in_admin = User.objects.create_user(
            email="in.admin@test.com", password="password123",
            role=cls.admin_role, state=cls.in_state,
        )
        cls.cg_user = User.objects.create_user(
            email="cg@test.com", password="password123",
            role=cls.caregiver_role, state=cls.fl,
        )
        cls.caregiver = Caregiver.objects.create(
            id=cls.cg_user, state=cls.fl,
            first_name="Maya", last_name="Rivera",
            phone="555-0101", date_of_birth=date(1990, 5, 1),
        )
        cls.client_user = User.objects.create_user(
            email="client@test.com", password="password123",
            role=cls.client_role, state=cls.fl,
        )
        cls.client = Client.objects.create(
            id=cls.client_user, state=cls.fl,
            first_name="Owen", last_name="Grant",
            date_of_birth=date(1935, 2, 14), status="active",
            phone="555-0202",
        )
        cls.care_plan = CarePlan.objects.create(
            client_id=cls.client_user.id, state=cls.fl,
            primary_nurse="Jane Doe", emergency_protocol="Call 911",
            created_by=cls.super_user,
        )
        cls.schedule = CareSchedule.objects.create(
            client_id=cls.client_user.id, caregiver=cls.caregiver, state=cls.fl,
            day_of_week="Monday", start_time="09:00:00", end_time="11:00:00",
            service="Personal Care",
        )
        cls.assignment = CaregiverClientAssignment.objects.create(
            caregiver=cls.caregiver, client=cls.client,
            role="primary", assigned_by=cls.super_user,
        )

    def test_admin_client_care_operations(self):
        self._login_super()
        base = f"/api/v1/admin/clients/{self.client_user.id}"

        care_plan = self.client.get(f"{base}/care-plan")
        self.assertEqual(care_plan.status_code, status.HTTP_200_OK)
        self.assertIn("care_plan", care_plan.json())
        self.assertEqual(care_plan.json()["care_plan"]["client_id"], str(self.client_user.id))

        schedule = self.client.get(f"{base}/schedule")
        self.assertEqual(schedule.status_code, status.HTTP_200_OK)
        self.assertIn("schedule", schedule.json())
        self.assertEqual(len(schedule.json()["schedule"]), 1)
        self.assertEqual(schedule.json()["schedule"][0]["service"], "Personal Care")

        assignments = self.client.get(f"{base}/assignments")
        self.assertEqual(assignments.status_code, status.HTTP_200_OK)
        self.assertIn("assignments", assignments.json())
        self.assertEqual(len(assignments.json()["assignments"]), 1)

        # Cross-state admin blocked
        self._login("in.admin@test.com")
        self.assertEqual(self.client.get(f"{base}/care-plan").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(f"{base}/schedule").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(f"{base}/assignments").status_code, status.HTTP_403_FORBIDDEN)

    def test_cross_state_assignment_deletion_and_creation_blocked(self):
        in_client_user = User.objects.create_user(
            email="in.client2@test.com", password="password123",
            role=self.client_role, state=self.in_state,
        )
        in_client = Client.objects.create(
            id=in_client_user, state=self.in_state,
            first_name="Indy2", last_name="Client2",
            date_of_birth=date(1942, 2, 2),
        )
        in_cg_user = User.objects.create_user(
            email="in.cg@test.com", password="password123",
            role=self.caregiver_role, state=self.in_state,
        )
        in_cg = Caregiver.objects.create(
            id=in_cg_user, state=self.in_state,
            first_name="Indy", last_name="Caregiver",
        )
        CaregiverClientAssignment.objects.create(
            caregiver=in_cg, client=in_client,
            role="primary", assigned_by=self.super_user,
        )

        # FL admin cannot delete IN assignment
        self._login("fl.admin@test.com")
        del_resp = self.client.delete(f"/api/v1/admin/clients/{in_client_user.id}/assignments/{in_cg_user.id}")
        self.assertEqual(del_resp.status_code, status.HTTP_403_FORBIDDEN)

        # FL admin cannot assign out-of-state (IN) caregiver to FL client
        post_resp = self.client.post(f"/api/v1/admin/clients/{self.client_user.id}/assignments", {
            "caregiver_id": str(in_cg_user.id),
        })
        self.assertEqual(post_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("jurisdiction", post_resp.json()["detail"].lower())

    def test_admin_client_care_plan_not_found_returns_200_none(self):
        # Create a new client without a care plan
        unplanned_user = User.objects.create_user(
            email="unplanned.client@test.com", password="password123",
            role=self.client_role, state=self.fl,
        )
        Client.objects.create(
            id=unplanned_user, state=self.fl,
            first_name="Unplanned", last_name="Client",
            date_of_birth=date(1950, 1, 1),
            status="pending",
        )
        self._login("fl.admin@test.com")
        resp = self.client.get(f"/api/v1/admin/clients/{unplanned_user.id}/care-plan")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json(), {"care_plan": None})

    def test_admin_create_schedule_entry_without_caregiver_uuid_validation(self):
        self._login("fl.admin@test.com")
        resp = self.client.post(
            f"/api/v1/admin/clients/{self.client_user.id}/schedule",
            {
                "day_of_week": "Tuesday",
                "start_time": "10:00:00",
                "end_time": "12:00:00",
                "service_type": "Bathing Support",
                "caregiver_id": "",
                "notes": "Morning assistance",
            },
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.json()
        self.assertIn("schedule", data)
        self.assertEqual(data["schedule"]["client_id"], str(self.client_user.id))
        self.assertIsNone(data["schedule"]["caregiver_id"])
        self.assertEqual(data["schedule"]["service"], "Bathing Support")

    def test_admin_create_schedule_entry_with_assigned_caregiver(self):
        self._login("fl.admin@test.com")
        resp = self.client.post(
            f"/api/v1/admin/clients/{self.client_user.id}/schedule",
            {
                "day_of_week": "Wednesday",
                "start_time": "13:00:00",
                "end_time": "15:00:00",
                "service_type": "Meal Preparation",
                "caregiver_id": str(self.cg_user.id),
                "notes": "Dietary monitoring",
            },
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.json()
        self.assertIn("schedule", data)
        self.assertEqual(data["schedule"]["client_id"], str(self.client_user.id))
        self.assertEqual(data["schedule"]["caregiver_id"], str(self.cg_user.id))

    def test_admin_delete_schedule_entry(self):
        self._login("fl.admin@test.com")
        sched = CareSchedule.objects.create(
            client_id=self.client_user.id,
            state=self.fl,
            day_of_week="Thursday",
            start_time="08:00:00",
            end_time="10:00:00",
            service="Companionship",
        )
        del_resp = self.client.delete(f"/api/v1/admin/clients/{self.client_user.id}/schedule/{sched.id}")
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)

        # Verify soft-deleted
        sched.refresh_from_db()
        self.assertIsNotNone(sched.deleted_at)

        # Repeating delete returns 404
        repeat_resp = self.client.delete(f"/api/v1/admin/clients/{self.client_user.id}/schedule/{sched.id}")
        self.assertEqual(repeat_resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_cross_state_schedule_delete_blocked(self):
        self._login("in.admin@test.com")
        sched = CareSchedule.objects.create(
            client_id=self.client_user.id,
            state=self.fl,
            day_of_week="Friday",
            start_time="09:00:00",
            end_time="11:00:00",
            service="Companionship",
        )
        resp = self.client.delete(f"/api/v1/admin/clients/{self.client_user.id}/schedule/{sched.id}")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


