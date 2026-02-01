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
        ranking_mode: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,  # ★ページネーション用
        sort_by: Optional[str] = "code",
        sort_order: Optional[str] = "asc",
    ) -> List[StockType]:
        # ▼▼▼ 修正点1: prefetch_related を使い、名前は 'analysis_results' にする
        qs = Stock.objects.prefetch_related("analysis_results").all()

        # 🔍 1. 検索 & フィルタ
        if search:
            qs = qs.filter(
                Q(code__icontains=search)
                | Q(name__icontains=search)
                | Q(japanese_name__icontains=search)  # ★追加
            )

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

            # ★追加: 単純な「AI推奨順」
            elif ranking_mode == "strong_buy":
                # Strong Buy を優先的に出す（簡易実装としてステータス指定も可だが、ここではロジックで）
                qs = qs.filter(analysis_results__status__in=["Strong Buy", "Buy"])
                # 強い順に並べる（statusをカスタムソートするのはDB的に重いので、Zスコア×割安度などでソートしても良いが、一旦Fスコア順などで代用）
                qs = qs.order_by("-analysis_results__f_score")

            # === 市場期待 ===
            elif ranking_mode == "gap_opportunities":  # 割安放置
                qs = qs.filter(analysis_results__expectation_gap__lt=0)
                qs = qs.order_by("analysis_results__expectation_gap")

            # === 成長・投機 ===
            elif ranking_mode == "single_engine":  # 夢株
                qs = qs.filter(analysis_results__tag_single_engine=True)
                qs = qs.order_by("-analysis_results__actual_revenue_growth")

            # === 安全・質 ===
            elif ranking_mode == "safety_shield":  # 盤石の盾
                qs = qs.filter(analysis_results__tag_safety_shield=True)
                qs = qs.order_by("-analysis_results__z_score")

            elif ranking_mode == "quality_growth":  # 王道
                qs = qs.filter(analysis_results__tag_quality_growth=True)
                qs = qs.order_by("-analysis_results__gross_profitability")

            # === 改善 ===
            elif ranking_mode == "turnaround":  # 復活
                qs = qs.filter(
                    Q(analysis_results__tag_turnaround=True)
                    | Q(analysis_results__tag_silent_improver=True)
                )
                qs = qs.order_by(
                    "-analysis_results__expectation_gap"
                )  # ギャップが大きい(期待されてない)順

            # === 危険 ===
            elif ranking_mode == "avoid":  # 危険
                qs = qs.filter(
                    Q(analysis_results__tag_zombie=True)
                    | Q(analysis_results__tag_accounting_risk=True)
                    | Q(analysis_results__tag_fragile=True)
                )
                qs = qs.order_by(
                    "analysis_results__z_score"
                )  # Zスコアが低い順（危険順）
            # 🔢 3. ソート (ランキングモード以外の場合のフォールバック)
            else:
                if sort_by == "code":
                    qs = qs.order_by("code")

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
                prefix = "-" if sort_order == "desc" else ""
                qs = qs.order_by(f"{prefix}code")

        # ✂️ 4. 件数制限
        # return qs[:limit]
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
        self, owner_id: str, stock_code: str, quantity: float, average_price: float
    ) -> Optional[PortfolioType]:
        """ポートフォリオに銘柄を追加（または更新）"""
        portfolio, _ = Portfolio.objects.get_or_create(owner_id=owner_id)
        stock = Stock.objects.get(code=stock_code)

        # 既存なら更新、なければ作成
        item, created = PortfolioItem.objects.update_or_create(
            portfolio=portfolio,
            stock=stock,
            defaults={"quantity": quantity, "average_price": average_price},
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


schema = strawberry.Schema(query=Query)
