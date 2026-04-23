import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

users = [
    {
        'email': 'lord@gmail.com',
        'name': 'Lord',
        'phone': '9000000001',
        'password': 'qwerty123@',
        'role': 'lord',
        'is_staff': True,
        'is_superuser': True,
    },
    {
        'email': 'admin@gmail.com',
        'name': 'Admin',
        'phone': '9000000002',
        'password': 'qwerty123@',
        'role': 'admin',
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'email': 'supervisor@gmail.com',
        'name': 'Supervisor',
        'phone': '9000000003',
        'password': 'qwerty123@',
        'role': 'supervisor',
        'is_staff': False,
        'is_superuser': False,
    },
]

for u in users:
    if User.objects.filter(email=u['email']).exists():
        print(f"  Already exists: {u['email']}")
        continue
    User.objects.create_user(
        email=u['email'],
        name=u['name'],
        phone=u['phone'],
        password=u['password'],
        role=u['role'],
        status='approved',
        is_staff=u['is_staff'],
        is_superuser=u['is_superuser'],
    )
    print(f"  Created {u['role']}: {u['email']}")

print("Done!")
