# backend/stocks/models.py
from django.db import models


class Stock(models.Model):
    code = models.CharField("銘柄コード", max_length=10, unique=True, db_index=True)
    name = models.CharField("銘柄名", max_length=100)
    sector = models.CharField("業種", max_length=50, blank=True, null=True)
    market = models.CharField(
        "市場", max_length=50, blank=True, null=True
    )  # プライム、スタンダードなど

    description = models.TextField("事業内容", blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code} {self.name}"


class FinancialIndicator(models.Model):
    """
    計算済みの指標を格納するテーブル。
    毎回計算すると重いので、バッチ処理で計算してここに保存する戦略。
    """

    stock = models.OneToOneField(
        Stock, on_delete=models.CASCADE, related_name="indicator"
    )

    # --- 基本指標 ---
    price = models.DecimalField("現在株価", max_digits=10, decimal_places=2, null=True)
    per = models.FloatField("PER", null=True)
    pbr = models.FloatField("PBR", null=True)
    roe = models.FloatField("ROE", null=True)

    # --- マニアック指標 (計算結果を入れる) ---
    f_score = models.IntegerField(
        "Piotroski F-Score", null=True, help_text="0-9点。財務健全性"
    )
    sloan_ratio = models.FloatField(
        "Sloan Ratio", null=True, help_text="利益の質。高いと危険"
    )
    roic = models.FloatField("ROIC", null=True, help_text="投下資本利益率")
    wacc = models.FloatField("WACC", null=True, help_text="加重平均資本コスト")

    # --- AI分析 ---
    ai_analysis = models.TextField("AI分析コメント", blank=True, null=True)
    ai_score = models.IntegerField("AI総合スコア", null=True, help_text="0-100点")

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Indicators for {self.stock.code}"
