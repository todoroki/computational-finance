from typing import List, Optional

import strawberry
from django.db.models import Case, IntegerField, Q, Value, When
from stocks.models import Portfolio, PortfolioItem, Stock
from stocks.types import PortfolioType, StockType


@strawberry.type
class Query:
    @strawberry.field
    def stocks(
        self,
        search: Optional[str] = None,
        status: Optional[str] = None,
        # ▼ 修正: リストで受け取る (デフォルトNone)
        ranking_modes: Optional[List[str]] = None,
        sector: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        sort_by: Optional[str] = "code",
        sort_order: Optional[str] = "asc",
    ) -> List[StockType]:

        # 基本クエリ
        qs = Stock.objects.prefetch_related("analysis_results").all()
        # 分析結果があるものに限定
        qs = qs.filter(analysis_results__isnull=False).distinct()

        # --- 1. 基本フィルタ ---
        if search:
            qs = qs.filter(
                Q(code__icontains=search)
                | Q(name__icontains=search)
                | Q(japanese_name__icontains=search)
            )

        if sector and sector != "All":
            qs = qs.filter(sector_17_code_name=sector)

        if status:
            qs = qs.filter(analysis_results__status=status)

        # --- 2. ランキングモード (複数選択対応) ---

        # モードごとの「フィルタ条件(Q)」と「ソート順」の定義マップ
        # format: "mode_id": (Filter_Q, Sort_Field)
        MODE_MAP = {
            # === Special ===
            "strong_buy": (
                Q(analysis_results__status__in=["Strong Buy", "Buy"]),
                "-analysis_results__f_score",
            ),
            # === Safety ===
            "safety_shield": (
                Q(analysis_results__tag_safety_shield=True),
                "-analysis_results__z_score",
            ),
            "quality_growth": (
                Q(analysis_results__tag_quality_growth=True),
                "-analysis_results__gross_profitability",
            ),
            "institutional": (
                Q(analysis_results__tag_institutional=True),
                "-analysis_results__f_score",
            ),
            # === Character ===
            "gap_opportunities": (
                Q(analysis_results__expectation_gap__lt=0),
                "analysis_results__expectation_gap",
            ),
            "cash_cow": (
                Q(analysis_results__tag_cash_cow=True),
                "-analysis_results__free_cash_flow",
            ),
            "single_engine": (
                Q(analysis_results__tag_single_engine=True),
                "-analysis_results__actual_revenue_growth",
            ),
            "silent_improver": (
                Q(analysis_results__tag_silent_improver=True),
                "-analysis_results__f_score",
            ),
            "turnaround": (
                Q(analysis_results__tag_turnaround=True),
                "-analysis_results__net_income",
            ),
            # === Risk ===
            "zombie": (
                Q(analysis_results__tag_zombie=True),
                "analysis_results__z_score",
            ),
            "accounting_risk": (
                Q(analysis_results__tag_accounting_risk=True),
                "analysis_results__operating_cf",
            ),
            "high_volatility": (
                Q(analysis_results__tag_high_volatility=True),
                "-analysis_results__expectation_gap",
            ),
            "fragile": (
                Q(analysis_results__tag_fragile=True),
                "-analysis_results__expectation_gap",
            ),
        }

        primary_sort_key = None

        if ranking_modes:
            for mode in ranking_modes:
                if mode in MODE_MAP:
                    filter_q, sort_key = MODE_MAP[mode]
                    # AND条件で絞り込み
                    qs = qs.filter(filter_q)

                    # 最初のモードのソート順を優先採用する
                    if primary_sort_key is None:
                        primary_sort_key = sort_key

        # --- 3. ソート適用 ---
        # ランキングモードの指定があれば、その最初のモードの基準でソート
        if primary_sort_key:
            qs = qs.order_by(primary_sort_key)

        # 指定がなければ通常のソート引数を使用
        else:
            if sort_by == "status":
                qs = qs.annotate(
                    status_rank=Case(
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

            elif sort_by == "code":
                qs = qs.order_by("code")
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
                qs = qs.order_by("code")

        return qs[offset : offset + limit]

    @strawberry.field
    def stock(self, code: str) -> Optional[StockType]:
        return Stock.objects.filter(code=code).first()

    # --- ▼▼▼ 新規追加: Portfolio Query ▼▼▼ ---
    @strawberry.field
    def my_portfolio(self, owner_id: str = "guest") -> Optional[PortfolioType]:
        """
        指定されたowner_idのポートフォリオを返す。
        なければ自動作成する（MVP仕様）。
        """
        portfolio, _ = Portfolio.objects.get_or_create(
            owner_id=owner_id, defaults={"name": "My Portfolio"}
        )
        return portfolio


# --- ▼▼▼ 新規追加: Mutation (書き込み操作) ▼▼▼ ---
@strawberry.type
class Mutation:
    @strawberry.mutation
    def add_to_portfolio(
        self,
        owner_id: str,
        stock_code: str,
        quantity: float,
        average_price: float,
        investment_thesis: Optional[str] = None,
        exit_strategy: Optional[str] = None,
    ) -> Optional[PortfolioType]:
        """ポートフォリオに銘柄を追加（または更新）"""
        """ポートフォリオに銘柄を追加（または更新）"""
        target_owner = owner_id if owner_id else "guest"

        portfolio, _ = Portfolio.objects.get_or_create(owner_id=target_owner)

        try:
            stock = Stock.objects.get(code=stock_code)
        except Stock.DoesNotExist:
            return None

        # 既存なら更新、なければ作成
        item, created = PortfolioItem.objects.update_or_create(
            portfolio=portfolio,
            stock=stock,
            defaults={
                "quantity": quantity,
                "average_price": average_price,
                # ▼▼▼ 追加: ここで保存！ ▼▼▼
                "investment_thesis": investment_thesis,
                "exit_strategy": exit_strategy,
            },
        )
        return portfolio

    @strawberry.mutation
    def remove_from_portfolio(
        self, owner_id: str, stock_code: str
    ) -> Optional[PortfolioType]:
        """ポートフォリオから銘柄を削除"""
        portfolio = Portfolio.objects.filter(owner_id=owner_id).first()
        if not portfolio:
            return None

        PortfolioItem.objects.filter(
            portfolio=portfolio, stock__code=stock_code
        ).delete()
        return portfolio


# schema = strawberry.Schema(query=Query)
schema = strawberry.Schema(query=Query, mutation=Mutation)
