import dotenv from "dotenv";

const { DerivWebSocket } = require("../config/deriv");

dotenv.config();

export const deriv = new DerivWebSocket({
  apiToken: process.env.DERIV_API_TOKEN!,
  appId: process.env.DERIV_APP_ID!,
});

export const connectDeriv = () => {
  deriv.connect();  
  return deriv;
};
