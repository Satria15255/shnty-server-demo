const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Transaction = require("../models/Transaction");
const DailyDiscount = require("../models/DailyDiscount");

exports.getLatestProducts = async (req, res) => {
  try {
    const latestProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(9)
      .populate("variants");

    res.json(latestProducts);
  } catch (error) {
    console.error("Failed fetching latest product:", error);

    res.status(500).json({
      message: "Failed to fetch latest products",
    });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const { search } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
        { material: { $regex: search, $options: "i" } },
        { color: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(filter).populate("variants");

    res.json(products);
  } catch (error) {
    console.error("Failed fetching products:", error);

    res.status(500).json({
      message: "Failed to fetch products",
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("variants");

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const discount = await DailyDiscount.findOne({
      productId: product._id,
      expiresAt: { $gt: new Date() },
    });

    const productData = {
      ...product.toObject(),

      discountPercent: discount?.discountPercent || 0,
      discountPrice: discount?.discountPrice || null,
      isDiscount: !!discount,
    };

    res.json(productData);
  } catch (error) {
    console.error("Failed fetching product:", error);

    res.status(500).json({
      message: "Failed to fetch product",
    });
  }
};

exports.createProduct = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Image is required",
      });
    }

    const product = new Product({
      name: req.body.name,
      brand: req.body.brand,
      price: req.body.price,
      category: req.body.category,
      type: req.body.type,
      material: req.body.material,
      color: req.body.color,
      description: req.body.description,
      image: req.file.path,
      createdBy: req.user?.id || null,
    });

    const savedProduct = await product.save();

    return res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Create product error:", error);

    return res.status(500).json({
      message: "Failed to create product",
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (req.body.name !== undefined) {
      product.name = req.body.name;
    }

    if (req.body.brand !== undefined) {
      product.brand = req.body.brand;
    }

    if (req.body.price !== undefined) {
      product.price = req.body.price;
    }

    if (req.body.category !== undefined) {
      product.category = req.body.category;
    }

    if (req.body.type !== undefined) {
      product.type = req.body.type;
    }

    if (req.body.material !== undefined) {
      product.material = req.body.material;
    }

    if (req.body.color !== undefined) {
      product.color = req.body.color;
    }

    if (req.body.description !== undefined) {
      product.description = req.body.description;
    }

    if (req.file) {
      product.image = req.file.path;
    }

    await product.save();

    return res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    return res.status(500).json({
      message: "Failed to update product",
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    await ProductVariant.deleteMany({
      product: product._id,
    });

    await product.deleteOne();

    res.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    res.status(500).json({
      message: "Failed to delete product",
    });
  }
};

exports.getBestSellerProducts = async (req, res) => {
  try {
    const bestSellers = await Product.find({
      isBestSeller: true,
    })
      .populate("variants")
      .limit(4);

    res.json(bestSellers);
  } catch (error) {
    console.error("Error fetching best seller:", error);

    res.status(500).json({
      message: "Failed to get best seller products",
      error: error.message,
    });
  }
};
