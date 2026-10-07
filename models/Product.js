const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    brand: {
      type: String,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      enum: ["Man", "Woman", "Unisex", "Accessories"],
      required: true,
    },

    type: {
      type: String,
      enum: [
        "T-Shirt",
        "Shirt",
        "Hoodie",
        "Sweater",
        "Jacket",
        "Outerwear",
        "Pants",
        "Shorts",
        "Accessories",
      ],
      required: true,
    },

    material: {
      type: String,
      trim: true,
    },

    color: {
      type: String,
      trim: true,
    },

    image: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    totalSold: {
      type: Number,
      default: 0,
      min: 0,
    },

    isBestSeller: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

productSchema.virtual("variants", {
  ref: "ProductVariant",
  localField: "_id",
  foreignField: "product",
});

productSchema.set("toJSON", {
  virtuals: true,
});

productSchema.set("toObject", {
  virtuals: true,
});

module.exports = mongoose.model("Product", productSchema);
