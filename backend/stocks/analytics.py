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
