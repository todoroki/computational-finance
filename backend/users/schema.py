import strawberry
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from users.extensions import JwtAuthExtension
from users.models import JwtToken
from users.types import (
    AuthError,
    AuthResponse,
    LogoutResponse,
    ResetPasswordResponse,
    SuccessResponse,
    UserType,
)
from users.utils import generate_jwt_token

User = get_user_model()


@strawberry.type
class Mutation:
    # --- サインアップ ---
    @strawberry.mutation
    def signup(self, username: str, email: str, password: str) -> AuthResponse:
        """ユーザー登録 -> JWT発行"""
        if len(password) < 8:
            return AuthError(message="パスワードは8文字以上必要です。")
        try:
            validate_email(email)
        except ValidationError:
            return AuthError(message="無効なメールアドレス形式です。")

        try:
            user = User.objects.create_user(
                username=username, email=email, password=password
            )
        except IntegrityError:
            return AuthError(
                message="ユーザー名またはメールアドレスが既に登録されています。"
            )

        token = generate_jwt_token(user)
        return UserType(
            id=user.id,  # str()を外してUUIDオブジェクトを直接渡す
            username=user.username,
            email=user.email,
            bearer_token=token,
        )

    # --- ログイン ---
    @strawberry.mutation
    def login(self, username_or_email: str, password: str) -> AuthResponse:
        """ログイン (Username or Email) -> JWT発行"""
        user_obj = None
        if "@" in username_or_email:
            user_obj = User.objects.filter(email=username_or_email).first()
        else:
            user_obj = User.objects.filter(username=username_or_email).first()

        if not user_obj:
            return AuthError(message="ログインIDまたはパスワードが正しくありません。")

        user = authenticate(username=user_obj.username, password=password)
        if not user:
            return AuthError(message="ログインIDまたはパスワードが正しくありません。")

        token = generate_jwt_token(user)
        return UserType(
            id=user.id,
            username=user.username,
            email=user.email,
            bearer_token=token,
        )

    # --- ログアウト ---
    @strawberry.mutation(extensions=[JwtAuthExtension()])
    def logout(self, info) -> LogoutResponse:
        """ログアウト -> DB上の現在のトークンを無効化"""
        request = info.context.request
        auth_header = request.headers.get("Authorization")
        if auth_header:
            token = auth_header.split()[1]
            JwtToken.objects.filter(token=token).update(is_active=False)

        return SuccessResponse(success=True, message="ログアウトしました。")

    # --- パスワードリセット関連 ---
    @strawberry.mutation
    def request_password_reset(self, email: str) -> SuccessResponse:
        """パスワードリセットメールの送信リクエスト"""
        user = User.objects.filter(email=email).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            # ここで実際にはメール送信ロジックを呼ぶ
            # send_password_reset_email(email, uid, token)
            print(f"DEBUG: Reset Link -> /reset-password/{uid}/{token}/")

        return SuccessResponse(
            success=True, message="メールを送信しました（登録がある場合のみ）。"
        )

    @strawberry.mutation
    def reset_password(
        self, uid_b64: str, token: str, new_password: str
    ) -> ResetPasswordResponse:
        """トークンを検証してパスワードを再設定"""
        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=uid)
        except TypeError, ValueError, OverflowError, User.DoesNotExist:
            return AuthError(message="無効なリンクです。")

        if not default_token_generator.check_token(user, token):
            return AuthError(message="有効期限が切れているか、既に使われたリンクです。")

        if len(new_password) < 8:
            return AuthError(message="新しいパスワードは8文字以上必要です。")

        with transaction.atomic():
            user.set_password(new_password)
            user.save()
            # セキュリティ上、パスワード変更後は既存の全JWTを無効化するのが「恥ずかしくない」設計
            JwtToken.objects.filter(user=user).update(is_active=False)

        return SuccessResponse(success=True, message="パスワードを更新しました。")


@strawberry.type
class Query:
    @strawberry.field(extensions=[JwtAuthExtension()])
    def me(self, info) -> AuthResponse:
        """現在のログインユーザー情報を取得"""
        user = info.context.request.user
        return UserType(id=user.id, username=user.username, email=user.email)

    @strawberry.field
    def verify_reset_token(self, uid_b64: str, token: str) -> SuccessResponse:
        """パスワードリセット画面を開いた瞬間にトークンの有効性をチェックするQuery"""
        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=uid)
            if default_token_generator.check_token(user, token):
                return SuccessResponse(success=True)
        except Exception:
            pass
        return SuccessResponse(success=False, message="無効なトークンです。")
