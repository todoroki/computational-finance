from typing import List, Optional

import strawberry
from strawberry.scalars import JSON

from .models import AnalysisResult, FinancialStatement, Portfolio, PortfolioItem, Stock


# === 1. 分析結果の型定義 ===
@strawberry.django.type(AnalysisResult)
class AnalysisResultType:
    # Basic
    date: strawberry.auto
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

    implied_revenue_growth: float | None
    actual_revenue_growth: float | None
    expectation_gap: float | None
    state: str
    expectation_structure: str
    risk_level: str
    risk_details: str | None

    # ▼▼▼ 追加: 財務データ (ソートや表示に使用) ▼▼▼
    # ※ AnalysisResultモデルにこれらのメソッド/プロパティがない場合、FinancialStatementから取るロジックが必要ですが
    # ここではモデルにプロパティとして定義されている、あるいはannotateされている前提で定義します。
    # もしモデルになければ、@strawberry.fieldで定義する必要があります。

    # ここではシンプルに、モデルに定義されていると仮定して型を追加します。
    # もしエラーになる場合は、models.py に @property を追加してください。
    free_cash_flow: float | None
    operating_cf: float | None
    net_income: float | None

    # ▼▼▼ 11個のタグ (完全網羅) ▼▼▼
    tag_safety_shield: bool
    tag_quality_growth: bool
    tag_institutional: bool  # 追加
    tag_cash_cow: bool  # 追加
    tag_single_engine: bool
    tag_silent_improver: bool  # 追加
    tag_turnaround: bool
    tag_zombie: bool
    tag_accounting_risk: bool  # 追加
    tag_high_volatility: bool  # 追加
    tag_fragile: bool  # 追加


# === 2. 財務データの型定義 ===
@strawberry.django.type(FinancialStatement)
class FinancialStatementType:
    fiscal_year: int
    quarter: int
    period_end: strawberry.auto

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

    japanese_name: str | None
    japanese_sector: str | None
    japanese_market: str | None

    # ▼▼▼ 追加: 17業種コード名 ▼▼▼
    # models.py に sector_17_code_name フィールドがある前提
    sector_17_code_name: str | None

    # リレーション: 分析結果 (最新順)
    @strawberry.field
    def analysis_results(self) -> List[AnalysisResultType]:
        return self.analysis_results.all().order_by("-date")

    # リレーション: 財務データ (年度順)
    @strawberry.field
    def financials(self) -> List[FinancialStatementType]:
        return self.financials.all().order_by("fiscal_year")


# === 4. ポートフォリオ関連 (変更なし) ===
@strawberry.type
class PortfolioAnalysisType:
    total_value: float
    health_score: int
    diagnosis_summary: str
    category_exposure: JSON
    tag_exposure: JSON
    narrative_analysis: JSON


@strawberry.django.type(PortfolioItem)
class PortfolioItemType:
    stock: "StockType"
    quantity: float
    average_price: float
    target_weight: float | None
    note: str | None
    investment_thesis: str | None
    exit_strategy: str | None

    @strawberry.field
    def current_value(self) -> float:
        latest_analysis = self.stock.analysis_results.first()
        price = (
            latest_analysis.stock_price
            if latest_analysis and latest_analysis.stock_price
            else 0
        )
        return float(price) * float(self.quantity)

    @strawberry.field
    def profit_loss(self) -> float:
        latest_analysis = self.stock.analysis_results.first()
        price = (
            latest_analysis.stock_price
            if latest_analysis and latest_analysis.stock_price
            else 0
        )
        current_val = float(price) * float(self.quantity)
        cost_basis = float(self.average_price) * float(self.quantity)
        return current_val - cost_basis


@strawberry.django.type(Portfolio)
class PortfolioType:
    id: strawberry.ID
    name: str
    description: str | None
    owner_id: str
    items: List[PortfolioItemType]

    @strawberry.field
    def analysis(self) -> PortfolioAnalysisType:
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
