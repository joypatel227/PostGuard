import getpass
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Create the Lord (super-admin) account for PostGuard"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("=== PostGuard Lord Account Creation ==="))

        email = input("Email: ").strip()
        name = input("Name: ").strip()
        phone = input("Phone: ").strip()
        password = getpass.getpass("Password: ")
        confirm = getpass.getpass("Confirm Password: ")

        if password != confirm:
            self.stderr.write(self.style.ERROR("Passwords do not match."))
            return

        if User.objects.filter(email=email).exists():
            self.stderr.write(self.style.ERROR(f"User with email '{email}' already exists."))
            return

        user = User.objects.create_superuser(
            email=email,
            name=name,
            phone=phone,
            password=password,
            role="lord",
            status="approved",
            is_staff=True,
            is_superuser=True,
        )

        self.stdout.write(
            self.style.SUCCESS(f"Lord account created successfully: {user.email}")
        )
