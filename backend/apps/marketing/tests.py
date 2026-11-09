from rest_framework import status
from apps.core.test_utils import BasePlatformTestCase

class MarketingPublicTests(BasePlatformTestCase):
    def test_public_states_and_marketing(self):
        resp = self.client.get("/api/v1/states/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.json()), 3)

        fl_resp = self.client.get("/api/v1/states/florida/")
        self.assertEqual(fl_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(fl_resp.json()["state"]["code"], "FL")

        services_resp = self.client.get("/api/v1/states/florida/services/")
        self.assertEqual(services_resp.status_code, status.HTTP_200_OK)

        contact_resp = self.client.post("/api/v1/states/florida/contact/", {
            "first_name": "Jane",
            "last_name": "Smith",
            "phone": "555-123-4567",
            "email": "jane@example.com",
            "notes": "Interested in companion care.",
        })
        self.assertEqual(contact_resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("referral_id", contact_resp.json())
