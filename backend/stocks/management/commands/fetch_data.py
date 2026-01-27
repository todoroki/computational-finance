import warnings

import pandas as pd
import yfinance as yf
from django.core.management.base import BaseCommand
from stocks.analytics import FinancialCalculator, FinancialMetricsInput
from stocks.models import AnalysisResult, FinancialStatement, Stock

warnings.simplefilter(action="ignore", category=FutureWarning)


class Command(BaseCommand):
    help = "財務データを取得し、機関投資家級の指標を計算して保存する"

    def add_arguments(self, parser):
        parser.add_argument("ticker", type=str, help="銘柄コード (例: 7203)")

    def handle(self, *args, **options):
        ticker_symbol = options["ticker"]
        yf_ticker = f"{ticker_symbol}.T"

        self.stdout.write(f"Fetching {yf_ticker}...")
        stock_data = yf.Ticker(yf_ticker)

        try:
            info = stock_data.info
        except Exception as e:
            self.stderr.write(f"Error fetching info: {e}")
            return

        # 1. Stockを取得 (なければ作成)
        # update_or_create ではなく get_or_create を使います
        stock, created = Stock.objects.get_or_create(code=ticker_symbol)

        should_save = False

        # --- A. 社名 (Name) ---
        # 既存データがない、または「不明」の場合のみ更新
        if not stock.name or stock.name == "不明":
            # shortNameがあればそれを、なければ longName を使う
            stock.name = info.get("shortName") or info.get("longName", "不明")
            should_save = True

        # --- B. セクター (Sector) ---
        if not stock.sector or stock.sector == "不明":
            stock.sector = info.get("sector", "不明")
            should_save = True

        # --- C. 市場 (Market) ---
        # "Prime" と決め打ちせず、データがない場合のみ Industry等で埋める
        if not stock.market or stock.market == "不明":
            # 市場区分の代わりに Industry (e.g., Biotechnology) を入れておく
            stock.market = info.get("industry", "Unknown")
            should_save = True

        # --- D. 概要 (Description) ---
        if not stock.description or stock.description == "不明":
            summary = info.get("longBusinessSummary", "")
            stock.description = summary[:500]  # 文字数制限
            should_save = True

        # 2. 変更があった場合のみ保存
        if created or should_save:
            stock.save()
            action = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"{action} stock info for {stock.code}: {stock.name}"
                )
            )
        else:
            self.stdout.write(f"No info updates needed for {stock.code}")

        # 2. 財務データ取得
        financials = stock_data.financials.T
        bs = stock_data.balance_sheet.T
        cf = stock_data.cashflow.T

        all_dates = sorted(list(set(financials.index) | set(bs.index) | set(cf.index)))
        saved_statements = []

        def get_val(df, date, keys):
            if date not in df.index:
                return 0.0
            if isinstance(keys, str):
                keys = [keys]
            for k in keys:
                if k in df.columns:
                    val = df.loc[date, k]
                    if pd.isna(val):
                        return 0.0
                    return float(val)
            return 0.0

        for date in all_dates:
            period_end = date.date()
            year = period_end.year

            # === PL ===
            revenue = get_val(financials, date, ["Total Revenue", "Total Revenue"])

            # 【修正】銀行対策: 営業利益がない場合は "Pretax Income" (税引前利益) 等で代用
            # Ordinary Income (経常利益) があればベストだが、yfinanceだと Pretax が近いことが多い
            op_income = get_val(
                financials,
                date,
                ["Operating Income", "Operating Profit", "Pretax Income"],
            )

            net_income = get_val(financials, date, "Net Income")
            ebit = get_val(
                financials,
                date,
                ["EBIT", "Net Income From Continuing Ops", "Pretax Income"],
            )

            interest_expense = get_val(
                financials, date, ["Interest Expense", "Interest Expense Non Operating"]
            )
            depreciation = get_val(
                financials,
                date,
                [
                    "Reconciled Depreciation",
                    "Depreciation",
                    "Depreciation And Amortization In Income Statement",
                ],
            )

            # === BS ===
            total_assets = get_val(bs, date, "Total Assets")
            # ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
            # 【ここに追加！】幽霊データ撃退ロジック
            # 総資産が 0 ということは、BSデータが存在しないか、
            # Yahooが空の予定データ(2025年など)を返しているということ。
            # その場合、この年度はゴミなので保存せずにスキップする。
            if total_assets == 0:
                continue
            # ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
            total_equity = get_val(
                bs,
                date,
                [
                    "Stockholders Equity",
                    "Total Equity Gross Minority Interest",
                    "Total Equity",
                ],
            )
            curr_assets = get_val(bs, date, "Current Assets")
            curr_liab = get_val(bs, date, "Current Liabilities")
            inventory = get_val(bs, date, ["Inventory", "Inventories"])
            retained_earnings = get_val(
                bs, date, ["Retained Earnings", "Retained Earnings Accumulated Deficit"]
            )
            long_term_debt = get_val(
                bs,
                date,
                ["Long Term Debt", "Long Term Debt And Capital Lease Obligation"],
            )

            # === CF ===
            op_cf = get_val(
                cf,
                date,
                ["Operating Cash Flow", "Total Cash From Operating Activities"],
            )
            inv_cf = get_val(
                cf,
                date,
                ["Investing Cash Flow", "Total Cashflows From Investing Activities"],
            )
            fin_cf = get_val(
                cf,
                date,
                ["Financing Cash Flow", "Total Cash From Financing Activities"],
            )
            capex = get_val(cf, date, ["Capital Expenditure", "Capital Expenditures"])

            stmt, _ = FinancialStatement.objects.update_or_create(
                stock=stock,
                fiscal_year=year,
                quarter=4,
                defaults={
                    "period_end": period_end,
                    "revenue": revenue,
                    "operating_income": op_income,
                    "net_income": net_income,
                    "ebit": ebit,
                    "interest_expense": interest_expense,
                    "depreciation": depreciation,
                    "total_assets": total_assets,
                    "total_equity": total_equity,
                    "current_assets": curr_assets,
                    "current_liabilities": curr_liab,
                    "inventory": inventory,
                    "retained_earnings": retained_earnings,
                    "long_term_debt": long_term_debt,
                    "operating_cf": op_cf,
                    "investing_cf": inv_cf,
                    "financing_cf": fin_cf,
                    "capex": capex,
                },
            )
            saved_statements.append(stmt)

        self.stdout.write(f"Saved {len(saved_statements)} years of financial data.")

        # --- Analysis ---
        if len(saved_statements) < 2:
            self.stdout.write(self.style.WARNING("データ不足で分析スキップ"))
            return

        latest = saved_statements[-1]
        prev = saved_statements[-2]

        def safe(val):
            return val if val is not None else 0.0

        metrics_input = FinancialMetricsInput(
            revenue=safe(latest.revenue),
            operating_income=safe(latest.operating_income),
            net_income=safe(latest.net_income),
            ebit=safe(latest.ebit),
            interest_expense=safe(latest.interest_expense),
            depreciation=safe(latest.depreciation),
            total_assets=safe(latest.total_assets),
            total_equity=safe(latest.total_equity),
            current_assets=safe(latest.current_assets),
            current_liabilities=safe(latest.current_liabilities),
            inventory=safe(latest.inventory),
            retained_earnings=safe(latest.retained_earnings),
            long_term_debt=safe(latest.long_term_debt),
            operating_cf=safe(latest.operating_cf),
            investing_cf=safe(latest.investing_cf),
            capex=safe(latest.capex),
            stock_price=info.get("currentPrice", 0),
            market_cap=info.get("marketCap", 0),
            beta=info.get("beta", 1.0) or 1.0,
            prev_revenue=safe(prev.revenue),
            prev_operating_income=safe(prev.operating_income),
            prev_net_income=safe(prev.net_income),
            prev_total_assets=safe(prev.total_assets),
            prev_current_assets=safe(prev.current_assets),
            prev_current_liabilities=safe(prev.current_liabilities),
            prev_inventory=safe(prev.inventory),
            prev_long_term_debt=safe(prev.long_term_debt),
            sector=stock.sector or "Unknown",  # ★追加: セクターを渡す
        )
        # ▼ 1. 指標計算 (重複を削除し、整理しました)
        f_score, f_reasons = FinancialCalculator.calculate_piotroski_f_score(
            metrics_input
        )
        z_score = FinancialCalculator.calculate_altman_z_score(metrics_input)
        accruals = FinancialCalculator.calculate_accruals_ratio(metrics_input)
        gross_prof = FinancialCalculator.calculate_gross_profitability(metrics_input)
        roiic = FinancialCalculator.calculate_roiic(metrics_input)

        # 2つの期待値
        implied_g_fcf = FinancialCalculator.calculate_implied_growth_rate(metrics_input)
        implied_g_rev = FinancialCalculator.calculate_implied_revenue_growth(
            metrics_input
        )

        # ▼ 3. 現実(Actual)と乖離(Gap)を計算
        actual_g_rev = FinancialCalculator.calculate_actual_revenue_growth(
            metrics_input
        )

        # ギャップ = 期待(PSR逆算) - 実績(YoY)
        gap = FinancialCalculator.calculate_reality_gap(implied_g_rev, actual_g_rev)

        # ▼ 2. ステータス判定ロジック (統合修正版)
        status = "Hold"
        ai_summary_parts = []
        is_good_buy = False

        # A. 倒産リスク判定 (最優先: 死ぬ会社は買わない)
        if z_score is not None:
            z_zone = FinancialCalculator.classify_altman_zone(z_score)
            if z_zone == "distress":
                status = "Sell"
                ai_summary_parts.append(f"⚠️倒産警戒域(Z:{z_score:.2f})")
            elif z_zone == "grey":
                ai_summary_parts.append(f"倒産リスク予備軍(Z:{z_score:.2f})")

        # B. 財務健全性判定
        if f_score >= 6:  # 財務は優秀
            # 既にSell (倒産リスク) でなければ判定へ
            if status != "Sell":
                # パターン1: 【王道】FCFが出ていて、割安 (Strong Buy)
                if implied_g_fcf is not None and implied_g_fcf < 10:
                    status = "Strong Buy"
                    is_good_buy = True
                    ai_summary_parts.append(f"財務盤石(Score:{f_score})かつFCF割安")

                # パターン2: 【成長株】FCFはないが、売上成長期待が現実的 (Buy)
                elif (
                    implied_g_fcf is None
                    and implied_g_rev is not None
                    and implied_g_rev < 20
                ):
                    status = "Buy"
                    is_good_buy = True
                    ai_summary_parts.append(
                        f"赤字だが売上期待値({implied_g_rev:.1f}%)は妥当"
                    )

                # パターン3: 【非対称の賭け】期待値が高くても、実績との乖離がマイナスなら買い (Buy)
                # (例: 市場は30%成長を期待しているが、実は実績40%成長していて、まだ評価不足)
                elif gap is not None and gap < -5:
                    status = "Buy"
                    is_good_buy = True
                    ai_summary_parts.append(f"実力過小評価(乖離{gap:.1f}%)")

                # パターン4: 良い企業だが、期待値が高すぎてGapもプラス (Watch)
                else:
                    status = "Watch"
                    ai_summary_parts.append("優良企業だが市場の期待値が高い")

        elif f_score <= 3:
            status = "Sell"
            ai_summary_parts.append(f"財務体質が悪化中(Score:{f_score})")

        # 準備
        has_fcf = implied_g_fcf is not None
        z_zone = (
            FinancialCalculator.classify_altman_zone(z_score) if z_score else "grey"
        )

        # 1. State (状態)
        state = FinancialCalculator.diagnose_corporate_state(f_score, z_zone, has_fcf)

        # 2. Expectation (期待)
        expectation = FinancialCalculator.diagnose_expectation(
            gap, implied_g_rev, has_fcf
        )

        # 3. Risk (リスク)
        risk_level, risk_factors = FinancialCalculator.assess_risks(
            z_zone, f_score, accruals
        )
        risk_details_str = ", ".join(risk_factors)

        # 4. Final Label (最終判定)
        final_label = "Neutral"
        ai_summary_parts = []

        # --- ロジックの適用 ---

        # Rule 1: クリティカルなリスクがあれば、何があっても "Avoid"
        if risk_level == "Critical":
            final_label = "Avoid"
            ai_summary_parts.append(f"⚠️回避推奨: {risk_details_str}")

        # Rule 2: 状態が悪化してれば "Sell"
        elif state == "Deteriorating":
            final_label = "Sell"
            ai_summary_parts.append("財務状態が悪化しており売り推奨")

        # Rule 3: 良い企業で、期待が過小評価なら "Strong Buy"
        elif (
            state in ["Cash Generator", "High Growth"]
            and expectation == "Underestimated"
        ):
            final_label = "Strong Buy"
            is_good_buy = True
            ai_summary_parts.append(f"【S級】実力に対し著しく過小評価(乖離{gap:.1f}%)")

        # Rule 4: 良い企業だが、期待が加熱してれば "Watch"
        elif expectation in ["Overheated", "Optimistic"]:
            final_label = "Watch"
            ai_summary_parts.append("優良企業だが過熱感あり。押し目待ち")

        # Rule 5: 成長株で片肺飛行だが、リスクが低ければ "Speculative Buy"
        elif (
            state == "High Growth"
            and expectation == "Single Engine"
            and risk_level == "Low"
        ):
            final_label = "Buy (Spec)"  # 投機的買い
            is_good_buy = True
            ai_summary_parts.append("高成長への期待買い(ボラティリティ注意)")

        # Rule 6: それ以外の良い企業
        elif state in ["Cash Generator", "High Growth"] and risk_level != "High":
            final_label = "Buy"
            is_good_buy = True
            ai_summary_parts.append("好財務かつ期待値も妥当")

        else:
            final_label = "Hold"
            ai_summary_parts.append("特筆すべき材料なし")

        # 保存用サマリ作成
        ai_summary = "。".join(ai_summary_parts)

        ai_summary = "。".join(ai_summary_parts)

        # ▼ 3. DB保存 (重複キーを削除)
        AnalysisResult.objects.update_or_create(
            stock=stock,
            financial_statement=latest,
            defaults={
                "stock_price": metrics_input.stock_price,
                "market_cap": metrics_input.market_cap,
                "f_score": f_score,
                "z_score": z_score,
                "accruals_ratio": accruals,
                "gross_profitability": gross_prof,
                "roiic": roiic,
                # FCFベース (既存)
                "implied_growth_rate": implied_g_fcf,
                # 売上ベース (新規)
                "implied_revenue_growth": implied_g_rev,
                "status": final_label,  # 従来のstatusカラムに詳細ラベルを入れる
                "state": state,  # ★新規
                "expectation_structure": expectation,  # ★新規
                "risk_level": risk_level,  # ★新規
                "risk_details": risk_details_str,  # ★新規
                "is_good_buy": is_good_buy,
                "ai_summary": ai_summary,
                # ▼ 追加保存
                "actual_revenue_growth": actual_g_rev,
                "expectation_gap": gap,
            },
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Analyzed {stock.name}: [{final_label}] State={state}, Exp={expectation}, Risk={risk_level}"
            )
        )
