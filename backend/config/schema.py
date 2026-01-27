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
        ranking_mode: Optional[str] = None,
        limit: int = 100,
        sort_by: Optional[str] = "code",
        sort_order: Optional[str] = "asc",
    ) -> List[StockType]:
        # ▼▼▼ 修正点1: prefetch_related を使い、名前は 'analysis_results' にする
        qs = Stock.objects.prefetch_related("analysis_results").all()

        # 🔍 1. 検索 & フィルタ
        if search:
            qs = qs.filter(Q(code__icontains=search) | Q(name__icontains=search))

        if status:
            # ▼▼▼ 修正点2: フィルタも 'analysis_results' を使う
            qs = qs.filter(analysis_results__status=status)

        # 🚀 2. ランキングモード
        if ranking_mode:
            if ranking_mode == "gap_opportunities":
                qs = qs.filter(analysis_results__expectation_gap__isnull=False)
                qs = qs.order_by("analysis_results__expectation_gap")

            elif ranking_mode == "gap_overheated":
                qs = qs.filter(analysis_results__expectation_gap__isnull=False)
                qs = qs.order_by("-analysis_results__expectation_gap")

            elif ranking_mode == "single_engine":
                qs = qs.filter(
                    analysis_results__implied_growth_rate__isnull=True,
                    analysis_results__implied_revenue_growth__gte=20,
                ).order_by("-analysis_results__implied_revenue_growth")

        # 🔢 3. 通常ソート
        else:
            if sort_by == "status":
                qs = qs.annotate(
                    status_rank=Case(
                        # ▼▼▼ 修正点3: ここも 'analysis_results'
                        When(analysis_results__status="Strong Buy", then=Value(5)),
                        When(analysis_results__status="Buy", then=Value(4)),
                        When(analysis_results__status="Buy (Spec)", then=Value(3)),
                        When(analysis_results__status="Good", then=Value(3)),
                        When(analysis_results__status="Watch", then=Value(3)),
                        When(analysis_results__status="Hold", then=Value(2)),
                        When(analysis_results__status="Sell", then=Value(1)),
                        When(analysis_results__status="Avoid", then=Value(0)),
                        default=Value(0),
                        output_field=IntegerField(),
                    )
                ).order_by(f"{'-' if sort_order == 'desc' else ''}status_rank")

            elif sort_by == "z_score":
                prefix = "-" if sort_order == "desc" else ""
                qs = qs.order_by(f"{prefix}analysis_results__z_score")

            elif sort_by == "f_score":
                prefix = "-" if sort_order == "desc" else ""
                qs = qs.order_by(f"{prefix}analysis_results__f_score")

            elif sort_by == "gp":
                prefix = "-" if sort_order == "desc" else ""
                qs = qs.order_by(f"{prefix}analysis_results__gross_profitability")

            else:
                prefix = "-" if sort_order == "desc" else ""
                qs = qs.order_by(f"{prefix}code")

        # ✂️ 4. 件数制限
        return qs[:limit]

    @strawberry.field
    def stock(self, code: str) -> Optional[StockType]:
        return Stock.objects.filter(code=code).first()


schema = strawberry.Schema(query=Query)
