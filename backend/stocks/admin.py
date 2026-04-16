from django.contrib import admin
from django.utils.html import format_html

from .models import AnalysisResult, FinancialStatement, Stock


class FinancialStatementInline(admin.TabularInline):
    model = FinancialStatement
    extra = 0
    ordering = ("-fiscal_year", "-quarter")
    can_delete = False
    # 表示項目を絞って軽量化
    fields = ("fiscal_year", "quarter", "revenue", "operating_income", "net_income")
    readonly_fields = fields


class AnalysisResultInline(admin.StackedInline):
    model = AnalysisResult
    extra = 0
    ordering = ("-created_at",)
    can_delete = False
    # 横に長すぎるので、主要項目のみ表示
    fields = (("date", "status"), ("health_score", "z_score", "f_score"), "ai_summary")
    readonly_fields = (
        "date",
        "status",
        "health_score",
        "z_score",
        "f_score",
        "ai_summary",
    )


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    # 1. 表示項目に AI プロファイル情報を追加
    list_display = (
        "code",
        "name",
        "japanese_name",
        "sector_17_code_name",
        "has_ai_profile",
        "ai_profile_updated_at",
    )
    search_fields = ("code", "name", "japanese_name")
    list_filter = ("sector_17_code_name", "japanese_market")
    inlines = [FinancialStatementInline, AnalysisResultInline]

    # 2. 速度改善の設定
    show_full_result_count = (
        False  # 全件カウント（SELECT COUNT(*)）をスキップ。巨大なテーブルで有効
    )
    list_per_page = 50  # 1ページあたりの件数を絞る

    def has_ai_profile(self, obj):
        return bool(obj.ai_business_summary)

    has_ai_profile.boolean = True
    has_ai_profile.short_description = "AI要約あり"


@admin.register(FinancialStatement)
class FinancialStatementAdmin(admin.ModelAdmin):
    list_display = ("get_stock_code", "fiscal_year", "quarter", "revenue", "net_income")
    list_filter = ("fiscal_year", "quarter")
    search_fields = ("stock__code", "stock__name")

    # 🚀 重い原因の解決: N+1問題を回避するために関連モデルを一括取得
    list_select_related = ("stock",)

    def get_stock_code(self, obj):
        return f"{obj.stock.code} {obj.stock.name}"

    get_stock_code.short_description = "銘柄"


@admin.register(AnalysisResult)
class AnalysisResultAdmin(admin.ModelAdmin):
    list_display = (
        "get_stock_code",
        "date",
        "status",
        "health_score",
        "f_score",
        "is_good_buy",
    )
    list_filter = ("status", "is_good_buy", "date")
    search_fields = ("stock__code", "stock__name")

    # 🚀 重い原因の解決: N+1問題を回避
    list_select_related = ("stock",)

    def get_stock_code(self, obj):
        return f"{obj.stock.code} {obj.stock.name}"

    get_stock_code.short_description = "銘柄"
