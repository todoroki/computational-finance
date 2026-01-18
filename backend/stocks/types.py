# backend/stocks/types.py
from typing import List, Optional

import strawberry

from .models import AnalysisResult, FinancialStatement, Stock


@strawberry.django.type(FinancialStatement)
class FinancialStatementType:
    fiscal_year: int
    quarter: int
    revenue: float | None
    operating_income: float | None
    net_income: float | None

    # ▼▼▼ これらを追加してください ▼▼▼
    operating_cf: float | None
    investing_cf: float | None
    financing_cf: float | None
    total_assets: float | None
    net_assets: float | None
    period_end: strawberry.auto  # 日付も使うなら追加
    # ▲▲▲ ここまで ▲▲▲


@strawberry.django.type(AnalysisResult)
class AnalysisResultType:
    date: strawberry.auto
    stock_price: float | None
    market_cap: float | None
    f_score: int | None
    accruals_ratio: float | None
    ai_summary: str | None
    is_good_buy: bool


# @strawberry.django.type(Stock)
# class StockType:
#     code: str
#     name: str
#     sector: str | None
#     market: str | None
#     description: str | None
#     financials: List[FinancialStatementType]
#     analysis_results: List[AnalysisResultType]


@strawberry.type
class StockType:
    code: str
    name: str
    sector: str | None
    market: str | None
    description: str | None

    # AnalysisResultsはリストで返す（時系列分析のため）
    @strawberry.field
    def analysis_results(self) -> List[AnalysisResultType]:
        # self は Stock モデルのインスタンス
        return self.analysis_results.all().order_by("-date")

    @strawberry.field
    def financials(self) -> List[FinancialStatementType]:
        return self.financials.all().order_by("fiscal_year")


# --- Query Definition ---


@strawberry.type
class AnalysisResultType:
    # Basic
    date: strawberry.auto
    stock_price: float | None
    market_cap: float | None

    # Safety & Risk
    z_score: float | None  # New!
    f_score: int | None
    accruals_ratio: float | None

    # Structure & Growth
    gross_profitability: float | None  # New!
    roiic: float | None  # New!

    # Expectation
    implied_growth_rate: float | None  # New!

    # Verdict
    status: str  # New! (Hold, Sell, etc.)
    is_good_buy: bool
    ai_summary: str | None


@strawberry.type
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
    total_equity: float | None  # net_assets -> total_equity

    # CF
    operating_cf: float | None
    investing_cf: float | None
    financing_cf: float | None

    # New Data (必要に応じて公開)
    inventory: float | None
    capex: float | None


@strawberry.type
class Query:
    @strawberry.field
    def stocks(self) -> List[StockType]:
        return Stock.objects.all()

    @strawberry.field
    def stock(self, code: str) -> Optional[StockType]:
        return Stock.objects.filter(code=code).first()
