from typing import Any, Dict, List

from django.db.models import Sum

from .models import AnalysisResult, Portfolio

# 🌍 世界観（Narrative）の定義
# 数値ではなく「構造」としての依存先を定義する
NARRATIVES = {
    "LowRate": {
        "label": "低金利・金融緩和",
        "description": "金利上昇局面で脆弱になる可能性があります。",
        "tags": ["tag_zombie", "tag_high_volatility", "tag_accounting_risk"],
        "weight": 1.2,  # 依存度の重み
        "risk_scenario": "金利急騰 / 金融引き締め",
    },
    "HighGrowth": {
        "label": "高成長の継続",
        "description": "成長鈍化や期待剥落で大きく毀損する可能性があります。",
        "tags": ["tag_single_engine", "tag_fragile"],
        "weight": 1.5,
        "risk_scenario": "成長神話の崩壊 / マルチプル収縮",
    },
    "EconomicExpansion": {
        "label": "景気拡大・信用環境良好",
        "description": "不況入りやクレジット収縮に弱い構造です。",
        "tags": ["tag_turnaround", "tag_silent_improver"],
        "weight": 1.0,
        "risk_scenario": "景気後退 / リセッション",
    },
    "QualityPreference": {
        "label": "クオリティ評価の継続",
        "description": "質へのプレミアムが剥落する投機相場では劣後する可能性があります。",
        "tags": ["tag_quality_growth", "tag_institutional", "tag_cash_cow"],
        "weight": 0.5,  # 守りの属性なので依存リスクとしては軽めに見積もる
        "risk_scenario": "質の無視 / 投機的熱狂",
    },
}


