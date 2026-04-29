# from django.contrib import admin
from django.contrib import admin

from .models import BatchAddress, BatchEmail, CurrentEmailStatus, EmailRecord

admin.site.register(BatchEmail)
admin.site.register(EmailRecord)
admin.site.register(BatchAddress)
admin.site.register(CurrentEmailStatus)
# Register your models here.
