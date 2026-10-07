const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
        size: {
          type: String,
          required: true,
          default: "One Size",
        },
        price: {
          type: Number,
          required: true,
        },
        discountPercent: {
          type: Number,
          default: 0,
        },
        finalPrice: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.models.Cart || mongoose.model("Cart", cartSchema);
