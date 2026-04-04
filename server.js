import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Servidor funcionando 🚀");
});

app.post("/chat", async (req, res) => {
  return res.json({
    ok: true,
    message: "backend funcionando"
  });
});

app.listen(PORT, () => {
  console.log("Servidor en puerto " + PORT);
});
