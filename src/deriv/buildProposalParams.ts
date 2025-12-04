function buildProposalParams({ amount, contractType, symbol, duration }) {
    return {
        proposal: 1,
        amount,
        basis: "payout",
        contract_type: contractType,
        currency: "USD",
        duration,
        duration_unit: "s",
        symbol
    };
}

module.exports = buildProposalParams;
