const mongoose = require("mongoose");

const productVariantSchema = new mongoose.Schema(
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

    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

productVariantSchema.index(
  {
    product: 1,
    size: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("ProductVariant", productVariantSchema);
