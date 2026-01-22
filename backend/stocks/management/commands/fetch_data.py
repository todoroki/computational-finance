import pandas as pd
import yfinance as yf
from django.core.management.base import BaseCommand
from stocks.analytics import FinancialCalculator, FinancialMetricsInput
from stocks.models import AnalysisResult, FinancialStatement, Stock


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
        )

        f_score, f_reasons = FinancialCalculator.calculate_piotroski_f_score(
            metrics_input
        )
        z_score = FinancialCalculator.calculate_altman_z_score(metrics_input)
        accruals = FinancialCalculator.calculate_accruals_ratio(metrics_input)
        gross_prof = FinancialCalculator.calculate_gross_profitability(metrics_input)
        roiic = FinancialCalculator.calculate_roiic(metrics_input)
        implied_g = FinancialCalculator.calculate_implied_growth_rate(metrics_input)

        status = "Hold"
        ai_summary_parts = []
        is_good_buy = False

        if z_score is not None:
            z_zone = FinancialCalculator.classify_altman_zone(z_score)
            if z_zone == "distress":
                status = "Sell"
                ai_summary_parts.append(f"⚠️倒産警戒域(Z:{z_score:.2f})")
            elif z_zone == "grey":
                ai_summary_parts.append(f"倒産リスク予備軍(Z:{z_score:.2f})")

        if f_score >= 7 and accruals < 0.05:
            if status != "Sell":
                if implied_g is not None and implied_g < 10:
                    status = "Strong Buy"
                    is_good_buy = True
                    ai_summary_parts.append(f"財務盤石(Score:{f_score})かつ割安")
                else:
                    status = "Watch"
                    ai_summary_parts.append(f"優良企業だが期待値が高い")
        elif f_score <= 3:
            status = "Sell"
            ai_summary_parts.append(f"財務体質が悪化中(Score:{f_score})")

        ai_summary = "。".join(ai_summary_parts)

        # 【修正】重複エラー回避のために update_or_create を使用
        AnalysisResult.objects.update_or_create(
            stock=stock,
            financial_statement=latest,  # ユニークキー
            defaults={
                "stock_price": metrics_input.stock_price,
                "market_cap": metrics_input.market_cap,
                "f_score": f_score,
                "z_score": z_score,
                "accruals_ratio": accruals,
                "gross_profitability": gross_prof,
                "roiic": roiic,
                "implied_growth_rate": implied_g,
                "status": status,
                "is_good_buy": is_good_buy,
                "ai_summary": ai_summary,
            },
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Analyzed {stock.name}: Status={status}, GP={gross_prof:.2f}, Z={z_score if z_score else 'N/A'}"
            )
        )
