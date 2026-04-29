# import logging
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

# from email.header import Header
from time import sleep
from typing import List
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.db.models import Q
from mailer.models import AddressType, BatchEmail, CurrentEmailStatus, EmailStatus
from mailer.utils import MailMan, MailManAddress, MailManAttachmentFile

# MAXIMUM_SEND_MESSAGES_PER_SECOND = 5

logger = logging.getLogger("iamfax")


def update_email_state(batch_email: BatchEmail, status: str) -> None:
    logger.info(f"Updating email {batch_email.id} state to {status}")

    with transaction.atomic():
        record = batch_email.records.create(status=status)
        CurrentEmailStatus.objects.update_or_create(
            batch_email=batch_email, defaults={"email_record": record}
        )


def send_email(batch_email: BatchEmail):
    """メールを送信し、送信結果をデータベースに記録する。"""
    try:
        # メール内容の準備
        cc: List[MailManAddress] = []
        bcc: List[MailManAddress] = []
        to: List[MailManAddress] = []
        reply_to: List[MailManAddress] = []  # Optional[MailManAddress] = None
        _from: MailManAddress | None = None

        for address in batch_email.addresses.all():
            if address.type == AddressType.TO:
                to.append(MailManAddress(email=address.address, name=address.name))
            elif address.type == AddressType.CC:
                cc.append(MailManAddress(address.address, address.name))
            elif address.type == AddressType.BCC:
                bcc.append(MailManAddress(address.address, address.name))
            elif address.type == AddressType.REPLY_TO:
                reply_to.append(MailManAddress(address.address, address.name))
            elif address.type == AddressType.FROM:
                _from = MailManAddress(address.address, address.name)

        if _from and to:
            # メール送信
            attachments: List[MailManAttachmentFile] = []
            for attachment in batch_email.attachments.all():
                attachments.append(
                    MailManAttachmentFile(
                        url=attachment.file_url,
                        filename=attachment.file_name,
                        filetype=attachment.file_type,
                    )
                )

            email = MailMan(
                from_address=_from,
                to_addresses=to,
                subject=batch_email.subject,
                body_html=batch_email.content_html,
                body_text=batch_email.content_text,
                cc_addresses=cc,
                bcc_addresses=bcc,
                replyto_addresses=reply_to,
                attachments=attachments,
            )
            response = email.send()

            if response == -1:
                update_email_state(batch_email, EmailStatus.FAILED)

            else:
                update_email_state(batch_email, EmailStatus.SENT)

            # batch_email.save()
            return f"Email sent to {to}: {response}"
        else:
            logger.error(f"Failed to send email to {to}")
    except Exception as e:
        logger.exception("Failed to send email")
        return f"Failed to send email to {to}: {e}"


MAXIMUM_SEND_MESSAGES_PER_SECOND = 10  # SESの制限 14だが、10とする
DAILY_SEND_LIMIT = 50000
SLEEPING = 30  # メールがない場合のスリープ秒数


class Command(BaseCommand):
    def handle(self, *args, **kwargs) -> None:
        def is_ready_to_dispatch(batch_email: BatchEmail) -> bool:
            batch_email.dispatch_time
            return (
                batch_email.dispatch_time is None
                or batch_email.dispatch_time < datetime.now(jst)
            )

        # 1日の送信数を管理
        total_emails_sent_today = 0
        jst = ZoneInfo("Asia/Tokyo")  # タイムゾーン情報を取得
        last_reset_time = datetime.now(jst)

        while True:
            # DBコネクションをリセット（必要に応じて）
            try:
                # 日次送信数をリセット（UTC 0時基準）
                if (datetime.now(jst) - last_reset_time) > timedelta(days=1):
                    total_emails_sent_today = 0
                    last_reset_time = datetime.now(jst)
                    logger.info("Reset daily email send counter.")

                logger.debug("Reconnecting to DB...")
                connection.close()
                mails: List[BatchEmail] = []

                for mail_status in CurrentEmailStatus.objects.filter(
                    Q(email_record__status=EmailStatus.PENDING)
                    | Q(email_record__status=EmailStatus.RETRY)
                ):
                    batch_email = mail_status.batch_email
                    if batch_email and is_ready_to_dispatch(batch_email):
                        mails.append(batch_email)
                for batch_email in BatchEmail.objects.filter(records__isnull=True):
                    update_email_state(batch_email, EmailStatus.PENDING)

                    if is_ready_to_dispatch(batch_email):
                        mails.append(batch_email)

                with ThreadPoolExecutor(
                    max_workers=MAXIMUM_SEND_MESSAGES_PER_SECOND
                ) as executor:
                    for i in range(0, len(mails), MAXIMUM_SEND_MESSAGES_PER_SECOND):
                        if total_emails_sent_today >= DAILY_SEND_LIMIT:
                            logger.warning(
                                "Daily send limit reached. Pausing until reset."
                            )
                            sleep(SLEEPING)
                            break
                        batch = mails[i : i + MAXIMUM_SEND_MESSAGES_PER_SECOND]
                        results = list(executor.map(send_email, batch))
                        total_emails_sent_today += len(results)
                        for result in results:
                            logger.debug(result)
                        sleep(1)  # 秒間送信制限を守る

                sleep(9)  # 次のバッチまで少し待機

                if not mails:
                    logger.debug(
                        f"No emails to send. Sleeping for {SLEEPING} seconds..."
                    )
                    sleep(SLEEPING)

            except Exception as e:
                logger.exception(f"An error occurred: {e}")
                sleep(SLEEPING)  # エラーが発生しても少し待機して再開
