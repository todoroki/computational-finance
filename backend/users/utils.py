# users/utils.py
from datetime import datetime, timedelta

import jwt
from django.conf import settings
from django.utils import timezone

from users.models import JwtToken


def generate_jwt_token(user) -> str:
    # 30日間有効
    expires_at = timezone.now() + timedelta(days=30)

    payload = {
        "user_id": str(user.id),
        "exp": int(expires_at.timestamp()),
        "iat": int(timezone.now().timestamp()),
    }

    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    # DBに保存
    JwtToken.objects.create(
        user=user, token=token, expires_at=expires_at, is_active=True
    )
    return token
