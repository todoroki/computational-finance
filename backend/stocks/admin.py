from django.contrib import admin

from .models import AnalysisResult, FinancialStatement, Stock


class FinancialStatementInline(admin.TabularInline):
    """Stock画面の中に、決算データをリスト表示する"""

    model = FinancialStatement
    extra = 0
    ordering = ("-fiscal_year", "-quarter")
    # 編集不可にしておく（データ保全のため）
    can_delete = False


class AnalysisResultInline(admin.TabularInline):
    """Stock画面の中に、分析結果を表示する"""

    model = AnalysisResult
    extra = 0
    ordering = ("-created_at",)
    can_delete = False


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "sector", "market", "updated_at")
    search_fields = ("code", "name")
    # Stockの詳細画面を開くと、下に関連データがズラッと出るようにする
    inlines = [FinancialStatementInline, AnalysisResultInline]


@admin.register(FinancialStatement)
class FinancialStatementAdmin(admin.ModelAdmin):
    list_display = ("stock", "fiscal_year", "quarter", "revenue", "net_income")
    list_filter = ("fiscal_year", "quarter")
    search_fields = ("stock__code", "stock__name")


@admin.register(AnalysisResult)
class AnalysisResultAdmin(admin.ModelAdmin):
    list_display = ("stock", "date", "f_score", "is_good_buy", "stock_price")
    list_filter = ("is_good_buy", "date")
