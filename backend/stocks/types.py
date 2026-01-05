# backend/stocks/types.py
from typing import List

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


@strawberry.django.type(Stock)
class StockType:
    code: str
    name: str
    sector: str | None
    market: str | None
    description: str | None
    financials: List[FinancialStatementType]
    analysis_results: List[AnalysisResultType]
