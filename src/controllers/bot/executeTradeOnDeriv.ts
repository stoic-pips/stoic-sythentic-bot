import { DerivSignal } from "../../strategies/DerivSupplyDemandStrategy";

const getProposalFromDeriv = require('./getProposalFromDeriv');
const buyContractOnDeriv = require('./buyContractOnDeriv');

const executeTradeOnDeriv = async(
  userId: string, 
  signal: DerivSignal, 
  config: any
): Promise<any> => {
  try {
    console.log(`📤 [${userId}] Executing trade: ${signal.contract_type} ${signal.symbol} $${signal.amount}`);
    
    // Get proposal first
    const proposal = await getProposalFromDeriv(signal);
    
    if (!proposal) {
      console.error(`❌ [${userId}] No proposal received`);
      return null;
    }

    console.log(`📊 [${userId}] Proposal: ${proposal.display_value} - Payout: $${proposal.payout}`);
    
    // Execute the trade
    const tradeResult = await buyContractOnDeriv(signal, proposal);
    
    if (!tradeResult) {
      console.error(`❌ [${userId}] Trade execution failed`);
      return null;
    }

    console.log(`✅ [${userId}] Trade executed: ${tradeResult.buy?.contract_id}`);
    
    return {
      id: tradeResult.buy?.contract_id || Date.now().toString(),
      userId: userId,
      symbol: signal.symbol,
      contractType: signal.contract_type,
      action: signal.action,
      amount: signal.amount,
      entryPrice: tradeResult.buy?.entry_tick || 0,
      payout: tradeResult.buy?.payout || 0,
      status: 'open',
      timestamp: new Date(),
      proposalId: proposal.id,
      contractId: tradeResult.buy?.contract_id,
      pnl: 0,
      pnlPercentage: 0
    };

  } catch (error: any) {
    console.error(`❌ [${userId}] Trade execution error:`, error.message);
    return null;
  }
}

module.exports = executeTradeOnDeriv;