import { Response } from "express";
const deriv = require("../../../config/deriv");

const buildProposalParams = require("../../../deriv/buildProposalParams");

/**
 * Force a trade on Deriv using the given parameters
 *
 * @param {Express.Request} req - Request object containing the trade parameters
 * @param {Express.Response} res - Response object to send back to the client
 *
 * @body {number} amount - Amount to trade
 * @body {string} symbol - Symbol to trade (e.g. EURUSD)
 * @body {"CALL" | "PUT"} contractType - Type of contract to trade
 * @body {number} duration - Duration of the trade in seconds
 *
 * @returns {Promise<Express.Response>} - Promise resolving to a Response object
 * @throws {Error} - If the Deriv instance is not initialized
 */
const forceTrade = async (req, res: Response) => {
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

    deriv.send(params);

    res.json({ message: "Trade request sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Trade failed" });
  }
};

export { forceTrade };
