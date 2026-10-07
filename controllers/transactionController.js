const Transaction = require("../models/Transaction");
const Product = require("../models/Product");
const DailyDiscount = require("../models/DailyDiscount");
const updateBestSellerProducts = require("../helpers/updateBestSellerProducts");
const ProductVariant = require("../models/ProductVariant");
const User = require("../models/User");
const { validateVoucher } = require("../services/voucher/voucherService");
const {
  syncBestSellerProducts,
} = require("../services/bestSeller/bestSellerService");

// CREATE transaction
exports.createTransaction = async (req, res) => {
  try {
    const {
      products,
      name,
      phoneNumber,
      message,
      shippingMethod,
      paymentMethod,
      transferProvider,
      shippingAddress,
      voucherCode,
    } = req.body;

    const userId = req.user.id;

    if (!products || products.length === 0) {
      return res.status(400).json({
        message: "Products are required",
      });
    }

    // GROUP PRODUCTS
    const productMap = {};

    for (const item of products) {
      const productId = String(item.product);

      const normalizedSize = String(item.size).trim().toUpperCase();

      const quantity = Number(item.quantity ?? 1);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          message: "Invalid product quantity",
        });
      }

      const key = `${productId}-${normalizedSize}`;

      if (!productMap[key]) {
        productMap[key] = {
          product: productId,
          size: normalizedSize,
          quantity,
        };
      } else {
        productMap[key].quantity += quantity;
      }
    }
    // CALCULATE PRODUCTS & TOTAL PRICE
    let totalProducts = 0;
    let totalPrice = 0;
    const productsForTransaction = [];
    const variantsToUpdate = [];

    for (const key in productMap) {
      const { product, size, quantity } = productMap[key];

      const productData = await Product.findById(product);

      if (!productData) {
        return res
          .status(400)
          .json({ message: `Product not found: ${product}` });
      }

      const variant = await ProductVariant.findOne({
        product,
        size,
      });

      if (!variant) {
        return res
          .status(400)
          .json({ message: `${productData.name} size ${size} not found` });
      }

      if (variant.stock < quantity) {
        return res.status(400).json({
          message: `${productData.name} size ${size} only has${variant.stock} stock left`,
        });
      }

      // Daily Discount
      let discountPercent = 0;
      let finalPricePerUnit = productData.price;

      const discount = await DailyDiscount.findOne({
        productId: productData._id,
        expiresAt: { $gt: new Date() },
      });

      if (discount) {
        discountPercent = discount.discountPercent;
        finalPricePerUnit =
          productData.price - productData.price * (discountPercent / 100);
      }

      const subtotal = finalPricePerUnit * quantity;

      totalProducts += quantity;
      totalPrice += subtotal;
      console.log("Real price before discount", totalPrice);

      productsForTransaction.push({
        product: productData.id,
        name: productData.name,
        image: productData.image,
        brand: productData.brand,
        size,
        quantity,
        originalPrice: productData.price,
        discountPercent,
        pricePerUnit: finalPricePerUnit,
        subtotal,
      });

      variantsToUpdate.push({
        variant,
        quantity,
      });
    }

    // VALIDATE VOUCHER
    let discountAmount = 0;
    let finalPrice = totalPrice;

    if (voucherCode) {
      const voucherItems = await productsForTransaction.map((item) => ({
        productId: item.product,
        finalPrice: item.pricePerUnit,
        quantity: item.quantity,
      }));

      const voucherResult = await validateVoucher({
        code: voucherCode,
        cartItems: voucherItems,
        subTotal: totalPrice,
      });

      discountAmount = voucherResult.discountAmount;
      finalPrice = voucherResult.finalTotal;
    }

    // UPDATE STOCK
    for (const item of variantsToUpdate) {
      item.variant.stock -= item.quantity;
      await item.variant.save();
    }

    //PAYMENT STATUS
    const status =
      paymentMethod === "Cash on Delivery" ? "Processing" : "Pending";
    // Payment Expired (Tranfer)
    const paymentExpiredAt =
      paymentMethod === "Transfer"
        ? new Date(Date.now() + 60 * 60 * 1000)
        : null;

    const paymentStatus = "Unpaid";

    // CREATE TRANSACTIONS
    const newTransaction = new Transaction({
      user: userId,
      products: productsForTransaction,
      name,
      totalProducts,
      totalPrice,
      finalPrice,
      phoneNumber,
      message,
      shippingMethod,
      shippingAddress,
      voucherCode,
      discountAmount,
      paymentMethod,
      transferProvider,
      paymentStatus,
      paymentExpiredAt,
      status,
    });

    // UPDATE USER ORDER COUNT
    await User.findByIdAndUpdate(userId, {
      $inc: {
        totalOrders: 1,
      },
    });

    console.log(newTransaction);

    await newTransaction.save();

    res
      .status(201)
      .json({ message: "Transaction saved", transaction: newTransaction });
  } catch (error) {
    console.error("Error creating transaction", error.message);
    res
      .status(500)
      .json({ message: "Failed to create transaction", error: error.message });
  }
};

