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
    EDINETやyfinanceから取得した値をそのまま突っ込む場所。
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

    # --- PL (損益計算書) ---
    revenue = models.DecimalField("売上高", max_digits=20, decimal_places=0, null=True)
    operating_income = models.DecimalField(
        "営業利益", max_digits=20, decimal_places=0, null=True
    )
    net_income = models.DecimalField(
        "当期純利益", max_digits=20, decimal_places=0, null=True
    )

    # --- BS (貸借対照表) ---
    total_assets = models.DecimalField(
        "総資産", max_digits=20, decimal_places=0, null=True
    )
    net_assets = models.DecimalField(
        "純資産", max_digits=20, decimal_places=0, null=True
    )
    current_assets = models.DecimalField(
        "流動資産", max_digits=20, decimal_places=0, null=True
    )
    current_liabilities = models.DecimalField(
        "流動負債", max_digits=20, decimal_places=0, null=True
    )

    # --- CF (キャッシュフロー計算書) ---
    operating_cf = models.DecimalField(
        "営業CF", max_digits=20, decimal_places=0, null=True
    )
    investing_cf = models.DecimalField(
        "投資CF", max_digits=20, decimal_places=0, null=True
    )
    financing_cf = models.DecimalField(
        "財務CF", max_digits=20, decimal_places=0, null=True
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
    FinancialStatementを元に計算されたスコア。
    ロジックが変わったら再計算して上書きする。
    """

    stock = models.ForeignKey(
        Stock, on_delete=models.CASCADE, related_name="analysis_results"
    )

    # どの時点の分析か
    date = models.DateField("分析日", auto_now_add=True)
    financial_statement = models.ForeignKey(
        FinancialStatement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="根拠となった決算データ",
    )

    # --- 価格指標 (その時点の) ---
    stock_price = models.DecimalField(
        "株価", max_digits=10, decimal_places=2, null=True
    )
    market_cap = models.DecimalField(
        "時価総額", max_digits=20, decimal_places=0, null=True
    )

    # --- Layer 1: Structural (構造スコア) ---
    f_score = models.IntegerField("Piotroski F-Score", null=True, help_text="0-9点")
    accruals_ratio = models.FloatField(
        "Accruals Ratio", null=True, help_text="低いほうが良い"
    )

    # --- Layer 2: Cyclical (サイクル) ---
    # ΔNOAなどは「前年との比較」が必要なので、計算時に前年のFinancialStatementを参照して算出する
    delta_noa = models.FloatField("ΔNOA", null=True, help_text="純営業資産の変化率")

    # --- AIコメント ---
    ai_summary = models.TextField("AI分析要約", blank=True)
    is_good_buy = models.BooleanField("買いシグナル", default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        get_latest_by = "created_at"

    def __str__(self):
        return f"Analysis for {self.stock.code} at {self.date}"
