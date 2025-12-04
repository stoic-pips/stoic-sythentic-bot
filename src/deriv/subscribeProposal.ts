async function subscribeProposal(ws, proposalParams) {
    ws.send(JSON.stringify(proposalParams));
}
module.exports = subscribeProposal;
