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

const normalizeQueryArray = (value) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return [
    ...new Set(
      values
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

exports.getAllProducts = async (req, res) => {
  try {
    const { search, category, type, size, discount, latest } = req.query;

    const categories = normalizeQueryArray(category);
    const types = normalizeQueryArray(type);
    const sizes = normalizeQueryArray(size).map((item) => item.toUpperCase());

    const conditions = [];
    const now = new Date();

    // 1. Search
    if (typeof search === "string" && search.trim()) {
      const keyword = escapeRegex(search.trim().slice(0, 100));

      conditions.push({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { brand: { $regex: keyword, $options: "i" } },
          { category: { $regex: keyword, $options: "i" } },
          { type: { $regex: keyword, $options: "i" } },
          { material: { $regex: keyword, $options: "i" } },
          { color: { $regex: keyword, $options: "i" } },
        ],
      });
    }

    // 2. Collection -> Product.category
    if (categories.length > 0) {
      conditions.push({
        category: { $in: categories },
      });
    }

    // 3. Category -> Product.type
    if (types.length > 0) {
      conditions.push({
        type: { $in: types },
      });
    }

    // 4. Size -> ProductVariant
    if (sizes.length > 0) {
      const productIds = await ProductVariant.distinct("product", {
        size: { $in: sizes },
        stock: { $gt: 0 },
      });

      conditions.push({
        _id: { $in: productIds },
      });
    }

    // 5. Active Discount -> DailyDiscount
    if (discount === "true") {
      const productIds = await DailyDiscount.distinct("productId", {
        expiresAt: { $gt: now },
      });

      conditions.push({
        _id: { $in: productIds },
      });
    }

    // 6. Combine filters
    const filter = conditions.length > 0 ? { $and: conditions } : {};

    let query = Product.find(filter)
      .sort({ createdAt: -1 })
      .populate("variants");

    // Latest: 9 newest matching products
    if (latest === "true") {
      query = query.limit(9);
    }

    const products = await query;

    // 7. Attach active discount information
    const activeDiscounts = await DailyDiscount.find({
      productId: { $in: products.map((product) => product._id) },
      expiresAt: { $gt: now },
    }).lean();

    const discountMap = new Map(
      activeDiscounts.map((item) => [String(item.productId), item]),
    );

    const results = products.map((product) => {
      const activeDiscount = discountMap.get(String(product._id));

      return {
        ...product.toJSON(),
        isDiscount: !!activeDiscount,
        discountPercent: activeDiscount?.discountPercent ?? 0,
        discountPrice: activeDiscount?.discountPrice ?? null,
      };
    });

    return res.json(results);
  } catch (error) {
    console.error("Failed fetching products:", error);

    return res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
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

    // 1. Parse variants dari multipart/form-data.
    let variants;

    try {
      variants = JSON.parse(req.body.variants);
    } catch {
      return res.status(400).json({
        message: "Variants must be valid JSON",
      });
    }

    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({
        message: "At least one variant is required",
      });
    }

    // 2. Validasi ulang di backend.
    const invalidVariant = variants.some((variant) => {
      return (
        !variant ||
        typeof variant.size !== "string" ||
        !variant.size.trim() ||
        typeof variant.stock !== "number" ||
        !Number.isSafeInteger(variant.stock) ||
        variant.stock < 0
      );
    });

    if (invalidVariant) {
      return res.status(400).json({
        message: "Each variant needs a size and a non-negative integer stock",
      });
    }

    const normalizedVariants = variants.map((variant) => ({
      size: variant.size.trim().toUpperCase(),
      stock: variant.stock,
    }));

    const uniqueSizes = new Set(
      normalizedVariants.map((variant) => variant.size),
    );

    if (uniqueSizes.size !== normalizedVariants.length) {
      return res.status(400).json({
        message: "Duplicate sizes are not allowed",
      });
    }

    const rawPrice = req.body.price;

    if (
      typeof rawPrice !== "string" ||
      !rawPrice.trim() ||
      !Number.isFinite(Number(rawPrice)) ||
      Number(rawPrice) < 0
    ) {
      return res.status(400).json({
        message: "Price must be a valid non-negative number",
      });
    }

    // 3. Simpan product dan variants dalam satu transaction.
    const savedProduct = await Product.db.transaction(async (session) => {
      const product = new Product({
        name: req.body.name,
        brand: req.body.brand,
        price: Number(rawPrice),
        category: req.body.category,
        type: req.body.type,
        material: req.body.material,
        color: req.body.color,
        description: req.body.description,
        image: req.file.path,
        createdBy: req.user?.id || null,
      });

      await product.save({ session });

      for (const variant of normalizedVariants) {
        const productVariant = new ProductVariant({
          product: product._id,
          size: variant.size,
          stock: variant.stock,
        });

        await productVariant.save({ session });
      }

      return product.toObject();
    });

    // Pertahankan bentuk response product seperti controller sebelumnya.
    return res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Create product error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)
          .map((detail) => detail.message)
          .join(", "),
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Product or variant already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to create product and variants",
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
