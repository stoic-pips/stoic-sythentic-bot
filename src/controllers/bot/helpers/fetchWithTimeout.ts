const fetchWithTimeout = (symbol: string, granularity: number, timeout = 5000) => {
  return Promise.race([
    fetchLatestCandles(symbol, granularity),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout fetching candles for ${symbol}`)), timeout)
    )
  ]);
};

export default fetchWithTimeout;