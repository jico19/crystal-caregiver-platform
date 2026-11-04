from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory

from django.core.management import call_command, CommandError

from apps.core.test_utils import BasePlatformTestCase, User
from apps.core.management.commands.seed_test_accounts import account_definitions
from apps.caregivers.models import Caregiver
from apps.clients.models import Client


class TestAccountSeedTests(BasePlatformTestCase):
    def setUp(self):
        super().setUp()
        temporary = TemporaryDirectory(prefix="caregiver-credentials-test-")
        self.addCleanup(temporary.cleanup)
        self.path = Path(temporary.name) / "TEST_ACCOUNTS.md"

    def seed(self):
        call_command("seed_test_accounts", credentials_file=str(self.path), stdout=StringIO())

    def test_all_roles_have_active_accounts_and_correct_profiles(self):
        original_password = self.super_user.password
        self.seed()
        self.assertTrue(self.path.exists())
        for email, role, code in account_definitions():
            user = User.objects.select_related("role", "state").get(email=email)
            self.assertEqual(user.role.name, role)
            self.assertEqual(user.state.code if user.state else None, code)
            self.assertTrue(user.is_authenticated_and_active)
            if role == "caregiver":
                self.assertEqual(Caregiver.objects.get(pk=user.pk).state_id, user.state_id)
            if role == "client":
                self.assertEqual(Client.objects.get(pk=user.pk).state_id, user.state_id)
        self.super_user.refresh_from_db()
        self.assertEqual(self.super_user.password, original_password)

    def test_repeated_seed_preserves_passwords_profiles_and_file(self):
        self.seed()
        before = dict(User.objects.values_list("email", "password"))
        content = self.path.read_bytes()
        self.seed()
        self.assertEqual(dict(User.objects.values_list("email", "password")), before)
        self.assertEqual(self.path.read_bytes(), content)

    def test_account_collision_preserves_existing_identity_and_creates_nothing(self):
        existing = User.objects.create_user(email="qa.superadmin@example.test", role=self.caregiver_role, state=self.fl)
        count = User.objects.count()
        with self.assertRaises(CommandError):
            self.seed()
        self.assertEqual(User.objects.count(), count)
        self.assertFalse(self.path.exists())
        existing.refresh_from_db()
        self.assertEqual(existing.role_id, self.caregiver_role.pk)
