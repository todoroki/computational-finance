# backend/stocks/admin.py
from django.contrib import admin

from .models import FinancialIndicator, Stock


class FinancialIndicatorInline(admin.StackedInline):
    model = FinancialIndicator
    can_delete = False
    verbose_name_plural = "Financial Indicators"


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "sector", "market", "updated_at")
    search_fields = ("code", "name")
    # Stock編集画面の中に、Indicatorも一緒に表示する設定
    inlines = [FinancialIndicatorInline]
