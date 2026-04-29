import random

from webapps.models import JobCurrentState, State
from webapps.utils.email_utils import MailMan, MailManAddress
from webapps.utils.model_utils import update_job_state

from django.core.mail import EmailMessage  # , send_mail
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        # send_fax_failure_mail(MyUser.objects.get(pk=1), "0422222222", 4, "残高不足")

        for job_current_state in JobCurrentState.objects.filter(job_state__name=State.SENDING):
            job = job_current_state.job

            update_job_state(job, State.DISPATCHED, message="manually created")

        # send_fax_success_mail(
        #     MyUser.objects.get(pk=1), "0422222222", 4, "fax/root/imfax/pdf/2025/1/2025_01_06_15_58_08_101079.pdf"
        # )

        # html_content = render_to_string("emails/welcome_email.html", {"user": MyUser.objects.get(pk=1)})
        # bmail = BatchEmail.objects.create(subject=f"test {uuid.uuid4().hex}", content_html=html_content)
        # bmail.addresses.create(type=AddressType.TO, address="todoroki@octopt.com", name="Todoroki")
        # bmail.addresses.create(type=AddressType.FROM, address="support@iamfax.com", name="support")
        # print(BatchEmail.objects.filter(records__isnull=True))

        return
        if True:
            MailMan(
                from_address=MailManAddress("support@iamfax.com", "iamfax support team"),
                to_addresses=[
                    MailManAddress("todoroki@octopt.com", "Todoroki"),
                    MailManAddress("yasu.todo+foo@gmail.com", "foo"),
                ],
                cc_addresses=[
                    MailManAddress("yasu.todo+cc1@gmail.com", "cc test 1"),
                    MailManAddress("yasu.todo+cc2@gmail.com", "cc test 2"),
                ],
                bcc_addresses=[
                    MailManAddress("yasu.todo+bcc1@gmail.com", "bcc test1"),
                    MailManAddress("yasu.todo+bcc1@gmail.com", "bcc test2"),
                ],
                replyto_addresses=[MailManAddress("yasu.todo@gmail.com", "reply me")],
                subject="django with ses test " + str(random.randint(1, 10000)),
                body_html="<h1>hello</h1><br><p>This is a test email</p>",
            ).send()
        else:
            print("hello")
            # send_mail(
            #     "Subject here",
            #     "Here is the message.",
            #     "support@iamfax.com",
            #     ["yasu.todo@gmail.com", "todoroki@octopt.com"],
            #     fail_silently=False,
            # )

            email = EmailMessage(
                subject="Subject here",
                body="Here is the message.",
                from_email="support@iamfax.com",
                to=["todoroki@octopt.com"],
                bcc="yasu.todo@gmail.com6, yasu.todo+bcc1@gmail.com",
            )

            path = "fax/root/imfax/pdf/2025/1/2025_01_06_15_58_08_101079.pdf"
            mimetype = "application/pdf"
            filename = "foobar.pdf"

            # with default_storage.open(path, "rb") as saved_file:
            #     file_content = saved_file.read()
            #     email.attach(filename=filename, content=file_content, mimetype=mimetype)
            #     email.send()

            pass
