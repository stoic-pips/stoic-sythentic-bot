const deriv = require("../../config/deriv");

const buildProposalParams = require("../../deriv/buildProposalParams");

const forceTrade = async (req, res) => {
  try {
    const { amount, symbol, contractType, duration } = req.body;

    // Make sure deriv is connected
    if (!deriv) throw new Error("Deriv instance not initialized");

    const params = buildProposalParams({
      amount,
      contractType,
      symbol,
      duration,
    });

    // Subscribe and listen for proposals
    const proposalHandler = (msg: any) => {
      console.log("Proposal Response:", msg);
      // Handle proposal here (buy, etc.)
    };

    deriv.on("message", proposalHandler);

    deriv.send(params); // Send proposal request through your DerivWebSocket instance

    res.json({ message: "Trade request sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Trade failed" });
  }
};

export { forceTrade };
