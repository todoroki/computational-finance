# mailer/utils.py
import logging
import os
from dataclasses import dataclass
from email.message import EmailMessage as RawEmailMessage
from email.utils import formataddr
from typing import List, Optional

import boto3
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


@dataclass
class MailManAttachmentFile:
    url: str
    filename: str
    filetype: str


@dataclass
class MailManAddress:
    email: str
    name: Optional[str] = None


# settings.pyで明示的にUSE_RAW_SES=Trueとしない限りはDjango標準を使う安全な設計
USE_DJANGO_EMAIL = getattr(settings, "USE_DJANGO_EMAIL", True)


class MailMan:
    def __init__(
        self,
        from_address: MailManAddress,
        to_addresses: List[MailManAddress],
        subject: str,
        body_html: str,
        body_text: Optional[str] = None,
        attachments: List[MailManAttachmentFile] = None,
        replyto_addresses: List[MailManAddress] = None,
        cc_addresses: List[MailManAddress] = None,
        bcc_addresses: List[MailManAddress] = None,
    ):
        self.from_address = from_address
        self.to_addresses = to_addresses or []
        self.bcc_addresses = bcc_addresses or []
        self.cc_addresses = cc_addresses or []
        self.replyto_addresses = replyto_addresses or []
        self.subject = subject
        self.attachments = attachments or []

        if USE_DJANGO_EMAIL:
            self.django_email = EmailMultiAlternatives(
                subject=subject,
                body=body_text if body_text else strip_tags(body_html),
                alternatives=[(body_html, "text/html")],
                from_email=self._format_single_address(from_address),
                to=self._format_address(self.to_addresses),
                cc=self._format_address(self.cc_addresses),
                bcc=self._format_address(self.bcc_addresses),
                reply_to=self._format_address(self.replyto_addresses),
            )
            if self.attachments:
                self._add_attachment(self.attachments)
        else:
            self.raw_email = RawEmailMessage()
            self.raw_email["Subject"] = subject
            self.raw_email["From"] = self._format_single_address(from_address)
            self.raw_email["To"] = self._format_address(self.to_addresses)

            if self.cc_addresses:
                self.raw_email["Cc"] = self._format_address(self.cc_addresses)
            if self.bcc_addresses:
                self.raw_email["Bcc"] = self._format_address(self.bcc_addresses)
            if self.replyto_addresses:
                self.raw_email["Reply-To"] = self._format_address(
                    self.replyto_addresses
                )

            if body_text:
                self.raw_email.set_content(body_text, subtype="plain")
                self.raw_email.add_alternative(body_html, subtype="html")
            else:
                self.raw_email.set_content(body_html, subtype="html")

            if self.attachments:
                self._add_attachment(self.attachments)

    @staticmethod
    def _format_address(addresses: List[MailManAddress]) -> List[str]:
        if not addresses:
            return []
        return [MailMan._format_single_address(addr) for addr in addresses]

    @staticmethod
    def _format_single_address(address: MailManAddress) -> str:
        if address.name:
            return formataddr((address.name, address.email))
        return address.email

    def _add_attachment(self, attachments: List[MailManAttachmentFile]) -> None:
        for attachment in attachments:
            path, name, mimetype = (
                attachment.url,
                attachment.filename,
                attachment.filetype,
            )
            with default_storage.open(path, "rb") as saved_file:
                file_content = saved_file.read()
                main_type, sub_type = mimetype.split("/", 1)

                if USE_DJANGO_EMAIL:
                    self.django_email.attach(
                        filename=os.path.basename(name),
                        content=file_content,
                        mimetype=mimetype,
                    )
                else:
                    self.raw_email.add_attachment(
                        file_content,
                        maintype=main_type,
                        subtype=sub_type,
                        filename=os.path.basename(name),
                    )

    def send(self) -> int:
        if not self.to_addresses and not self.bcc_addresses and not self.cc_addresses:
            logger.error("No recipients specified")
            return -1

        if USE_DJANGO_EMAIL:
            try:
                # 成功した場合は送信したメッセージの数(1)が返る
                return self.django_email.send()
            except Exception as e:
                logger.exception("Failed to send email via Django backend")
                return -1
        else:
            logger.info("Connecting to SES via boto3...")
            ses_client = boto3.client(
                "ses",
                aws_access_key_id=settings.AWS_SES_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SES_SECRET_ACCESS_KEY,
                region_name=settings.AWS_SES_REGION_NAME,
            )

            try:
                response = ses_client.send_raw_email(
                    Source=self.from_address.email,
                    Destinations=list(
                        set(
                            [addr.email for addr in self.to_addresses]
                            + [addr.email for addr in self.bcc_addresses]
                            + [addr.email for addr in self.cc_addresses]
                        )
                    ),
                    RawMessage={"Data": self.raw_email.as_bytes()},
                )
                logger.info(f"Email sent via SES! Message ID: {response['MessageId']}")
                return 1
            except Exception as e:
                logger.exception("Failed to send email via Boto3 SES")
                return -1
