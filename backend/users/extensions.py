# users/extensions.py
import logging
from typing import Any, Callable

import jwt
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from strawberry.extensions import FieldExtension
from strawberry.types import Info

from users.models import JwtToken, User
from users.types import AuthError

logger = logging.getLogger(__name__)


class JwtAuthExtension(FieldExtension):
    """
    JWT(Bearerトークン)に特化した認証Extension。
    セッションは一切無視し、DBでの有効性チェック（Revocation）をサポート。
    """

    def resolve(
        self, next_: Callable[..., Any], source: Any, info: Info, **kwargs
    ) -> Any:
        user = self.get_authenticated_user(info)

        if user is None:
            # 認証失敗時、request.userにAnonymousUserをセット
            info.context.request.user = AnonymousUser()
            # エラーをデータとして返す（Union型でのハンドリングを想定）
            return AuthError(
                message="ログインが必要です。またはセッションが切れています。"
            )

        # 認証成功
        info.context.request.user = user
        return next_(source, info, **kwargs)

    def get_authenticated_user(self, info: Info) -> User | None:
        request = info.context.request
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]
        try:
            # 1. JWTの署名と期限を検証
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("user_id")

            if not user_id:
                return None

            # 2. DBをチェックして、トークンが失効(ログアウト済み)していないか確認
            # ※ ここが Magic Login や 強制ログアウトを実現するキモ
            token_record = JwtToken.objects.filter(
                token=token, user_id=user_id, is_active=True, is_deleted=False
            ).first()

            if not token_record:
                logger.warning(f"Valid JWT but revoked in DB: user={user_id}")
                return None

            # 3. ユーザーの存在と有効性を確認
            user = User.objects.filter(
                pk=user_id, is_active=True, is_deleted=False
            ).first()
            return user

        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Exception) as e:
            logger.warning(f"JWT Authentication failed: {str(e)}")
            return None
