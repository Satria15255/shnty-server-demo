const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const favoritesRoutes = require("./routes/favoriteRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const cartRoutes = require("./routes/cartRoutes");
const voucherRoutes = require("./routes/voucherRoutes");
const userRoutes = require("./routes/userRoutes");
const productVariantRoutes = require("./routes/productVariantRoutes");
const dashboardStats = require("./routes/dashboardRoutes");
const chartRoutes = require("./routes/chartRoutes");

connectDB();
const app = express();

app.use(
  cors({
    origin: [
      "https://zafarisco.vercel.app",
      "https://zafaris-demo-ecomerce.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/voucher", voucherRoutes);
app.use("/api/admin", userRoutes);
app.use("/api/productvariant", productVariantRoutes);
app.use("/api/dashboard-stats", dashboardStats);
app.use("/api/sales-chart", chartRoutes);
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running",
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server started on port ${PORT}`),
);
