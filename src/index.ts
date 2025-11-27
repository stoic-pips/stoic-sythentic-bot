import express from "express";
import authRoutes from "./routes/auth.routes.js";
import botRoutes from "./routes/bot.routes.js";

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/bot", botRoutes);

app.listen(4000, () => console.log("Server running on port 4000"));
