from datetime import date, timedelta
from rest_framework import status
from apps.core.test_utils import BasePlatformTestCase, User
from apps.caregivers.models import Caregiver
from apps.training.models import TrainingCourse, TrainingEnrollment

class TrainingTests(BasePlatformTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
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
        cls.course = TrainingCourse.objects.create(
            name="OSHA Safety Training", validity_months=12,
        )
        cls.enrollment = TrainingEnrollment.objects.create(
            course=cls.course, caregiver=cls.caregiver,
            status="in_progress", due_at=date.today() + timedelta(days=60),
        )

    def test_admin_training_list_and_create(self):
        self._login_super()
        resp = self.client.get("/api/v1/admin/training")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        body = resp.json()
        results = body.get("results")
        if results is None:
            results = body
        self.assertTrue(any(r["caregivers"]["id"] == str(self.cg_user.id) for r in results))

        # Create a new enrollment for a second course
        course2 = TrainingCourse.objects.create(name="HIPAA Refresher", validity_months=24)
        create_resp = self.client.post("/api/v1/admin/training", {
            "caregiver_id": str(self.cg_user.id),
            "course_id": course2.id,
        })
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_resp.json()["status"], "in_progress")

        # Cross-state admin blocked from enrolling an FL caregiver
        self._login("in.admin@test.com")
        resp = self.client.post("/api/v1/admin/training", {
            "caregiver_id": str(self.cg_user.id),
            "course_id": course2.id,
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
