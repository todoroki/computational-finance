import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500 selection:text-white">
      {/* --- Navbar --- */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-black tracking-tighter text-white">
            ASSET<span className="text-blue-500">OS</span>
          </div>
          <div className="flex gap-4">
            <Link
              href="/portfolio"
              className="btn btn-sm btn-ghost text-slate-400 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/portfolio"
              className="btn btn-sm bg-blue-600 hover:bg-blue-500 text-white border-none rounded-full px-6 shadow-lg shadow-blue-500/20"
            >
              Launch OS
            </Link>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] -z-10"></div>

        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-widest animate-fade-in-up">
            Cognitive Tool for Investors
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-white mb-8 leading-tight">
            Dont Manage Assets.
            <br />
            Manage Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              Cognition.
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            なぜ、あなたのポートフォリオは市場平均に負けるのか？
            <br />
            それは銘柄選びの失敗ではありません。
            <br />
            <strong className="text-slate-200">「無意識のバイアス」</strong>と
            <strong className="text-slate-200">「規律の欠如」</strong>
            が原因です。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/portfolio"
              className="btn btn-lg bg-white text-slate-950 hover:bg-slate-200 border-none rounded-full px-8 font-bold w-full sm:w-auto"
            >
              Guest Mode で試す
            </Link>
            <Link
              href="#features"
              className="btn btn-lg btn-outline text-white border-slate-700 hover:bg-slate-800 hover:border-slate-600 rounded-full px-8 w-full sm:w-auto"
            >
              機能を見る
            </Link>
          </div>

          {/* Mockup Preview */}
          <div className="mt-20 relative mx-auto max-w-4xl transform hover:scale-[1.01] transition-transform duration-500">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur opacity-20"></div>
            <div className="relative bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden aspect-video flex items-center justify-center">
              {/* Abstract UI Representation */}
              <div className="w-full h-full p-8 flex flex-col">
                <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    ASSET_OS_v1.0.0
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-6">
                  <div className="col-span-1 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="h-2 w-20 bg-slate-700 rounded mb-4"></div>
                    <div className="h-32 w-full bg-gradient-to-t from-red-500/20 to-transparent rounded-b flex items-end justify-center pb-2">
                      <span className="text-red-400 font-bold text-sm">
                        DANGER
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 space-y-4">
                    <div className="h-20 bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded bg-blue-500/20 flex items-center justify-center text-2xl">
                        🌍
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="h-2 w-32 bg-slate-700 rounded"></div>
                        <div className="h-2 w-full bg-slate-700 rounded"></div>
                      </div>
                    </div>
                    <div className="h-20 bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 flex items-center gap-4 opacity-50">
                      <div className="w-12 h-12 rounded bg-slate-700 flex items-center justify-center text-xl">
                        💀
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="h-2 w-24 bg-slate-700 rounded"></div>
                        <div className="h-2 w-3/4 bg-slate-700 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Problem Section --- */}
      <section className="py-24 bg-slate-900" id="features">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                なぜ、「なんとなく」
                <br />
                投資してしまうのか？
              </h2>
              <p className="text-slate-400 leading-relaxed mb-6">
                人間は、自分の都合の良いように解釈する生き物です。
                株価が下がれば「長期投資だから」と言い訳し、
                上がれば「実力だ」と過信する。
              </p>
              <p className="text-slate-400 leading-relaxed">
                AssetOSは、あなたのポートフォリオを数学と論理でスキャンし、
                <span className="text-blue-400 font-bold">
                  「隠れたリスク」
                </span>
                と<span className="text-red-400 font-bold">「思考の甘さ」</span>
                を可視化します。
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card bg-slate-800 border border-slate-700 p-6 hover:border-red-500/50 transition-colors duration-300">
                <div className="text-3xl mb-4">🙈</div>
                <h3 className="font-bold text-white mb-2">認知バイアス</h3>
                <p className="text-sm text-slate-400">
                  損切りできない、利益を早く確定してしまう。
                </p>
              </div>
              <div className="card bg-slate-800 border border-slate-700 p-6 hover:border-red-500/50 transition-colors duration-300">
                <div className="text-3xl mb-4">🧟</div>
                <h3 className="font-bold text-white mb-2">ゾンビ企業</h3>
                <p className="text-sm text-slate-400">
                  気づかないうちに、死にゆく企業を抱えている。
                </p>
              </div>
              <div className="card bg-slate-800 border border-slate-700 p-6 hover:border-red-500/50 transition-colors duration-300">
                <div className="text-3xl mb-4">🎢</div>
                <h3 className="font-bold text-white mb-2">
                  無意識のギャンブル
                </h3>
                <p className="text-sm text-slate-400">
                  分散しているつもりが、実は一つのシナリオに賭けている。
                </p>
              </div>
              <div className="card bg-slate-800 border border-slate-700 p-6 hover:border-red-500/50 transition-colors duration-300">
                <div className="text-3xl mb-4">🤥</div>
                <h3 className="font-bold text-white mb-2">事後正当化</h3>
                <p className="text-sm text-slate-400">
                  予想が外れたのに、後付けの理由で保有し続ける。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Feature 1: NDI --- */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">
              Feature 01
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Worldview Risk Analysis
            </h2>
            <p className="text-lg text-slate-400">
              あなたの資産は、どの「未来」に依存しているか？
              <br />
              NDI (Narrative Dependency Index)
              が、無意識のベットを暴き出します。
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>

            <div className="grid md:grid-cols-2 gap-12 relative z-10 items-center">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold text-slate-300">
                    <span>低金利・金融緩和シナリオ</span>
                    <span className="text-red-400">CRITICAL 72%</span>
                  </div>
                  <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 w-[72%]"></div>
                  </div>
                  <p className="text-xs text-red-400 font-mono">
                    ⚠️ 警告:
                    金利上昇局面でポートフォリオが崩壊するリスクがあります。
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold text-slate-300">
                    <span>高成長継続シナリオ</span>
                    <span className="text-blue-400">35%</span>
                  </div>
                  <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[35%]"></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold text-slate-300">
                    <span>円安恩恵シナリオ</span>
                    <span className="text-slate-500">12%</span>
                  </div>
                  <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-600 w-[12%]"></div>
                  </div>
                </div>
              </div>
              <div className="text-left md:pl-12 border-l border-slate-800">
                <h3 className="text-2xl font-bold text-white mb-4">
                  「なんとなく分散」は
                  <br />
                  もう通用しない。
                </h3>
                <p className="text-slate-400 leading-relaxed mb-6">
                  銘柄を分けても、それらが同じ「世界観」に依存していたら意味がありません。
                  AssetOSは、財務データと定性情報を解析し、あなたが本当に賭けているリスクを数値化します。
                </p>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex gap-2">
                    ✅ <span>金利感応度の可視化</span>
                  </li>
                  <li className="flex gap-2">
                    ✅ <span>インフレ耐性のチェック</span>
                  </li>
                  <li className="flex gap-2">
                    ✅ <span>特定の物語への過度な依存を警告</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Feature 2: Journal --- */}
      <section className="py-24 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">
                Feature 02
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                The Investment Contract
              </h2>
              <h3 className="text-xl text-slate-200 mb-4 font-bold">
                「なぜ買ったのか？」「いつ売るのか？」
              </h3>
              <p className="text-slate-400 leading-relaxed mb-8">
                購入ボタンを押す前に、AssetOSはあなたに契約書へのサインを求めます。
                未来のあなたが「含み損」を抱えたとき、過去のあなたが書いた「撤退条件」が、
                言い訳を許さない冷徹な鏡として機能します。
              </p>
              <Link
                href="/portfolio"
                className="text-blue-400 font-bold hover:text-blue-300 flex items-center gap-2 group"
              >
                まずはポートフォリオを作ってみる{" "}
                <span className="group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </Link>
            </div>

            <div className="order-1 md:order-2 bg-white rounded-xl p-1 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <div className="font-bold text-slate-900 text-lg">
                    Investment Journal
                  </div>
                  <div className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">
                    Read Only
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-blue-600 uppercase mb-1">
                      🎯 Investment Thesis
                    </div>
                    <div className="text-sm text-slate-700 bg-blue-50 p-3 rounded border border-blue-100 italic">
                      SaaS事業の成長率が30%を超えており、来期黒字化が見込めるため。競合他社と比較しても割安。
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-red-500 uppercase mb-1">
                      🚪 Exit Strategy
                    </div>
                    <div className="text-sm text-slate-700 bg-red-50 p-3 rounded border border-red-100 font-bold">
                      売上成長率が20%を下回ったら、いかなる理由があろうと即座に売却する。
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                  <div className="text-xs text-slate-400">
                    Signed on 2024.10.15
                  </div>
                  <div className="text-xs font-bold text-red-600">
                    ⚠️ Condition Triggered
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">
            Stop Gambling.
            <br />
            Start Engineering.
          </h2>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            あなたの資産運用に、OS（オペレーティング・システム）をインストールしませんか？
            感情に左右されない、プロフェッショナルな規律を手に入れましょう。
          </p>
          <Link
            href="/portfolio"
            className="btn btn-lg bg-blue-600 hover:bg-blue-500 text-white border-none rounded-full px-12 h-16 text-lg shadow-xl shadow-blue-600/20 hover:scale-105 transition-all"
          >
            Start AssetOS Now
          </Link>
          <p className="mt-6 text-sm text-slate-500">
            No credit card required. Guest mode available.
          </p>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-slate-950 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-slate-500 text-sm">
            © 2026 AssetOS Project. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm font-bold text-slate-400">
            <a href="#" className="hover:text-white transition-colors">
              Philosophy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
