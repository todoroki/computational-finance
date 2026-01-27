from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


@dataclass
class FinancialMetricsInput:
    """
    指標計算に必要な財務データの入力構造体。
    yfinance等から取得した生データをこの形式に詰めて計算機に渡す。
    欠損値は None ではなく 0.0 (または適切なデフォルト値) を入れて渡すことを想定。
    """

    # PL (損益計算書)
    revenue: float
    operating_income: float
    net_income: float
    ebit: float  # Earnings Before Interest and Taxes (Altman Z-Score, ICR用)
    interest_expense: float  # 支払利息 (ICR用)
    depreciation: float  # 減価償却費 (Reinvestment Rate用)

    # BS (貸借対照表)
    total_assets: float
    total_equity: float  # 旧 net_assets。株主資本。Dupont分析の分母。
    current_assets: float
    current_liabilities: float
    inventory: float
    retained_earnings: float
    long_term_debt: float

    # CF (キャッシュフロー計算書)
    operating_cf: float
    investing_cf: float
    capex: float  # Capital Expenditure (Reinvestment Rate用)

    # Market (市況)
    stock_price: float = 0.0
    market_cap: float = 0.0
    beta: float = 1.0

    # Previous Year (前年度データ - 成長性や変化率の計算に必須)
    prev_revenue: Optional[float] = None
    prev_operating_income: Optional[float] = None
    prev_net_income: Optional[float] = None
    prev_total_assets: Optional[float] = None
    prev_current_assets: Optional[float] = None
    prev_current_liabilities: Optional[float] = None
    prev_inventory: Optional[float] = None
    prev_long_term_debt: Optional[float] = None
    sector: str = "Unknown"


