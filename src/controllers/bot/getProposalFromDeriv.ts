import { DerivSignal } from "../../strategies/DerivSupplyDemandStrategy";
const { deriv } = require('../../config/deriv');

const getProposalFromDeriv = async (signal: DerivSignal): Promise<any> => {
  return new Promise((resolve, reject) => {
    const requestId = Date.now();

    // Map fields correctly
    const amount = signal.amount || 10;
    const contract_type = signal.contract_type || getContractType(signal.action);
    const duration = signal.duration || 60;
    const duration_unit = signal.duration_unit || 's';

    console.log('🔍 [getProposal] Signal received:', {
      symbol: signal.symbol,
      contract_type,
      amount,
      duration,
      duration_unit,
      action: signal.action
    });

    if (!contract_type || !signal.symbol) {
      console.error('❌ [getProposal] Missing required properties in signal:', signal);
      reject(new Error('Signal missing contract_type or symbol'));
      return;
    }

    const request = {
      proposal: 1,
      amount,
      basis: 'stake',
      contract_type,
      currency: 'USD',
      duration,
      duration_unit,
      symbol: signal.symbol,
      req_id: requestId
    };

    console.log('📤 [getProposal] Sending request:', JSON.stringify(request, null, 2));

    const handler = (data: any) => {
      if (data.req_id === requestId) {
        deriv.off('message', handler);

        if (data.error) {
          console.error('❌ [getProposal] API Error:', data.error);
          reject(new Error(`Deriv API Error: ${data.error.message}`));
        } else if (data.proposal) {
          console.log('✅ [getProposal] Proposal received:', {
            id: data.proposal.id,
            ask_price: data.proposal.ask_price,
            payout: data.proposal.payout
          });
          resolve(data.proposal);
        } else {
          console.error('❌ [getProposal] No proposal in response');
          reject(new Error('No proposal returned'));
        }
      }
    };

    deriv.on('message', handler);
    deriv.send(request);

    setTimeout(() => {
      deriv.off('message', handler);
      console.error('⏰ [getProposal] Timeout waiting for proposal');
      reject(new Error('Timeout getting proposal'));
    }, 10000);
  });
}

const getContractType = (action: string) => {
  switch (action) {
    case "BUY_CALL":
    case "BUY_RISE":
      return "BUY_RISE";
    case "BUY_PUT":
    case "BUY_FALL":
      return "BUY_FALL";
    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

module.exports = getProposalFromDeriv;