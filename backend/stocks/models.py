from django.db import models
from django.utils.translation import gettext_lazy as _


class Stock(models.Model):
    """
    銘柄マスター。基本情報は変わらないのでここはシンプルに。
    """

    code = models.CharField("銘柄コード", max_length=10, unique=True, db_index=True)
    name = models.CharField("銘柄名", max_length=100)
    sector = models.CharField("業種", max_length=50, blank=True, null=True)
    market = models.CharField("市場", max_length=50, blank=True, null=True)
    description = models.TextField("事業内容", blank=True, null=True)

    # メタデータ
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code} {self.name}"


class FinancialStatement(models.Model):
    """
    【データ倉庫】
    決算データ（PL/BS/CF）の生数値を時系列で保存する。
    Analysisのための原材料。
    """

    PERIOD_CHOICES = (
        (1, "第1四半期"),
        (2, "第2四半期"),
        (3, "第3四半期"),
        (4, "通期"),
    )

    stock = models.ForeignKey(
        Stock, on_delete=models.CASCADE, related_name="financials"
    )

    # 時系列キー
    fiscal_year = models.IntegerField("決算年度", help_text="例: 2024")
    quarter = models.IntegerField(
        "四半期", choices=PERIOD_CHOICES, default=4, help_text="通期なら4"
    )
    period_end = models.DateField("決算期末日", null=True, blank=True)

    # === PL (損益計算書) ===
    revenue = models.DecimalField("売上高", max_digits=20, decimal_places=0, null=True)
    operating_income = models.DecimalField(
        "営業利益", max_digits=20, decimal_places=0, null=True
    )
    net_income = models.DecimalField(
        "当期純利益", max_digits=20, decimal_places=0, null=True
    )

    # New for Analytics
    ebit = models.DecimalField(
        "EBIT",
        max_digits=20,
        decimal_places=0,
        null=True,
        help_text="利払前・税引前利益",
    )
    interest_expense = models.DecimalField(
        "支払利息", max_digits=20, decimal_places=0, null=True
    )
    depreciation = models.DecimalField(
        "減価償却費", max_digits=20, decimal_places=0, null=True
    )

    # === BS (貸借対照表) ===
    total_assets = models.DecimalField(
        "総資産", max_digits=20, decimal_places=0, null=True
    )
    total_equity = models.DecimalField(
        "純資産(株主資本)",
        max_digits=20,
        decimal_places=0,
        null=True,
        help_text="旧net_assets",
    )

    current_assets = models.DecimalField(
        "流動資産", max_digits=20, decimal_places=0, null=True
    )
    current_liabilities = models.DecimalField(
        "流動負債", max_digits=20, decimal_places=0, null=True
    )
    long_term_debt = models.DecimalField(
        "長期負債", max_digits=20, decimal_places=0, null=True
    )

    # New for Analytics
    inventory = models.DecimalField(
        "棚卸資産(在庫)", max_digits=20, decimal_places=0, null=True
    )
    retained_earnings = models.DecimalField(
        "利益剰余金", max_digits=20, decimal_places=0, null=True
    )

    # === CF (キャッシュフロー計算書) ===
    operating_cf = models.DecimalField(
        "営業CF", max_digits=20, decimal_places=0, null=True
    )
    investing_cf = models.DecimalField(
        "投資CF", max_digits=20, decimal_places=0, null=True
    )
    financing_cf = models.DecimalField(
        "財務CF", max_digits=20, decimal_places=0, null=True
    )

    # New for Analytics
    capex = models.DecimalField(
        "設備投資(CapEx)", max_digits=20, decimal_places=0, null=True
    )

    class Meta:
        # 同じ銘柄・同じ年度・同じ四半期のデータは重複させない
        unique_together = ("stock", "fiscal_year", "quarter")
        ordering = ["-fiscal_year", "-quarter"]

    def __str__(self):
        return f"{self.stock.code} ({self.fiscal_year} Q{self.quarter})"


class AnalysisResult(models.Model):
    """
    【分析結果】
    FinancialStatementを元に計算された機関投資家級スコア。
    ロジックが変わったら再計算して上書きする。
    """

    stock = models.ForeignKey(
        Stock, on_delete=models.CASCADE, related_name="analysis_results"
    )

    # どの時点の分析か
    date = models.DateField("分析日", auto_now_add=True)
    financial_statement = models.OneToOneField(  # OneToOneに変更(1決算につき1分析)
        FinancialStatement, on_delete=models.CASCADE, related_name="analysis_result"
    )

    # --- 価格指標 (その時点の) ---
    stock_price = models.DecimalField(
        "株価", max_digits=10, decimal_places=2, null=True
    )
    market_cap = models.DecimalField(
        "時価総額", max_digits=20, decimal_places=0, null=True
    )

    # ==========================================
    # 🧱 Safety & Risk (安全装置)
    # ==========================================
    z_score = models.FloatField(
        "Altman Z-Score", null=True, help_text="倒産リスク (3.0以上で安全)"
    )

    # ==========================================
    # 🔍 Quality (利益の質)
    # ==========================================
    f_score = models.IntegerField(
        "Piotroski F-Score", null=True, help_text="0-9点 (7点以上で優秀)"
    )
    accruals_ratio = models.FloatField(
        "Accruals Ratio", null=True, help_text="低いほうが良い (<0.05)"
    )

    # ==========================================
    # 📈 Structure (構造的強さ)
    # ==========================================
    gross_profitability = models.FloatField(
        "Gross Profitability", null=True, help_text="粗利/総資産 (0.33以上で優秀)"
    )
    roiic = models.FloatField("ROIIC", null=True, help_text="増分投下資本利益率")

    # ==========================================
    # 🔮 Expectation (期待値)
    # ==========================================
    implied_growth_rate = models.FloatField(
        "逆算DCF成長率(%)", null=True, help_text="現在の株価が織り込む成長率"
    )

    # --- 総合判定 ---
    status = models.CharField(
        "判定ステータス",
        max_length=20,
        default="Hold",
        help_text="Strong Buy, Sell etc",
    )
    is_good_buy = models.BooleanField("買いシグナル", default=False)
    ai_summary = models.TextField("AI分析要約", blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        get_latest_by = "created_at"

    def __str__(self):
        return f"Analysis for {self.stock.code} ({self.status})"


class StockFetchLog(models.Model):
    """
    データ取得の実行ログ。
    Append Only（追記のみ）で運用し、履歴管理を行う。
    """

    id = models.BigAutoField(primary_key=True)  # IDを明示的に指定(Warning対策)

    STATUS_CHOICES = (
        ("SUCCESS", "Success"),
        ("FETCHING", "Fetching"),  # 実行中
        ("FAILURE", "Failure"),
    )

    stock = models.ForeignKey(
        Stock, on_delete=models.CASCADE, related_name="fetch_logs"
    )
    status = models.CharField("ステータス", max_length=10, choices=STATUS_CHOICES)

    source = models.CharField("取得元", max_length=50, default="yfinance")
    message = models.TextField("ログ詳細", blank=True, null=True)

    # エラーが発生した時のトレースバック等をJSONで残すのはアリです（必須ではない）
    error_detail = models.JSONField("エラー詳細JSON", blank=True, null=True)

    executed_at = models.DateTimeField("実行日時", auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-executed_at"]
        indexes = [
            models.Index(
                fields=["stock", "-executed_at"]
            ),  # 「ある銘柄の最新ログ」を速く引く
            models.Index(fields=["executed_at", "status"]),  # 「今日の失敗」を速く引く
        ]

    def __str__(self):
        return f"{self.stock.code} - {self.status} at {self.executed_at}"
