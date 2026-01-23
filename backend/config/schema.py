from typing import List, Optional

import strawberry
from django.db.models import Q
from stocks.models import Stock
from stocks.types import StockType


@strawberry.type
class Query:
    # limit引数を追加 (デフォルト100)
    @strawberry.field
    def stocks(
        self,
        search: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> List[StockType]:
        # ベースのクエリ（コード順）
        qs = Stock.objects.all().order_by("code")

        # 🔍 キーワード検索
        if search:
            qs = qs.filter(Q(code__icontains=search) | Q(name__icontains=search))

        # 📊 ステータス絞り込み
        if status:
            qs = qs.filter(analysis_results__status=status).distinct()

        # ✂️ 件数制限 (スライス)
        return qs[:limit]

    @strawberry.field
    def stock(self, code: str) -> Optional[StockType]:
        return Stock.objects.filter(code=code).first()


schema = strawberry.Schema(query=Query)
