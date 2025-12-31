# backend/stocks/types.py
import strawberry

from .models import FinancialIndicator, Stock


@strawberry.django.type(FinancialIndicator)
class FinancialIndicatorType:
    price: float
    per: float | None
    pbr: float | None
    roe: float | None
    f_score: int | None
    sloan_ratio: float | None
    roic: float | None
    ai_analysis: str | None
    ai_score: int | None


@strawberry.django.type(Stock)
class StockType:
    code: str
    name: str
    sector: str | None
    market: str | None
    description: str | None
    # リレーション（Indicator）をここで繋ぐ
    indicator: FinancialIndicatorType | None
