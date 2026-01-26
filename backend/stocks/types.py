from typing import List, Optional

import strawberry

from .models import AnalysisResult, FinancialStatement, Stock


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
