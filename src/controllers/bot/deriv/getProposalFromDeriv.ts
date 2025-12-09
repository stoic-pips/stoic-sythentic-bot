import { DerivSignal } from "../../../strategies/DerivSupplyDemandStrategy";
import supportsRiseFall from "../../../types/supportRiseFail";

const { deriv } = require('../../../config/deriv');
const { getContractType } = require('../../../types/getContractType');

/**
 * Gets a proposal from Deriv based on the given signal.
 * @param {DerivSignal} signal - The signal to send to Deriv.
 * @returns {Promise<any>} - A promise that resolves to the proposal received from Deriv.
 * @throws {Error} - If there is an error with the API request.
 */
const getProposalFromDeriv = async (signal: DerivSignal): Promise<any> => {
  return new Promise((resolve, reject) => {
    const requestId = Date.now();

    const amount = signal.amount || 10;
    
    let contract_type = signal.contract_type || getContractType(signal.action);

    const duration = signal.duration || 5;
    let duration_unit = signal.duration_unit || 't';

    if (signal.symbol.startsWith("R_")) {
        if (contract_type === "RISE") contract_type = "CALL";
        if (contract_type === "FALL") contract_type = "PUT";

        duration_unit = 't';
    }

    console.log(`💰 Amount: ${amount}`);
    console.log(`📝 Contract Type: ${contract_type}`);
    console.log(`⏱️ Duration: ${duration}`);
    console.log(`📅 Duration Unit: ${duration_unit}`);

    if (!signal.action || signal.action === 'HOLD') {
      console.log('⏸️ [getProposal] Signal is HOLD or undefined, skipping trade');
      resolve(null);
      return;
    }

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
    }, 15000);
  });
}

module.exports = getProposalFromDeriv;