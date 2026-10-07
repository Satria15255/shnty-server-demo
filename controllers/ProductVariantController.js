const ProductVariant = require("../models/ProductVariant");
const Product = require("../models/Product");

exports.createVariant = async (req, res) => {
  try {
    const { productId, size, stock } = req.body;

    if (!productId || !size || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: "Product, size, and stock are required",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const normalizedSize = String(size).trim().toUpperCase();

    const existingVariant = await ProductVariant.findOne({
      product: productId,
      size: normalizedSize,
    });

    if (existingVariant) {
      return res.status(400).json({
        success: false,
        message: "Variant size already exists",
      });
    }

    const variant = await ProductVariant.create({
      product: productId,
      size: normalizedSize,
      stock,
    });

    res.status(201).json({
      success: true,
      data: variant,
    });
  } catch (error) {
    console.error("Create variant error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create variant",
    });
  }
};

exports.getVariantsByProduct = async (req, res) => {
  try {
    const variants = await ProductVariant.find({
      product: req.params.productId,
    });

    res.status(200).json({
      success: true,
      count: variants.length,
      data: variants,
    });
  } catch (error) {
    console.error("Get variants error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch variants",
    });
  }
};

exports.getVariantById = async (req, res) => {
  try {
    const variant = await ProductVariant.findById(req.params.id);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    res.status(200).json({
      success: true,
      data: variant,
    });
  } catch (error) {
    console.error("Get variant error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch variant",
    });
  }
};

exports.updateVariant = async (req, res) => {
  try {
    const variant = await ProductVariant.findById(req.params.id);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    if (req.body.size !== undefined) {
      const normalizedSize = String(req.body.size).trim().toUpperCase();

      const existingVariant = await ProductVariant.findOne({
        product: variant.product,
        size: normalizedSize,
        _id: { $ne: variant._id },
      });

      if (existingVariant) {
        return res.status(400).json({
          success: false,
          message: "Variant size already exists",
        });
      }

      variant.size = normalizedSize;
    }

    if (req.body.stock !== undefined) {
      variant.stock = req.body.stock;
    }

    await variant.save();

    res.status(200).json({
      success: true,
      data: variant,
    });
  } catch (error) {
    console.error("Update variant error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update variant",
    });
  }
};

exports.deleteVariant = async (req, res) => {
  try {
    const variant = await ProductVariant.findByIdAndDelete(req.params.id);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Variant deleted successfully",
    });
  } catch (error) {
    console.error("Delete variant error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete variant",
    });
  }
};
