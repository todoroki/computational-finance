# backend/stocks/types.py
from typing import List

import strawberry

# from strawberry import auto
from .models import AnalysisResult, FinancialStatement, Stock


@strawberry.django.type(FinancialStatement)
class FinancialStatementType:
    fiscal_year: int
    quarter: int
    revenue: float | None
    operating_income: float | None
    net_income: float | None
    # 必要なフィールドをここに追加


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

    # リレーション（逆参照）
    # Stock 1つに対して、複数の決算(financials)と分析(analysis_results)がある
    financials: List[FinancialStatementType]
    analysis_results: List[AnalysisResultType]
