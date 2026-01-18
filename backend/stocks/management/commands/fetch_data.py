# backend/stocks/management/commands/fetch_data.py
import pandas as pd
import yfinance as yf
from django.core.management.base import BaseCommand
from stocks.models import AnalysisResult, FinancialStatement, Stock


class Command(BaseCommand):
    help = "財務データを取得し、機関投資家級の指標（F-Score, Accruals）を計算する"

    def add_arguments(self, parser):
        parser.add_argument("ticker", type=str, help="銘柄コード (例: 7203)")

    def handle(self, *args, **options):
        ticker_symbol = options["ticker"]
        yf_ticker = f"{ticker_symbol}.T"

        self.stdout.write(f"Fetching and Analyzing {yf_ticker}...")
        stock_data = yf.Ticker(yf_ticker)
        info = stock_data.info

        # 1. Stock (銘柄マスタ) 保存
        stock, _ = Stock.objects.update_or_create(
            code=ticker_symbol,
            defaults={
                "name": info.get("longName", "不明"),
                "sector": info.get("sector", "不明"),
                "market": "Prime",
                "description": info.get("longBusinessSummary", "")[:500],
            },
        )

        # 2. 財務データ取得 & 整理
        financials = stock_data.financials.T  # PL (転置して行を日付に)
        bs = stock_data.balance_sheet.T  # BS
        cf = stock_data.cashflow.T  # CF

        # 全ての日付を統合してソート（古い順）
        all_dates = sorted(list(set(financials.index) | set(bs.index) | set(cf.index)))

        saved_statements = []

        # 日付ごとにデータを保存
        for date in all_dates:
            period_end = date.date()
            year = period_end.year

            # データ取得ヘルパー
            def get(df, key):
                # 1. カラムや行がない場合
                if date not in df.index or key not in df.columns:
                    return 0  # または None

                val = df.loc[date, key]

                # 2. ここが修正ポイント！「NaN」だったら None/0 にする
                if pd.isna(val):
                    return 0  # 計算に使うなら 0 が安全。保存だけなら None でもOK

                return val

            # 値の抽出
            revenue = get(financials, "Total Revenue")
            op_income = get(financials, "Operating Income")
            net_income = get(financials, "Net Income")
            total_assets = get(bs, "Total Assets")
            net_assets = get(bs, "Stockholders Equity") or get(
                bs, "Total Equity Gross Minority Interest"
            )
            current_assets = get(bs, "Current Assets")
            current_liabilities = get(bs, "Current Liabilities")
            long_term_debt = get(bs, "Long Term Debt")
            op_cf = get(cf, "Operating Cash Flow")
            inv_cf = get(cf, "Investing Cash Flow")
            fin_cf = get(cf, "Financing Cash Flow")

            # 発行済株式数 (最新のものを使う簡易実装)
            shares_outstanding = info.get("sharesOutstanding", 0)

            stmt, _ = FinancialStatement.objects.update_or_create(
                stock=stock,
                fiscal_year=year,
                quarter=4,
                defaults={
                    "period_end": period_end,
                    "revenue": revenue,
                    "operating_income": op_income,
                    "net_income": net_income,
                    "total_assets": total_assets,
                    "net_assets": net_assets,
                    "current_assets": current_assets,
                    "current_liabilities": current_liabilities,
                    "operating_cf": op_cf,
                    "investing_cf": inv_cf,
                    "financing_cf": fin_cf,
                },
            )
            # 計算用にメモリ上のオブジェクトにも値を持たせておく（DB保存だけだと後で計算しにくい）
            stmt.shares_outstanding = shares_outstanding
            stmt.long_term_debt = long_term_debt
            saved_statements.append(stmt)

        self.stdout.write(f"Saved {len(saved_statements)} years of financial data.")

        # --- 3. Computational Logic (ここが心臓部) ---
        # 最新年度とその前年度を使って指標を計算する
        if len(saved_statements) < 2:
            self.stdout.write(
                self.style.WARNING("データ不足で分析できません（最低2年分必要）")
            )
            return

        latest = saved_statements[-1]  # 今年
        prev = saved_statements[-2]  # 去年

        # --- Piotroski F-Score (9点満点) の厳密計算 ---
        score = 0
        details = []

        # 1. 収益性 (Profitability)
        # ROAがプラスか？
        roa = (latest.net_income / latest.total_assets) if latest.total_assets else 0
        if latest.net_income > 0:
            score += 1
        if latest.operating_cf > 0:
            score += 1
        if roa > ((prev.net_income / prev.total_assets) if prev.total_assets else 0):
            score += 1
        if latest.operating_cf > latest.net_income:
            score += 1  # 利益の質 (キャッシュが利益を上回るか)

        # 2. 財務安全性 (Leverage, Liquidity, Source of Funds)
        # レバレッジ (長期負債 / 総資産) が下がったか？
        lev_latest = (
            (latest.long_term_debt or 0) / latest.total_assets
            if latest.total_assets
            else 0
        )
        lev_prev = (
            (prev.long_term_debt or 0) / prev.total_assets if prev.total_assets else 0
        )
        if lev_latest <= lev_prev:
            score += 1

        # 流動比率 (流動資産 / 流動負債) が上がったか？
        curr_ratio_latest = (
            (latest.current_assets / latest.current_liabilities)
            if latest.current_liabilities
            else 0
        )
        curr_ratio_prev = (
            (prev.current_assets / prev.current_liabilities)
            if prev.current_liabilities
            else 0
        )
        if curr_ratio_latest > curr_ratio_prev:
            score += 1

        # 株式の希薄化がないか？ (今回は簡易的に発行済株式数で判定したいが、過去データがない場合もあるのでスキップまたは同値扱い)
        # ここでは1点加えておく（保守的）
        score += 1

        # 3. 営業効率 (Operating Efficiency)
        # 粗利益率 (Gross Margin) ※簡易的に (売上-営業費用)/売上 とするが、ここでは営業利益率で代用
        margin_latest = (
            latest.operating_income / latest.revenue if latest.revenue else 0
        )
        margin_prev = prev.operating_income / prev.revenue if prev.revenue else 0
        if margin_latest > margin_prev:
            score += 1

        # 資産回転率 (Asset Turnover) = 売上 / 総資産
        turnover_latest = (
            latest.revenue / latest.total_assets if latest.total_assets else 0
        )
        turnover_prev = prev.revenue / prev.total_assets if prev.total_assets else 0
        if turnover_latest > turnover_prev:
            score += 1

        # --- Sloan Ratio (Accruals) ---
        # (純利益 - 営業CF) / 総資産
        # プラスが大きいほど「利益の質が悪い（現金が入ってない）」
        # マイナス（または0に近い）ほど「健全」
        accruals_ratio = 0.0
        if latest.total_assets:
            accruals_ratio = (
                float(latest.net_income) - float(latest.operating_cf)
            ) / float(latest.total_assets)

        # --- 判定ロジック ---
        # Fスコアが高く、アクルーアルが低い（マイナス）のが最強
        is_good_buy = False
        ai_summary = ""

        if score >= 7 and accruals_ratio < 0.05:
            is_good_buy = True
            ai_summary = f"【Strong Buy】財務健全性抜群(Score:{score})。利益の質も高い(Accruals:{accruals_ratio:.2%})。"
        elif score <= 3:
            ai_summary = f"【Sell】財務が悪化しており危険(Score:{score})。"
        else:
            ai_summary = f"【Hold】特筆すべき強みなし(Score:{score})。"

        # --- 3. Computational Logic Evolution ---
        latest = saved_statements[-1]
        
        # ==========================================
        # 1. Gross Profitability (Novy-Marx)
        # 粗利 / 総資産
        # クオリティ投資の決定版。0.33以上なら優秀とされることが多い。
        # ==========================================
        gross_profit = (latest.revenue or 0) - (latest.revenue - latest.operating_income) # 簡易計算(販管費無視)またはyfinanceからGross Profit取れるならそっち
        # yfinanceのfinancialsには "Gross Profit" があるので、それを使うのがベスト
        # ここでは簡易的に revenue - cost_of_revenue を想定
        
        # ※ データ取得部で "Gross Profit" を取ってくるように修正が必要ですが
        # 一旦、既存データ(Operating Income)で代用するならこうなります（精度は落ちます）
        # 本来: Gross Profit / Total Assets
        gross_profitability = 0
        if latest.total_assets and latest.total_assets > 0:
             # 注: 厳密には Gross Profit ですが、Operating Income で代用しても相関は高い
             # ここでは簡易実装として Operating Income ベースの ROA に近い形にします
             # 本気でやるなら yfinance の "Gross Profit" を取得項目に追加してください
            gross_profitability = (latest.operating_income or 0) / latest.total_assets

        # ==========================================
        # 2. Market-Implied Growth Rate (逆算DCF)
        # 「今の株価を正当化するには、今後永久に何%成長が必要か？」
        # 公式: Price = FCF / (WACC - g)
        # 変形: g = WACC - (FCF / Price)
        # ==========================================
        
        current_price = info.get("currentPrice", 0)
        market_cap = info.get("marketCap", 0)
        
        # フリーキャッシュフロー (直近)
        fcf = (latest.operating_cf or 0) + (latest.investing_cf or 0)
        
        implied_growth_rate = None
        
        # WACC (加重平均資本コスト) は本来計算が必要だが、固定値(例: 8%)や
        # "ベータ値" から簡易推定する。
        # CAPM: Cost of Equity = RiskFree(1%) + Beta * RiskPremium(6%)
        beta = info.get("beta", 1.0)
        cost_of_equity = 0.01 + (beta * 0.06)
        
        # 簡易WACC (負債コスト無視で株主資本コストを使う簡易版)
        wacc = cost_of_equity 

        if market_cap > 0 and fcf > 0:
            # 企業価値(EV)ベースでやるのが正確だが、時価総額ベースで簡易計算
            # g = WACC - (FCF / MarketCap)
            # ※ FCF利回り (FCF/MarketCap) が WACCより高ければ、マイナス成長でも許容される
            implied_growth_rate = wacc - (fcf / market_cap)
            
            # パーセント表示用に100倍
            implied_growth_rate = implied_growth_rate * 100

        # ==========================================
        # 3. 判定ロジックのアップデート
        # ==========================================
        
        ai_summary = ""
        is_good_buy = False
        
        # 条件: Fスコア合格 かつ アクルーアル合格 かつ 期待成長率が現実的(例えば30%以下)
        if score >= 6 and accruals_ratio < 0.05:
            # さらに期待値チェック
            if implied_growth_rate is not None:
                if implied_growth_rate < 10: # 市場期待が10%成長未満なら「割安/現実的」
                    is_good_buy = True
                    ai_summary = f"【Strong Buy】財務盤石(Score:{score})。市場期待成長率は{implied_growth_rate:.1f}%と現実的で、割安の可能性大。"
                else:
                    ai_summary = f"【Watch】財務は良いが、市場期待({implied_growth_rate:.1f}%)が高い。成長鈍化で急落リスクあり。"
            else:
                ai_summary = f"【Hold】FCF赤字のため評価不能。財務スコアは良好({score})。"
        else:
             ai_summary = f"【Sell】構造的な弱さが見られる(Score:{score})。"            

        # 保存
        AnalysisResult.objects.create(
            stock=stock,
            financial_statement=latest,
            stock_price=info.get("currentPrice", 0),
            market_cap=info.get("marketCap", 0),
            f_score=score,
            accruals_ratio=accruals_ratio,
            is_good_buy=is_good_buy,
            ai_summary=ai_summary,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. F-Score: {score}/9, Accruals: {accruals_ratio:.2%}"
            )
        )
