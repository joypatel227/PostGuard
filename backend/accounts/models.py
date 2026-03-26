from django.db import models

# Create your models here.
from django.db import models
from company.models import Company
class User(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('supervisor', 'Supervisor'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, unique=True)

    company = models.ForeignKey('company.Company', on_delete=models.CASCADE)

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    def __str__(self):
        return f"{self.name} - {self.role} ({self.status})"