import WebSocket from "ws";

export const createDerivConnection = (apiToken: string) => {
  const ws = new WebSocket("wss://ws.deriv.com/websockets/v3?app_id=1089");

  ws.on("open", () => {
    ws.send(
      JSON.stringify({
        authorize: apiToken,
      })
    );
  });

  ws.on("error", (err) => {
    console.error("Deriv WebSocket Error:", err);
  });

  return ws;
};
