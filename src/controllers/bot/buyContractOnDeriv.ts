import { DerivSignal } from "../../strategies/DerivSupplyDemandStrategy";

const { deriv } = require('../../config/deriv');

const buyContractOnDeriv = async (signal: DerivSignal, proposal: any) => {
  return new Promise((resolve, reject) => {
    const buyRequest = {
      buy: proposal.id,
      price: proposal.ask_price,
      req_id: Date.now()
    };

    deriv.send(buyRequest);

    const handler = (data: any) => {
      if (data.req_id === buyRequest.req_id) {
        deriv.off('message', handler);

        if (data.error) {
          reject(new Error(data.error.message));
        } else {
          resolve(data);
        }
      }
    };

    deriv.on('message', handler);

    setTimeout(() => {
      deriv.off('message', handler);
      reject(new Error('Timeout buying contract'));
    }, 10000);
  });
};

module.exports = buyContractOnDeriv;