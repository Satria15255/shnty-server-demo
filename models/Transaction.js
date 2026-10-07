const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },

        size: {
          type: String,
          required: true,
          trim: true,
          uppercase: true,
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
        },

        originalPrice: {
          type: Number,
          required: true,
          min: 0,
        },

        discountPercent: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },

        pricePerUnit: {
          type: Number,
          required: true,
          min: 0,
        },

        subtotal: {
          type: Number,
          required: true,
          min: 0,
        },

        // Snapshot
        name: String,
        brand: String,
        image: String,
      },
    ],
    status: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Completed",
        "Cancelled",
        "Expired",
      ],
      default: "Pending",
    },
    totalProducts: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    voucherCode: String,
    discountAmount: { type: Number, required: true, default: 0 },
    finalPrice: { type: Number, required: true, default: 0 },
    message: String,
    shippingMethod: String,
    paymentMethod: {
      type: String,
      enum: ["Cash on Delivery", "Transfer"],
      required: true,
    },
    transferProvider: {
      type: String,
      enum: ["Visa", "Mastercard", null],
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid", "Expired"],
      default: "Unpaid",
    },
    paymentExpiredAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },

    shippingAddress: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", transactionSchema);
