# myapp/mail_backends.py

import logging

from django.conf import settings
from django.core.mail.backends.smtp import EmailBackend as SmtpEmailBackend
from django.utils.html import escape

logger = logging.getLogger("iamfax")  # 既存のロガーを使う場合


class StagingRedirectEmailBackend(SmtpEmailBackend):
    """Staging環境用メールバックエンド。
    全てのメールを指定されたアドレス(settings.STAGING_EMAIL_REDIRECT_RECIPIENTS)にリダイレクトする。
    元の宛先情報はメール本文の先頭に追加される。
    実際の送信にはsettingsのEMAIL_HOST等のSMTP設定を使用する。
    """

    def __init__(self, *args, **kwargs):
        # ★★★ 初期化時にログ出力 ★★★
        logger.info("✅ StagingRedirectEmailBackend initialized!")
        super().__init__(*args, **kwargs)

    def send_messages(self, email_messages):
        # リダイレクト先が設定されていなければ警告し、通常のSMTP送信を試みる
        logger.info(f"🚀 StagingRedirectEmailBackend: send_messages called with {len(email_messages)} messages.")
        redirect_recipients = getattr(settings, "STAGING_EMAIL_REDIRECT_RECIPIENTS", None)

        if not redirect_recipients:
            logger.warning(
                "STAGING_EMAIL_REDIRECT_RECIPIENTS is not defined or empty in settings. "
                "Falling back to standard SMTP sending (potentially to original recipients)."
            )
            # ここでエラーにするか、そのまま送信するかはポリシーによる
            return 0  # 送信失敗として扱う場合
            # return super().send_messages(email_messages)  # 通常通り送信試行

        modified_messages = []
        for message in email_messages:
            original_to = ", ".join(message.to)
            original_cc = ", ".join(message.cc)
            original_bcc = ", ".join(message.bcc)

            # --- ヘッダー作成 ---
            text_header = (
                f"--- [Staging Email] Original Recipients ---\n"
                f"To: {original_to}\n"
                f"Cc: {original_cc}\n"
                f"Bcc: {original_bcc}\n"
                f"Environment: Staging\n"  # 環境情報を追加しても良い
                f"-------------------------------------------\n\n"
            )
            html_header = (
                f'<div style="background-color:#f0f0f0; padding:10px; margin-bottom:15px; border:1px solid #ccc; font-family: sans-serif; font-size: small;">'
                f"<strong>--- [Staging Email] Original Recipients ---</strong><br>"
                f"<strong>To:</strong> {escape(original_to)}<br>"
                f"<strong>Cc:</strong> {escape(original_cc)}<br>"
                f"<strong>Bcc:</strong> {escape(original_bcc)}<br>"
                f"<strong>Environment:</strong> Staging<br>"
                f"-------------------------------------------</div>"
            )

            # --- 本文にヘッダーを追加 ---
            # プレーンテキスト
            message.body = text_header + message.body

            # HTML代替コンテンツ (EmailMultiAlternatives を使っているのでこちらが主)
            if hasattr(message, "alternatives") and message.alternatives:
                updated_alternatives = []
                for content, mimetype in message.alternatives:
                    if mimetype == "text/html":
                        updated_alternatives.append((html_header + content, mimetype))
                    else:
                        updated_alternatives.append((content, mimetype))
                message.alternatives = updated_alternatives
            elif message.content_subtype == "html":  # フォールバック
                message.body = html_header + message.body

            # --- 宛先をリダイレクト先で上書き ---
            message.to = list(redirect_recipients)  # list であることを保証
            message.cc = []
            message.bcc = []

            modified_messages.append(message)

        # 親クラス(SmtpEmailBackend)の send_messages を呼び出して実際に送信
        # SmtpEmailBackend は settings.EMAIL_HOST 等の設定を利用する
        if not modified_messages:
            return 0
        return super().send_messages(modified_messages)
