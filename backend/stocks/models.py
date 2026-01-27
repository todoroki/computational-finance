import uuid6
from django.db import models
from django.utils.translation import gettext_lazy as _


class BaseModel(models.Model):
    """
    共通フィールドを持つ抽象ベースモデル
    IDをUUID7化し、作成・更新日時や論理削除フラグを自動管理します。
    """

    # IDをUUID7にする (時系列ソート可能かつユニーク)
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)

    # 運用・管理用フィールド
    is_active = models.BooleanField(
        "有効フラグ", default=True, help_text="Falseなら非表示"
    )
    is_deleted = models.BooleanField("論理削除フラグ", default=False)

    # タイムスタンプ (名前は統一します)
    created_at = models.DateTimeField("作成日時", auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField("更新日時", auto_now=True)

    class Meta:
        abstract = True  # DBにこのテーブルは作られない


class Stock(BaseModel):
    """
    銘柄マスター。
    """

    code = models.CharField("銘柄コード", max_length=10, unique=True, db_index=True)
    name = models.CharField("銘柄名", max_length=100)
    sector = models.CharField("業種", max_length=50, blank=True, null=True)
    market = models.CharField("市場", max_length=50, blank=True, null=True)
    description = models.TextField("事業内容", blank=True, null=True)

    # ▼▼▼ 追加: 日本語データ用フィールド (NULL許可) ▼▼▼
    japanese_name = models.CharField(max_length=200, null=True, blank=True)
    japanese_sector = models.CharField(max_length=100, null=True, blank=True)
    japanese_market = models.CharField(max_length=100, null=True, blank=True)
    # ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    def __str__(self):
        return f"{self.code} {self.name}"


class FinancialStatement(BaseModel):
    """
    【データ倉庫】
    決算データ（PL/BS/CF）
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

    # Analytics用詳細データ
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
    capex = models.DecimalField(
        "設備投資(CapEx)", max_digits=20, decimal_places=0, null=True
    )

    class Meta:
        unique_together = ("stock", "fiscal_year", "quarter")
        ordering = ["-fiscal_year", "-quarter"]

    def __str__(self):
        return f"{self.stock.code} ({self.fiscal_year} Q{self.quarter})"


class AnalysisResult(BaseModel):
    """
    【分析結果】
    """

    stock = models.ForeignKey(
        Stock, on_delete=models.CASCADE, related_name="analysis_results"
    )

    # 分析対象の日付（created_atとは別で、データの時点を表す）
    date = models.DateField("分析日", auto_now_add=True)

    financial_statement = models.OneToOneField(
        FinancialStatement, on_delete=models.CASCADE, related_name="analysis_result"
    )

    # --- 価格指標 ---
    stock_price = models.DecimalField(
        "株価", max_digits=10, decimal_places=2, null=True
    )
    market_cap = models.DecimalField(
        "時価総額", max_digits=20, decimal_places=0, null=True
    )

    # --- Scores ---
    z_score = models.FloatField("Altman Z-Score", null=True)
    f_score = models.IntegerField("Piotroski F-Score", null=True)
    accruals_ratio = models.FloatField("Accruals Ratio", null=True)
    gross_profitability = models.FloatField("Gross Profitability", null=True)
    roiic = models.FloatField("ROIIC", null=True)
    implied_growth_rate = models.FloatField("逆算DCF成長率(%)", null=True)
    implied_revenue_growth = models.FloatField(null=True, blank=True)  # 売上ベース

    # ▼▼▼ 追加: 現実と乖離 ▼▼▼
    actual_revenue_growth = models.FloatField(null=True, blank=True)  # 実績成長率
    expectation_gap = models.FloatField(null=True, blank=True)  # 期待乖離 (Gap)

    # --- 総合判定 ---
    status = models.CharField(
        "判定ステータス",
        max_length=20,
        default="Hold",
        help_text="Strong Buy, Sell etc",
    )
    is_good_buy = models.BooleanField("買いシグナル", default=False)
    ai_summary = models.TextField("AI分析要約", blank=True)

    # 1. 企業の状態 (State)
    # 例: "Cash Generator", "High Growth", "Distress", "Deteriorating"
    state = models.CharField(max_length=50, default="Unclear")

    # 2. 市場の期待構造 (Expectation)
    # 例: "Overheated", "Underestimated", "Reasonable", "Single Engine"
    expectation_structure = models.CharField(max_length=50, default="Neutral")

    # 3. リスクレベル (Risk)
    # 例: "Critical", "High", "Medium", "Low"
    risk_level = models.CharField(max_length=20, default="Low")

    # リスク要因の詳細 (カンマ区切りなどで保存)
    # 例: "Bankruptcy Risk, Earnings Manipulation"
    risk_details = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]  # BaseModelのcreated_atを使用
        get_latest_by = "created_at"

    def __str__(self):
        return f"Analysis for {self.stock.code} ({self.status})"


class StockFetchLog(BaseModel):
    """
    データ取得の実行ログ。
    BaseModelを継承することで、IDはUUIDになり、実行日時は created_at で管理されます。
    """

    STATUS_CHOICES = (
        ("SUCCESS", "Success"),
        ("FETCHING", "Fetching"),
        ("FAILURE", "Failure"),
    )

    stock = models.ForeignKey(
        Stock, on_delete=models.CASCADE, related_name="fetch_logs"
    )
    status = models.CharField("ステータス", max_length=10, choices=STATUS_CHOICES)
    source = models.CharField("取得元", max_length=50, default="yfinance")
    message = models.TextField("ログ詳細", blank=True, null=True)
    error_detail = models.JSONField("エラー詳細JSON", blank=True, null=True)

    # executed_at は BaseModel.created_at で代用するため削除しました

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            # created_at を使ったインデックスに修正
            models.Index(fields=["stock", "-created_at"]),
            models.Index(fields=["created_at", "status"]),
        ]

    def __str__(self):
        return f"{self.stock.code} - {self.status} at {self.created_at}"
