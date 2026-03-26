from django.db import models
from company.models import Guard, Company

# Create your models here.
class Attendance(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
    ]

    date = models.DateField()
    guard = models.ForeignKey(Guard, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.guard.name} - {self.status}"