# users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from stocks.models import BaseModel  # あなたが作ったBaseModelを再利用


class User(AbstractUser, BaseModel):
    """
    UUID7をIDに持つカスタムユーザーモデル。
    """

    email = models.EmailField("メールアドレス", unique=True)

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.username


class JwtToken(BaseModel):
    """
    発行したJWTをDB側で管理。Revoke(無効化)やマジックログインを可能にする。
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="jwt_tokens")
    token = models.CharField("JWT Token", max_length=512, unique=True, db_index=True)
    expires_at = models.DateTimeField("失効日時")

    def __str__(self):
        return f"{self.user.username} - {'Active' if self.is_active else 'Revoked'}"