class PortfolioAnalyzer:
    """
    ポートフォリオ全体を診断し、資産の健康状態、リスクの偏り、
    そして「物語（Narrative）」への依存度を分析する脳みそ。
    """

    def __init__(self, portfolio: Portfolio):
        self.portfolio = portfolio

    def analyze(self) -> Dict[str, Any]:
        # 1. 構成銘柄と最新の分析データを取得
        items = self.portfolio.items.select_related("stock").all()

        total_value = 0.0
        holdings = []

        # データ収集 & 時価計算
        for item in items:
            # 最新の分析結果を取得 (AnalysisResultは -date 順になっている前提)
            analysis = item.stock.analysis_results.first()
            if not analysis:
                continue

            current_price = float(analysis.stock_price or 0)
            quantity = float(item.quantity)
            market_value = current_price * quantity

            total_value += market_value

            holdings.append(
                {
                    "stock": item.stock,
                    "code": item.stock.code,
                    "name": item.stock.name,
                    "quantity": quantity,
                    "market_value": market_value,
                    "analysis": analysis,
                }
            )

        if total_value == 0:
            return self._empty_result()

        # 2. タグ集計 (Tag Exposure)
        # 資産の何%が「ゾンビ」で、何%が「盤石」か？
        tag_exposure = {
            "tag_safety_shield": 0.0,
            "tag_cash_cow": 0.0,  # Safety
            "tag_quality_growth": 0.0,
            "tag_institutional": 0.0,  # Quality
            "tag_single_engine": 0.0,
            "tag_high_volatility": 0.0,  # Speculative
            "tag_silent_improver": 0.0,
            "tag_turnaround": 0.0,  # Turnaround
            "tag_zombie": 0.0,
            "tag_accounting_risk": 0.0,
            "tag_fragile": 0.0,  # Risk
        }

        # 3. カテゴリ集計 (Category Exposure)
        # 優先順位: Risk > Speculative > Quality > Safety > Neutral
        # 「死ぬ銘柄が混じってないか」を最優先で検知する心理的順序
        category_exposure = {
            "Safety": 0.0,  # 守り
            "Quality": 0.0,  # 王道
            "Speculative": 0.0,  # 攻め (リスク許容)
            "Risk": 0.0,  # 危険 (回避推奨)
            "Neutral": 0.0,  # その他
        }

        # 4. ループ処理で重み付け加算
        for h in holdings:
            weight = (h["market_value"] / total_value) * 100  # %単位
            analysis = h["analysis"]

            # --- タグ集計 ---
            for tag_key in tag_exposure.keys():
                if getattr(analysis, tag_key):
                    tag_exposure[tag_key] += weight

            # --- カテゴリ判定 ---
            assigned_cat = "Neutral"
            if (
                getattr(analysis, "tag_zombie")
                or getattr(analysis, "tag_fragile")
                or getattr(analysis, "tag_accounting_risk")
            ):
                assigned_cat = "Risk"
            elif (
                getattr(analysis, "tag_single_engine")
                or getattr(analysis, "tag_high_volatility")
                or getattr(analysis, "tag_turnaround")
            ):
                assigned_cat = "Speculative"
            elif getattr(analysis, "tag_quality_growth"):
                assigned_cat = "Quality"
            elif (
                getattr(analysis, "tag_safety_shield")
                or getattr(analysis, "tag_institutional")
                or getattr(analysis, "tag_cash_cow")
            ):
                assigned_cat = "Safety"

            category_exposure[assigned_cat] += weight

        # 5. Narrative Dependency Index (NDI) の計算
        # 「このポートフォリオは、どの世界観(前提)に賭けているか？」
        narrative_dependencies = []

        for key, meta in NARRATIVES.items():
            dependency_score = 0.0
            for tag in meta["tags"]:
                dependency_score += tag_exposure.get(tag, 0.0)

            # 重み付けを行い、最大100%に丸める
            final_dependency = min(100.0, dependency_score * meta["weight"])

            narrative_dependencies.append(
                {
                    "key": key,
                    "label": meta["label"],
                    "dependency_score": final_dependency,  # 依存度 (%)
                    "description": meta["description"],
                    "risk_scenario": meta["risk_scenario"],
                }
            )

        # 依存度が高い順にソート
        narrative_dependencies.sort(key=lambda x: x["dependency_score"], reverse=True)

        # 6. 健康スコア計算 (Health Score)
        # ゲーム性を持たせるスコア設計
        score = 80.0  # 基礎点

        # 減点: リスク要因
        score -= category_exposure["Risk"] * 1.5

        # 減点: 過度な投機 (30%を超えた分)
        if category_exposure["Speculative"] > 30:
            score -= (category_exposure["Speculative"] - 30) * 0.5

        # 加点: 安全性と質 (ボーナス)
        if category_exposure["Safety"] > 50:
            score += 5.0
        if category_exposure["Quality"] > 30:
            score += 5.0

        health_score = int(max(0, min(100, score)))

        # 診断コメント生成 (NDIベースへ進化)
        diagnosis_summary = self._generate_summary(
            health_score, category_exposure, narrative_dependencies
        )

        return {
            "total_value": total_value,
            "health_score": health_score,
            "diagnosis_summary": diagnosis_summary,
            "category_exposure": category_exposure,
            "tag_exposure": tag_exposure,
            # 旧 narrative_analysis を NDI (narrative_dependencies) に置き換え
            # 型定義(JSON)なので構造変更は柔軟に対応可能
            "narrative_analysis": narrative_dependencies,
            "holdings": holdings,
        }

    def _generate_summary(self, score, cats, narratives):
        """
        スコアとNDIから、ユーザーの「無意識の前提」を言語化する。
        """
        # 最も依存している物語を取得
        top_narrative = narratives[0] if narratives else None

        # 1. 危険水準
        if score < 40:
            if top_narrative and top_narrative["dependency_score"] > 50:
                return f"危険水準です。あなたの資産は「{top_narrative['label']}」という前提に極端に依存しており、{top_narrative['risk_scenario']}で崩壊する恐れがあります。"
            return "危険水準です。早急に「ゾンビ企業」や「前提崩壊リスク」の高い銘柄の整理を検討してください。"

        # 2. 注意水準
        elif score < 60:
            if top_narrative and top_narrative["dependency_score"] > 40:
                return f"注意が必要です。ポートフォリオの{top_narrative['dependency_score']:.0f}%が「{top_narrative['label']}」に依存しています。{top_narrative['risk_scenario']}への備えは十分ですか？"
            return "バランスが悪化しています。一部のリスク銘柄がポートフォリオ全体の足を引っ張っています。"

        # 3. 良好水準
        elif score < 80:
            if top_narrative and top_narrative["dependency_score"] > 30:
                return f"概ね良好ですが、「{top_narrative['label']}」への依存が見られます。{top_narrative['risk_scenario']}が起きた場合のシナリオを想定しておきましょう。"
            return "バランスの取れたポートフォリオです。過度なリスクを取らず、安定した運用が期待できます。"

        # 4. 極めて優秀
        else:
            return "極めて健全なポートフォリオです。防御力と質のバランスが黄金比に近く、特定の物語への過度な依存も見られません。"

    def _empty_result(self):
        return {
            "total_value": 0,
            "health_score": 0,
            "diagnosis_summary": "ポートフォリオが空です。銘柄を追加してください。",
            "category_exposure": {},
            "tag_exposure": {},
            "narrative_analysis": [],
            "holdings": [],
        }