class FinancialCalculator:
    """
    機関投資家級の財務指標を計算する静的メソッド集。
    Stateを持たず、入力データのみに基づいて純粋な計算を行う。
    """

    # ==========================================
    # 🧱 Safety & Risk (安全装置)
    # ==========================================

    @staticmethod
    def calculate_altman_z_score(data: FinancialMetricsInput) -> Optional[float]:
        """
        【Altman Z-Score】
        倒産リスクを予測する指標。
        Formula: 1.2A + 1.4B + 3.3C + 0.6D + 1.0E
        """
        if not data.total_assets or not data.current_liabilities:
            return None

        working_capital = data.current_assets - data.current_liabilities
        total_liabilities = data.long_term_debt + data.current_liabilities

        A = working_capital / data.total_assets
        B = data.retained_earnings / data.total_assets
        C = data.ebit / data.total_assets
        D = data.market_cap / total_liabilities if total_liabilities > 0 else 0
        E = data.revenue / data.total_assets

        return 1.2 * A + 1.4 * B + 3.3 * C + 0.6 * D + 1.0 * E

    @staticmethod
    def classify_altman_zone(z: float) -> str:
        """
        Z-Scoreの判定ヘルパー
        Returns: 'distress' | 'grey' | 'safe'
        """
        if z < 1.81:
            return "distress"  # 倒産リスク高
        elif z < 2.99:
            return "grey"  # 警戒
        else:
            return "safe"  # 安全

    @staticmethod
    def calculate_interest_coverage(data: FinancialMetricsInput) -> Optional[float]:
        """
        【Interest Coverage Ratio (ICR)】
        金利上昇耐性。「金利が上がったら死ぬか？」の即死判定。
        Formula: EBIT / Interest Expense

        Note:
            < 1.5: 危険 (稼ぎが利払いで消える)
            1.5 - 3.0: 警戒
            > 5.0: 安全
        """
        # interest_expenseは通常正の値で入ってくる想定だが、符号に注意
        # yfinanceでは負の値(支出)として入ることもあるため絶対値をとるのが安全
        interest = abs(data.interest_expense)
        if interest == 0:
            return None  # 無借金に近い、またはデータなし

        return data.ebit / interest

    # ==========================================
    # 🔍 Quality of Earnings (利益の質)
    # ==========================================

    @staticmethod
    def calculate_accruals_ratio(data: FinancialMetricsInput) -> float:
        """
        【Accruals Ratio (Sloan Ratio)】
        会計上の利益とキャッシュフローの乖離。
        Formula: (Net Income - Operating CF) / Total Assets

        Note:
            高い正の値 → 利益の質が悪い（粉飾リスク）
            マイナス → キャッシュ主導（良）
        """
        if not data.total_assets:
            return 0.0
        return (data.net_income - data.operating_cf) / data.total_assets

    @staticmethod
    def calculate_earnings_quality(data: FinancialMetricsInput) -> Optional[float]:
        """
        【Earnings Quality Score】
        利益がキャッシュに裏付けられているか。
        Formula: Operating CF / Net Income
        """
        if data.net_income == 0:
            return None
        return data.operating_cf / data.net_income

    @staticmethod
    def calculate_delta_noa(data: FinancialMetricsInput) -> Optional[float]:
        """
        【ΔNOA】
        資産の積み増しによる見せかけの成長を検知。
        """
        if data.prev_current_assets is None or data.prev_current_liabilities is None:
            return None

        noa = data.current_assets - data.current_liabilities
        prev_noa = data.prev_current_assets - data.prev_current_liabilities
        delta_noa = noa - prev_noa

        return delta_noa / data.total_assets if data.total_assets else None

    @staticmethod
    def calculate_inventory_quality(data: FinancialMetricsInput) -> Optional[float]:
        """
        【Inventory Quality Index】
        在庫の伸び vs 売上の伸び。
        """
        if (
            data.prev_inventory is None
            or data.prev_inventory == 0
            or data.prev_revenue is None
            or data.prev_revenue == 0
        ):
            return None

        inv_growth = (data.inventory - data.prev_inventory) / data.prev_inventory
        rev_growth = (data.revenue - data.prev_revenue) / data.prev_revenue

        return inv_growth - rev_growth

    # ==========================================
    # 📈 Quality of Growth & Structure (成長の質・構造)
    # ==========================================

    @staticmethod
    def calculate_gross_profitability(data: FinancialMetricsInput) -> float:
        """
        【Gross Profitability】
        構造的な稼ぐ力。クオリティ投資の核心。
        """
        if not data.total_assets:
            return 0.0
        return data.operating_income / data.total_assets

    @staticmethod
    def calculate_cbop(data: FinancialMetricsInput) -> float:
        """
        【CBOP】
        現金ベースの収益性。
        """
        if not data.total_assets:
            return 0.0
        return data.operating_cf / data.total_assets

    @staticmethod
    def calculate_roiic(data: FinancialMetricsInput) -> Optional[float]:
        """
        【ROIIC】
        増分投資利益率。「今の投資」が報われているか。
        """
        if data.prev_operating_income is None or data.prev_total_assets is None:
            return None

        delta_op_income = data.operating_income - data.prev_operating_income
        delta_invested_capital = data.total_assets - data.prev_total_assets

        if delta_invested_capital <= 0:
            return None

        return delta_op_income / delta_invested_capital

    @staticmethod
    def calculate_reinvestment_rate(data: FinancialMetricsInput) -> Optional[float]:
        """
        【Reinvestment Rate】
        成長を持続するためにどれだけ再投資しているか。
        Formula: (CapEx - Depreciation) / Operating CF

        Note:
            高すぎる(>1.0) = 稼ぎ以上に投資している（資金ショート懸念、あるいは超成長期）
            低すぎる(<0) = 縮小均衡
        """
        if data.operating_cf == 0:
            return None

        # yfinanceのCapExは通常負の値で入るため符号反転して正にするのが一般的だが、
        # 入力データが絶対値(正)であることを期待する実装にする。
        # 呼び出し元で符号制御が必要。ここでは絶対値として扱う。
        capex = abs(data.capex)
        depreciation = abs(data.depreciation)

        return (capex - depreciation) / data.operating_cf

    @staticmethod
    def calculate_dupont_breakdown(data: FinancialMetricsInput) -> dict:
        """
        【Dupont Analysis】
        ROE分解。
        Formula: Profit Margin * Asset Turnover * Financial Leverage
        """
        if not data.total_equity or not data.total_assets or not data.revenue:
            return {}

        return {
            "net_profit_margin": data.net_income / data.revenue,
            "asset_turnover": data.revenue / data.total_assets,
            # 修正: net_assets -> total_equity
            "financial_leverage": data.total_assets / data.total_equity,
            "roe": data.net_income / data.total_equity,
        }

    # ==========================================
    # 🔮 Expectation (期待値)
    # ==========================================

    @staticmethod
    def calculate_implied_growth_rate(
        data: FinancialMetricsInput,
        risk_free_rate: float = 0.01,
        market_risk_premium: float = 0.06,
    ) -> Optional[float]:
        """
        【Market-Implied Growth Rate (逆算DCF)】
        今の株価が織り込む成長率。
        """
        if data.market_cap <= 0:
            return None

        cost_of_equity = risk_free_rate + (data.beta * market_risk_premium)
        fcf = data.operating_cf + data.investing_cf

        if fcf <= 0:
            return None

        g = cost_of_equity - (fcf / data.market_cap)
        return g * 100

    @staticmethod
    def calculate_equity_duration_proxy(
        data: FinancialMetricsInput, discount_rate: float = 0.08
    ) -> Optional[float]:
        """
        【Equity Duration Proxy】
        金利感応度。
        """
        implied_g = FinancialCalculator.calculate_implied_growth_rate(data)
        if implied_g is None:
            return None

        g_decimal = implied_g / 100
        if discount_rate <= g_decimal:
            return 50.0

        return 1 / (discount_rate - g_decimal)

    # ==========================================
    # 📊 Legacy / Composite (複合スコア)
    # ==========================================

    @staticmethod
    def calculate_piotroski_f_score(
        data: FinancialMetricsInput,
    ) -> Tuple[int, List[str]]:
        """
        【Piotroski F-Score】
        9点満点の健全性スコア。
        """
        score = 0
        reasons = []

        if data.prev_total_assets is None:
            return 0, ["データ不足"]

        # 1. Profitability
        roa = data.net_income / data.total_assets if data.total_assets else 0
        prev_roa = (
            data.prev_net_income / data.prev_total_assets
            if data.prev_total_assets
            else 0
        )

        if data.net_income > 0:
            score += 1
            reasons.append("純利益黒字")
        if data.operating_cf > 0:
            score += 1
            reasons.append("営業CF黒字")
        if roa > prev_roa:
            score += 1
            reasons.append("ROA改善")
        if data.operating_cf > data.net_income:
            score += 1
            reasons.append("CF>純利益")

        # 2. Leverage/Liquidity
        lev = data.long_term_debt / data.total_assets if data.total_assets else 0
        prev_lev = (
            data.prev_long_term_debt / data.prev_total_assets
            if data.prev_long_term_debt is not None
            else 0
        )

        if lev <= prev_lev:
            score += 1
            reasons.append("レバレッジ改善")

        curr_ratio = (
            data.current_assets / data.current_liabilities
            if data.current_liabilities
            else 0
        )
        prev_curr_ratio = (
            data.prev_current_assets / data.prev_current_liabilities
            if data.prev_current_liabilities
            else 0
        )

        if curr_ratio > prev_curr_ratio:
            score += 1
            reasons.append("流動比率改善")

        score += 1
        reasons.append("希薄化なし(仮)")

        # 3. Efficiency
        margin = data.operating_income / data.revenue if data.revenue else 0
        prev_margin = (
            data.prev_operating_income / data.prev_revenue if data.prev_revenue else 0
        )

        if margin > prev_margin:
            score += 1
            reasons.append("マージン改善")

        turnover = data.revenue / data.total_assets if data.total_assets else 0
        prev_turnover = (
            data.prev_revenue / data.prev_total_assets if data.prev_total_assets else 0
        )

        if turnover > prev_turnover:
            score += 1
            reasons.append("回転率改善")

        return score, reasons

    @staticmethod
    def get_target_margin(sector: str) -> float:
        """
        プロの一手: セクターごとの標準的な「成熟後のFCFマージン」を返す。
        これを固定値(0.1)にしないことで、分析の精度が劇的に上がる。
        """
        # 簡易マッピング (必要に応じて微調整してください)
        sector_margins = {
            "Information & Communication": 0.20,  # 情報通信 (SaaS等は高収益)
            "Pharmaceutical": 0.20,  # 医薬品
            "Services": 0.10,  # サービス
            "Electric Appliances": 0.08,  # 電気機器
            "Transportation Equipment": 0.06,  # 輸送用機器 (自動車など)
            "Retail Trade": 0.04,  # 小売 (薄利多売)
            "Wholesale Trade": 0.03,  # 卸売
            "Construction": 0.05,  # 建設
            "Banks": 0.15,  # 銀行
            "Real Estate": 0.12,  # 不動産
        }
        # 部分一致検索 (例: "Pharmaceuticals" -> "Pharmaceutical")
        for key, margin in sector_margins.items():
            if key in sector:
                return margin

        return 0.10  # デフォルトは10%

    @staticmethod
    def calculate_implied_revenue_growth(
        input_data: FinancialMetricsInput,
    ) -> float | None:
        """
        【新実装】売上高期待成長率 (Revenue-based Implied Growth)
        PSRとセクター別ターゲットマージンから、市場が期待する売上成長率を逆算する。
        """
        market_cap = input_data.market_cap
        revenue = input_data.revenue

        if revenue <= 0 or market_cap <= 0:
            return None

        # 1. 現状のPSR
        psr = market_cap / revenue

        # 2. セクターに応じた「あるべき利益率」を取得
        target_margin = FinancialCalculator.get_target_margin(input_data.sector)

        # 3. パラメータ (保守的設定)
        r = 0.07  # 割引率
        g_term = 0.02  # 永久成長率

        # 4. 逆算ロジック
        # PSR = target_margin * (1+g)^5 / (r - g_term)
        # (1+g)^5 = PSR * (r - g_term) / target_margin

        try:
            base_val = psr * (r - g_term) / target_margin

            if base_val < 0:
                return 0.0

            implied_g = (base_val ** (1 / 5)) - 1
            return implied_g * 100  # %表記

        except:
            return None

    @staticmethod
    def calculate_actual_revenue_growth(
        input_data: FinancialMetricsInput,
    ) -> float | None:
        """
        【実績】対前年売上成長率 (YoY Revenue Growth)
        """
        if input_data.prev_revenue is None or input_data.prev_revenue == 0:
            return None

        # (今回 - 前回) / 前回
        growth = (
            input_data.revenue - input_data.prev_revenue
        ) / input_data.prev_revenue
        return growth * 100  # %表記

    @staticmethod
    def calculate_reality_gap(
        implied_growth: float | None, actual_growth: float | None
    ) -> float | None:
        """
        【乖離】Reality Gap
        市場の期待(Implied) - 現実の実績(Actual)

        正の値が大きい: 過熱 (実績以上に期待されている)
        負の値が大きい: 失望/放置 (実績より低く見積もられている = Asymmetric Betのチャンス)
        """
        if implied_growth is None or actual_growth is None:
            return None

        return implied_growth - actual_growth

    @staticmethod
    def diagnose_corporate_state(f_score, z_zone, has_fcf) -> str:
        """
        【第1層】企業の状態診断 (State)
        """
        if z_zone == "distress":
            return "Financial Distress"  # 財務危機
        elif f_score <= 3:
            return "Deteriorating"  # 悪化中
        elif f_score >= 5:  # 少し緩和
            if has_fcf:
                return "Cash Generator"  # 稼ぐ力あり (Compounder)
            else:
                return "High Growth"  # 成長投資中 (Growth)
        else:
            return "Neutral"  # 普通

    @staticmethod
    def diagnose_expectation(gap, implied_rev_growth, has_fcf) -> str:
        """
        【第2層】市場期待の構造診断 (Expectation)
        """
        if not has_fcf and implied_rev_growth is not None and implied_rev_growth > 25:
            return "Single Engine"  # 片肺飛行 (売上期待のみ)

        if gap is not None:
            if gap > 20:
                return "Overheated"  # 加熱
            elif gap < -10:
                return "Underestimated"  # 過小評価
            elif gap > 10:
                return "Optimistic"  # 楽観的

        return "Reasonable"  # 妥当

    @staticmethod
    def assess_risks(z_zone, f_score, accruals) -> tuple[str, list[str]]:
        """
        【第3層】リスク評価 (Risk)
        戻り値: (リスクレベル, リスク要因リスト)
        """
        risks = []
        level = "Low"

        # 致命的なリスク
        if z_zone == "distress":
            risks.append("Bankruptcy Risk")  # 倒産リスク
            level = "Critical"

        if f_score <= 3:
            risks.append("Weak Fundamentals")  # 基礎的条件の悪化
            if level != "Critical":
                level = "High"

        # 品質リスク
        if accruals is not None and accruals > 0.15:  # 利益の質が悪い
            risks.append("Low Earnings Quality")
            if level == "Low":
                level = "Medium"

        return level, risks
