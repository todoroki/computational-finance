from binascii import a2b_hex, b2a_hex

from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.db import models

# Create your models here.


class HexEncodedField(models.TextField):
    """A custom field that stores binary data as a hex-encoded string."""

    def from_db_value(self, value, expression, connection):
        if value is None:
            return None
        return a2b_hex(value)

    def to_python(self, value):
        if isinstance(value, bytes):
            return value
        if value is None:
            return None
        return a2b_hex(value)

    def get_prep_value(self, value):
        if value is None:
            return None
        return b2a_hex(value).decode("utf-8")


class EmailStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SENT = "sent", "Sent"
    FAILED = "failed", "Failed"
    RETRY = "retry", "Retry"
    DELIVERED = "delivered", "Delivered"
    BOUNCED = "bounced", "Bounced"


class Purpose(models.TextChoices):
    TRANSACTIONAL = "transactional", "Transactional"
    MARKETING = "marketing", "Marketing"
    NOTIFICATION = "notification", "Notification"
    # PURPOSE_CHOICES = [
    #     ("notification", "Notification"),
    #     ("marketing", "Marketing"),
    #     ("transactional", "Transactional"),
    # ]


# choices=[
#     ("to", "To"),
#     ("cc", "Cc"),
#     ("bcc", "Bcc"),
#     ("reply_to", "Reply-To"),
# ],


class AddressType(models.TextChoices):
    TO = "to", "To"
    CC = "cc", "Cc"
    BCC = "bcc", "Bcc"
    FROM = "from", "From"
    REPLY_TO = "reply_to", "Reply-To"


class BatchEmail(models.Model):
    user = models.ForeignKey(get_user_model(), related_name="batch_emails", null=True, blank=True, on_delete=models.SET_NULL)

    subject = models.CharField(max_length=256, blank=True)
    content_html = models.TextField(default="")
    content_text = models.TextField(blank=True)
    purpose = models.CharField(max_length=32, choices=Purpose.choices, blank=True)

    create_time = models.DateTimeField(auto_now_add=True)
    dispatch_time = models.DateTimeField(null=True, blank=True)
    addresses: models.Manager["BatchAddress"]
    attachments: models.Manager["BatchEmailAttachment"]
    records: models.Manager["EmailRecord"]

    def __str__(self):
        return f"pk: {self.pk} subject: {self.subject} dispatch_time: {self.dispatch_time}"


class BatchAddress(models.Model):  # または Recipient, EmailRecipient
    batch_email = models.ForeignKey(BatchEmail, on_delete=models.CASCADE, related_name="addresses")
    type = models.CharField(
        max_length=16,
        choices=AddressType.choices,
        default=AddressType.TO,
    )
    address = models.EmailField(max_length=254)
    name = models.CharField(max_length=128, blank=True)
    create_time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_type_display()}: {self.name or self.address}"


class BatchEmailAttachment(models.Model):
    batch_email = models.ForeignKey(BatchEmail, on_delete=models.CASCADE, related_name="attachments")
    file_name = models.CharField(max_length=256)
    file_url = models.URLField()
    file_type = models.CharField(max_length=128)
    create_time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_name


class EmailRecord(models.Model):
    batch_email = models.ForeignKey(BatchEmail, related_name="records", on_delete=models.CASCADE)

    status = models.CharField(
        max_length=32,
        choices=EmailStatus.choices,
        default=EmailStatus.PENDING,
    )
    attempt_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    create_time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.status} ({self.create_time})"


class CurrentEmailStatus(models.Model):
    email_record = models.OneToOneField(EmailRecord, on_delete=models.CASCADE, related_name="current_status")
    batch_email = models.OneToOneField(BatchEmail, on_delete=models.CASCADE, related_name="current_status")

    updated_time = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"mail_pk: {self.batch_email.pk} and status: ({self.email_record.status})"
