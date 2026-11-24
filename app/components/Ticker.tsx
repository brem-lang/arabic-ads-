const QUOTES = [
  { symbol: "NVDA", price: "138.72", change: 0.56 },
  { symbol: "GBP/USD", price: "1.2715", change: 0.24 },
  { symbol: "SPX", price: "6,142.3", change: 0.41 },
  { symbol: "GOLD", price: "2,678.9", change: -0.33 },
  { symbol: "XRP", price: "2.4100", change: 3.02 },
  { symbol: "MSFT", price: "448.17", change: 0.19 },
  { symbol: "OIL", price: "71.28", change: -0.88 },
  { symbol: "AAPL", price: "231.44", change: 0.82 },
  { symbol: "BTC", price: "94,210", change: 1.37 },
  { symbol: "EUR/USD", price: "1.0864", change: -0.12 },
  { symbol: "TSLA", price: "412.09", change: -1.94 },
  { symbol: "ETH", price: "3,412.6", change: 2.11 },
];

function QuoteList({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0" aria-hidden={hidden}>
      {QUOTES.map((q) => {
        const up = q.change >= 0;
        return (
          <li key={q.symbol} className="flex items-center gap-2 px-4 sm:px-6 whitespace-nowrap">
            <span className="text-subtle">{q.symbol}</span>
            <span className="text-fg">{q.price}</span>
            <span className={up ? "text-up" : "text-down"}>
              <span className="text-[9px]">{up ? "▲" : "▼"}</span> {Math.abs(q.change).toFixed(2)}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Ticker() {
  return (
    <div className="overflow-hidden border-b border-line bg-surface-2/70 font-mono text-xs">
      <div className="flex w-max py-2.5 animate-ticker">
        <QuoteList />
        <QuoteList hidden />
      </div>
    </div>
  );
}
