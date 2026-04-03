import random
import time

# In-memory OTP store: { phone: (otp_code, expires_at) }
# In production replace with Django cache (Redis/Memcache)
_otp_store: dict = {}

OTP_EXPIRY_SECONDS = 300  # 5 minutes


def generate_otp(phone: str) -> str:
    """Generate a 6-digit OTP, store it, print to console, return it."""
    otp = str(random.randint(100000, 999999))
    _otp_store[phone] = (otp, time.time() + OTP_EXPIRY_SECONDS)

    # ── Dev mode: print to Django console ─────────────────────────────────
    print(f"\n{'='*50}")
    print(f"  📱 OTP for {phone}:  {otp}")
    print(f"  (Valid for 5 minutes)")
    print(f"{'='*50}\n")
    # ──────────────────────────────────────────────────────────────────────

    # To use a REAL SMS provider, replace the print above with:
    # Twilio: client.messages.create(to=phone, from_=FROM, body=f'PostGuard OTP: {otp}')
    # Fast2SMS: requests.post('https://www.fast2sms.com/dev/bulkV2', ...)

    return otp


def verify_otp(phone: str, otp_input: str) -> bool:
    """Return True if OTP matches and hasn't expired. Clears on success."""
    entry = _otp_store.get(phone)
    if not entry:
        return False
    stored_otp, expires_at = entry
    if time.time() > expires_at:
        _otp_store.pop(phone, None)
        return False
    if stored_otp != str(otp_input).strip():
        return False
    _otp_store.pop(phone, None)  # single-use
    return True
