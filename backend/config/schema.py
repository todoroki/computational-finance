from typing import List, Optional

import strawberry
from django.db.models import Case, IntegerField, Q, Value, When
from stocks.models import Stock
from stocks.types import StockType


@strawberry.type
class Query:
    @strawberry.field
    def stocks(
        self,
        search: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        sort_by: Optional[str] = "code",  # code, z_score, f_score, status
        sort_order: Optional[str] = "asc",  # asc, desc
    ) -> List[StockType]:
        qs = Stock.objects.all()

        # 🔍 1. 検索 & フィルタ
        if search:
            qs = qs.filter(Q(code__icontains=search) | Q(name__icontains=search))
        if status:
            qs = qs.filter(analysis_results__status=status)

        # 🔢 2. ソートロジック
        if sort_by == "status":
            # Statusを「意味のある順序」に変換してソート
            # Strong Buy(5) > Buy(4) > Good(3) > Hold(2) > Sell(1)
            qs = qs.annotate(
                status_rank=Case(
                    When(analysis_results__status="Strong Buy", then=Value(5)),
                    When(analysis_results__status="Buy", then=Value(4)),
                    When(analysis_results__status="Good", then=Value(3)),
                    When(analysis_results__status="Hold", then=Value(2)),
                    When(analysis_results__status="Sell", then=Value(1)),
                    default=Value(0),
                    output_field=IntegerField(),
                )
            ).order_by(f"{'-' if sort_order == 'desc' else ''}status_rank")

        elif sort_by == "z_score":
            # Z-Score順 (NULLは後ろにやる処理を入れると親切だが一旦シンプルに)
            prefix = "-" if sort_order == "desc" else ""
            qs = qs.order_by(f"{prefix}analysis_results__z_score")

        elif sort_by == "f_score":
            prefix = "-" if sort_order == "desc" else ""
            qs = qs.order_by(f"{prefix}analysis_results__f_score")

        elif sort_by == "gp":  # Gross Profitability
            prefix = "-" if sort_order == "desc" else ""
            qs = qs.order_by(f"{prefix}analysis_results__gross_profitability")

        else:
            # デフォルト: コード順
            prefix = "-" if sort_order == "desc" else ""
            qs = qs.order_by(f"{prefix}code")

        # ✂️ 3. 件数制限
        return qs[:limit]

    @strawberry.field
    def stock(self, code: str) -> Optional[StockType]:
        return Stock.objects.filter(code=code).first()


schema = strawberry.Schema(query=Query)
