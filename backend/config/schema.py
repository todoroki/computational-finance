from typing import List, Optional

import strawberry
from django.db.models import Q
from stocks.models import Stock
from stocks.types import StockType


@strawberry.type
class Query:
    # 1. 検索・絞り込み機能付きの全銘柄取得
    @strawberry.field
    def stocks(
        self, search: Optional[str] = None, status: Optional[str] = None
    ) -> List[StockType]:
        # ベースのクエリ（コード順）
        qs = Stock.objects.all().order_by("code")

        # 🔍 キーワード検索 (コード OR 銘柄名)
        if search:
            qs = qs.filter(Q(code__icontains=search) | Q(name__icontains=search))

        # 📊 ステータス絞り込み (例: "Strong Buy" のみ)
        if status:
            # analysis_results__status は、関連するAnalysisResultテーブルを見に行く
            # distinct() は、同じ銘柄が複数ヒットするのを防ぐため
            qs = qs.filter(analysis_results__status=status).distinct()

        return qs

    # 2. コード指定で1銘柄を取得するクエリ
    @strawberry.field
    def stock(self, code: str) -> Optional[StockType]:
        return Stock.objects.filter(code=code).first()


schema = strawberry.Schema(query=Query)
