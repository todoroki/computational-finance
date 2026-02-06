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
        sector: Optional[str] = None,  # ★追加: セクター引数
        limit: int = 50,  # デフォルト50件に変更（Frontendに合わせて）
        offset: int = 0,
        sort_by: Optional[str] = "code",
        sort_order: Optional[str] = "asc",
    ) -> List[StockType]:

        # 基本クエリ (N+1問題対策)
        qs = Stock.objects.prefetch_related("analysis_results").all()

        # ---------------------------------------------------------
        # 1. 検索 & 基本フィルタ
        # ---------------------------------------------------------

        # 🔍 検索
        if search:
            qs = qs.filter(
                Q(code__icontains=search)
                | Q(name__icontains=search)
                | Q(japanese_name__icontains=search)
            )

        # 🏢 業種フィルタ (★追加)
        if sector and sector != "All":
            qs = qs.filter(sector_17_code_name=sector)

        # 📊 ステータスフィルタ
        if status:
            qs = qs.filter(analysis_results__status=status)

        # ---------------------------------------------------------
        # 2. ランキングモード (Frontendの12ボタンに対応)
        # ---------------------------------------------------------
        if ranking_mode:
            # === Special: AI推奨 ===
            if ranking_mode == "strong_buy":
                # Strong Buy / Buy を抽出し、Fスコア(質)順
                qs = qs.filter(analysis_results__status__in=["Strong Buy", "Buy"])
                qs = qs.order_by("-analysis_results__f_score")

            # === Layer 1: Safety (安全性) ===
            elif ranking_mode == "safety_shield":
                qs = qs.filter(analysis_results__tag_safety_shield=True)
                qs = qs.order_by("-analysis_results__z_score")

            elif ranking_mode == "quality_growth":
                qs = qs.filter(analysis_results__tag_quality_growth=True)
                qs = qs.order_by("-analysis_results__gross_profitability")

            elif ranking_mode == "institutional":  # ★追加
                qs = qs.filter(analysis_results__tag_institutional=True)
                qs = qs.order_by("-analysis_results__f_score")

            # === Layer 2: Character (性格) ===
            elif ranking_mode == "gap_opportunities":
                # 割安放置: マイナス乖離が大きい順 (重複を統合)
                qs = qs.filter(analysis_results__expectation_gap__lt=0)
                qs = qs.order_by("analysis_results__expectation_gap")

            elif ranking_mode == "gap_overheated":  # (念のため残し)
                qs = qs.filter(analysis_results__expectation_gap__gt=0)
                qs = qs.order_by("-analysis_results__expectation_gap")

            elif ranking_mode == "cash_cow":  # ★追加
                qs = qs.filter(analysis_results__tag_cash_cow=True)
                qs = qs.order_by("-analysis_results__free_cash_flow")

            elif ranking_mode == "single_engine":
                # 片肺飛行: 売上成長率順 (重複を統合)
                qs = qs.filter(analysis_results__tag_single_engine=True)
                qs = qs.order_by("-analysis_results__actual_revenue_growth")

            elif ranking_mode == "silent_improver":  # ★追加
                qs = qs.filter(analysis_results__tag_silent_improver=True)
                qs = qs.order_by("-analysis_results__f_score")

            elif ranking_mode == "turnaround":
                # 復活: 黒字転換など
                qs = qs.filter(analysis_results__tag_turnaround=True)
                qs = qs.order_by("-analysis_results__net_income")

            # === Layer 3: Risk (警告) ===
            elif ranking_mode == "zombie":  # ★追加
                # ゾンビ: Zスコアが低い順（より危険な順）
                qs = qs.filter(analysis_results__tag_zombie=True)
                qs = qs.order_by("analysis_results__z_score")

            elif ranking_mode == "accounting_risk":  # ★追加
                qs = qs.filter(analysis_results__tag_accounting_risk=True)
                qs = qs.order_by("analysis_results__operating_cf")

            elif ranking_mode == "high_volatility":  # ★追加
                qs = qs.filter(analysis_results__tag_high_volatility=True)
                qs = qs.order_by("-analysis_results__expectation_gap")

            elif ranking_mode == "fragile":  # ★追加
                qs = qs.filter(analysis_results__tag_fragile=True)
                qs = qs.order_by("-analysis_results__expectation_gap")

            # フォールバック
            else:
                qs = qs.order_by("code")

        # ---------------------------------------------------------
        # 3. 通常ソート (ランキングモード指定がない場合)
        # ---------------------------------------------------------
        else:
            if sort_by == "status":
                qs = qs.annotate(
                    status_rank=Case(
                        # ★元の詳細な定義を維持・復元
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

        # ✂️ 4. ページネーション
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