exports.payTransaction = async (req, res) => {
  try {
    const { transferProvider } = req.body;

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Check  Expired
    if (transaction.paymentStatus === "Expired") {
      return res.status(400).json({
        message: "Payment already expired",
      });
    }

    if (
      transaction.paymentExpiredAt &&
      new Date() > transaction.paymentExpiredAt
    ) {
      for (const item of transaction.products) {
        const variant = await ProductVariant.findOne({
          product: item.product,
          size: item.size,
        });

        if (variant) {
          variant.stock += item.quantity;
          await variant.save();
        }
      }

      transaction.paymentStatus = "Expired";
      transaction.status = "Expired";

      await transaction.save();

      return res.status(400).json({
        message: "Payment expired",
      });
    }

    if (transaction.paymentStatus === "Paid") {
      return res.status(400).json({ message: "Order already paid" });
    }

    transaction.transferProvider = transferProvider;
    transaction.paymentStatus = "Paid";
    transaction.paidAt = new Date();
    transaction.status = "Processing";

    await transaction.save();

    res.status(200).json({ message: "Payment Success", transaction });
  } catch (error) {
    res.status(500).json({ message: "Payment Failed", error: error.message });
  }
};

exports.getUserTransaction = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res
        .status(403)
        .json({ message: "Only users can view their transactions" });
    }
    const userId = req.user.id;
    const transactions = await Transaction.find({ user: userId }).populate(
      "products.product",
      "name price image",
    );
    res.json(transactions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch transactions history", error });
  }
};

exports.getAllTransaction = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("user", "name email")
      .populate("products.product", "name price image");
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch transactions", error });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    res.status(200).json(transaction);
  } catch (err) {
    res.status(500).json({
      message: "Failed to get transaction",
      error: err.message,
    });
  }
};

exports.updateTransactionStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.status(200).json(transaction);
  } catch (err) {
    res.status(500).json({
      message: "Failed to update transaction status",
      error: err.message,
    });
  }
};

exports.cancelTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactionId = req.params.id;

    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(400).json({ message: "Transaction not found" });
    }

    if (transaction.user.toString() !== userId) {
      return res.status(404).json({ message: "Unauthorized" });
    }

    if (["Shipped", "Delivered", "Completed"].includes(transaction.status)) {
      return res.status(400).json({
        message: "Order can no longer be cancelled",
      });
    }

    if (["Cancelled", "Expired"].includes(transaction.status)) {
      return res.status(400).json({
        message: "Order already cancelled or expired",
      });
    }

    for (const item of transaction.products) {
      const variant = await ProductVariant.findOne({
        product: item.product,
        size: item.size,
      });

      if (variant) {
        variant.stock += item.quantity;
        await variant.save();
      }
    }

    transaction.status = "Cancelled";
    await transaction.save();

    res
      .status(200)
      .json({ message: "Transaction cancel succesfully", transaction });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed cancelled transaction", error: err.message });
  }
};

exports.confirmReceived = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactionId = req.params.id;

    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.user.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorization" });
    }

    if (transaction.status !== "Delivered") {
      return res.status(400).json({
        message: "Order is not delivered yet",
      });
    }

    transaction.status = "Completed";

    await transaction.save();

    // Recalculate best seller
    await syncBestSellerProducts();
    // Update totalSold
    for (const item of transaction.products) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { totalSold: item.quantity },
      });
    }

    // Update best seller products
    await updateBestSellerProducts();

    res
      .status(200)
      .json({ message: "Order confirmed as received", transaction });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to confirm order", error: err.message });
  }
};
