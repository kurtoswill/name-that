let cachedPrice: number | null = null;
let lastFetch = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export async function getEthUsdPrice(): Promise<number> {
    const now = Date.now();

    if (cachedPrice && now - lastFetch < CACHE_TTL) {
        return cachedPrice;
    }

    try {
        // Primary: CoinGecko
        const res = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
            { next: { revalidate: 60 } } // hints Next.js caching
        );
        if (!res.ok) throw new Error("CoinGecko failed");
        const data = await res.json();
        cachedPrice = data.ethereum.usd;
    } catch (err) {
        console.warn("CoinGecko failed, trying Coinbase…", err);
        try {
            // Fallback: Coinbase
            const res = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=ETH");
            if (!res.ok) throw new Error("Coinbase failed");
            const data = await res.json();
            cachedPrice = parseFloat(data.data.rates.USD);
        } catch (err2) {
            console.error("Both providers failed:", err2);
            if (!cachedPrice) {
                throw new Error("Unable to fetch ETH price from any provider");
            }
        }
    }

    lastFetch = now;
    return cachedPrice!;
}
