# users/types.py
import uuid
from typing import Annotated, Optional, Union

import strawberry


@strawberry.type
class UserType:
    # uuid.UUID を使うことで、Strawberryが適切にシリアライズします
    # または、GraphQLの標準に従って strawberry.ID を使うのも一般的です
    id: uuid.UUID
    username: str
    email: str
    bearer_token: Optional[str] = None


@strawberry.type
class AuthError:
    message: str


@strawberry.type
class SuccessResponse:
    success: bool
    message: Optional[str] = None


# ▼ Error as Data パターンの Union 定義
# これにより、正常系と異常系を型として明確に分離できます
AuthResponse = Annotated[Union[UserType, AuthError], strawberry.union("AuthResponse")]

# パスワードリセットやトークン検証用など、拡張性を持たせたレスポンス
TokenVerifyResponse = Annotated[
    Union[SuccessResponse, AuthError], strawberry.union("TokenVerifyResponse")
]


LogoutResponse = Annotated[
    Union[SuccessResponse, AuthError], strawberry.union("LogoutResponse")
]

ResetPasswordResponse = Annotated[
    Union[SuccessResponse, AuthError], strawberry.union("ResetPasswordResponse")
]
