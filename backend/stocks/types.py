from typing import List, Optional

import strawberry
from strawberry.scalars import JSON

from .models import AnalysisResult, FinancialStatement, Portfolio, PortfolioItem, Stock


# === 1. 分析結果の型定義 ===
# ▼ ここを修正: @strawberry.type ではなく @strawberry.django.type(Model) にする
@strawberry.django.type(AnalysisResult)
class AnalysisResultType:
    # Basic
    date: strawberry.auto  # これを使うために django.type が必要
    stock_price: float | None
    market_cap: float | None

    # Safety & Risk
    z_score: float | None
    f_score: int | None
    accruals_ratio: float | None

    # Structure & Growth
    gross_profitability: float | None
    roiic: float | None

    # Expectation
    implied_growth_rate: float | None

    # Verdict
    status: str
    is_good_buy: bool
    ai_summary: str | None

    implied_revenue_growth: float | None  # ★追加: 売上ベース
    actual_revenue_growth: float | None
    expectation_gap: float | None
    state: str
    expectation_structure: str
    risk_level: str
    risk_details: str | None

    # ▼▼▼ ここに追加！ (11個のタグ) ▼▼▼
    tag_safety_shield: bool
    tag_cash_cow: bool
    tag_quality_growth: bool
    tag_institutional: bool
    tag_single_engine: bool
    tag_high_volatility: bool
    tag_silent_improver: bool
    tag_turnaround: bool
    tag_zombie: bool
    tag_accounting_risk: bool
    tag_fragile: bool


# === 2. 財務データの型定義 ===
@strawberry.django.type(FinancialStatement)
class FinancialStatementType:
    fiscal_year: int
    quarter: int
    period_end: strawberry.auto  # これを使うために django.type が必要

    # PL
    revenue: float | None
    operating_income: float | None
    net_income: float | None

    # BS
    total_assets: float | None
    total_equity: float | None

    # CF
    operating_cf: float | None
    investing_cf: float | None
    financing_cf: float | None

    # New Data
    inventory: float | None
    capex: float | None


# === 3. 銘柄の型定義 ===
@strawberry.django.type(Stock)
class StockType:
    code: str
    name: str
    sector: str | None
    market: str | None
    description: str | None
    # ▼▼▼ これがないとエラーになります ▼▼▼
    japanese_name: str | None
    japanese_sector: str | None
    japanese_market: str | None
    # ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    # リレーション: 分析結果 (最新順)
    @strawberry.field
    def analysis_results(self) -> List[AnalysisResultType]:
        return self.analysis_results.all().order_by("-date")

    # リレーション: 財務データ (年度順)
    @strawberry.field
    def financials(self) -> List[FinancialStatementType]:
        return self.financials.all().order_by("fiscal_year")


# # === 4. クエリ定義 ===
# @strawberry.type
# class Query:
#     @strawberry.field
#     def stocks(self) -> List[StockType]:
#         return Stock.objects.all()

#     @strawberry.field
#     def stock(self, code: str) -> Optional[StockType]:
#         return Stock.objects.filter(code=code).first()


# ▼▼▼ 追加: ポートフォリオ診断結果の型 ▼▼▼
@strawberry.type
class PortfolioAnalysisType:
    total_value: float
    health_score: int
    diagnosis_summary: str

    # 構造データは柔軟に扱えるようJSONとして返します
    category_exposure: JSON
    tag_exposure: JSON
    narrative_analysis: JSON


# ▼▼▼ 追加: ポートフォリオ明細の型 ▼▼▼
@strawberry.django.type(PortfolioItem)
class PortfolioItemType:
    stock: "StockType"  # 既存のStockTypeを参照
    quantity: float
    average_price: float
    target_weight: float | None
    note: str | None

    @strawberry.field
    def current_value(self) -> float:
        # 現在評価額 (株価 × 数量)
        latest_analysis = self.stock.analysis_results.first()
        price = (
            latest_analysis.stock_price
            if latest_analysis and latest_analysis.stock_price
            else 0
        )
        return float(price) * float(self.quantity)

    @strawberry.field
    def profit_loss(self) -> float:
        # 含み損益
        return self.current_value() - (float(self.average_price) * float(self.quantity))


# ▼▼▼ 追加: ポートフォリオ本体の型 ▼▼▼
@strawberry.django.type(Portfolio)
class PortfolioType:
    id: strawberry.ID
    name: str
    description: str | None
    owner_id: str
    items: List[PortfolioItemType]

    @strawberry.field
    def analysis(self) -> PortfolioAnalysisType:
        """
        ここが心臓部。
        APIで 'analysis' フィールドが要求された瞬間、
        PortfolioAnalyzer を起動してリアルタイム診断を行う。
        """
        from .portfolio_analytics import PortfolioAnalyzer

        analyzer = PortfolioAnalyzer(self)
        result = analyzer.analyze()

        return PortfolioAnalysisType(
            total_value=result["total_value"],
            health_score=result["health_score"],
            diagnosis_summary=result["diagnosis_summary"],
            category_exposure=result["category_exposure"],
            tag_exposure=result["tag_exposure"],
            narrative_analysis=result["narrative_analysis"],
        )
