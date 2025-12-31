# backend/config/schema.py
from typing import List, Optional

import strawberry
from stocks.models import Stock
from stocks.types import StockType


@strawberry.type
class Query:
    # 1. 全銘柄を取得するクエリ
    @strawberry.field
    def stocks(self) -> List[StockType]:
        return Stock.objects.all()

    # 2. コード指定で1銘柄を取得するクエリ
    @strawberry.field
    def stock(self, code: str) -> Optional[StockType]:
        return Stock.objects.filter(code=code).first()


schema = strawberry.Schema(query=Query)
