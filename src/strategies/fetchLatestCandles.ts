const { deriv }= require('../config/deriv');

const fetchLatestCandles = async (symbol: string, timeframe: number) => {
  return new Promise<any[]>((resolve, reject) => {
    const requestId = Date.now();

    // Listen for response
    const handler = (msg: any) => {
      if (msg.req_id === requestId) {
        deriv.off('message', handler);

        if (msg.error) return reject(msg.error);
        if (msg.candles) {
          resolve(msg.candles.map((c: any) => ({
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            epoch: c.epoch
          })));
        } else {
          resolve([]);
        }
      }
    };

    deriv.on('message', handler);

    // Send candles request
    deriv.send({
      ticks_history: symbol,
      granularity: timeframe,
      count: 100,
      end: 'latest',
      style: 'candles',
      req_id: requestId
    });

    // Timeout after 15s
    setTimeout(() => {
      deriv.off('message', handler);
      reject(new Error('Timeout fetching candles'));
    }, 15000);
  });
};

module.exports = fetchLatestCandles;