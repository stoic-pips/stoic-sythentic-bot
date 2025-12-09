const saveBotConfig = require('./config/saveBotConfig');
const getBotConfig = require('./config/getBotConfig');
const startBot = require('./startBot');
const stopBot = require('./stopBot');
const getBotStatus = require('./config/getBotStatus');
const forceTrade = require('./trade/forceTrade');

module.exports = {
  saveBotConfig,
  getBotConfig,
  startBot,
  stopBot,
  getBotStatus,
  forceTrade,
};