import random
from django.core.cache import cache

def generate_otp(phone):
    otp = str(random.randint(100000, 999999))
    # Store OTP in cache for 5 minutes
    cache.set(f"otp_{phone}", otp, timeout=300)
    # In a real SaaS, we would send this via SMS API (e.g. Twilio)
    print(f"DEBUG: SMS OTP for {phone} is {otp}")
    return otp

def verify_otp(phone, otp_input):
    stored_otp = cache.get(f"otp_{phone}")
    return stored_otp == otp_input
