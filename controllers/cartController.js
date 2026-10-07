const Cart = require("../models/Cart");
const DailyDiscount = require("../models/DailyDiscount");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");

exports.addToCart = async (req, res) => {
  const userId = req.user.id;
  const { productId, size } = req.body;
  const quantity = Number(req.body.quantity ?? 1);

  try {
    if (!productId || !size) {
      return res.status(400).json({
        message: "Product and size are required",
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        message: "Quantity must be at least 1",
      });
    }

    const normalizedSize = String(size).trim().toUpperCase();

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const variant = await ProductVariant.findOne({
      product: productId,
      size: normalizedSize,
    });

    if (!variant) {
      return res.status(404).json({
        message: "Product variant not found",
      });
    }

    if (variant.stock < 1) {
      return res.status(400).json({
        message: "Product variant is out of stock",
      });
    }

    const discount = await DailyDiscount.findOne({
      productId: product._id,
      expiresAt: { $gt: new Date() },
    });

    const discountPercent = discount ? discount.discountPercent : 0;

    const finalPrice =
      discountPercent > 0
        ? product.price - (product.price * discountPercent) / 100
        : product.price;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      if (quantity > variant.stock) {
        return res.status(400).json({
          message: `Only ${variant.stock} item(s) available`,
        });
      }

      cart = new Cart({
        userId,

        items: [
          {
            productId,
            quantity,
            size: normalizedSize,
            price: product.price,
            finalPrice,
            discountPercent,
          },
        ],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) =>
          item.productId.toString() === productId.toString() &&
          String(item.size).toUpperCase() === normalizedSize,
      );

      if (itemIndex > -1) {
        const newQuantity = cart.items[itemIndex].quantity + quantity;

        if (newQuantity > variant.stock) {
          return res.status(400).json({
            message: `Only ${variant.stock} item(s) available`,
          });
        }

        cart.items[itemIndex].quantity = newQuantity;

        // Refresh price snapshot
        cart.items[itemIndex].price = product.price;
        cart.items[itemIndex].finalPrice = finalPrice;
        cart.items[itemIndex].discountPercent = discountPercent;
      } else {
        if (quantity > variant.stock) {
          return res.status(400).json({
            message: `Only ${variant.stock} item(s) available`,
          });
        }

        cart.items.push({
          productId,
          quantity,
          size: normalizedSize,
          price: product.price,
          finalPrice,
          discountPercent,
        });
      }
    }

    await cart.save();

    res.status(200).json({
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    console.error("Add to cart failed:", error);

    res.status(500).json({
      message: "Failed to add product to cart",
    });
  }
};

exports.getUserCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({
      userId,
    }).populate("items.productId");

    if (!cart) {
      return res.status(200).json({
        items: [],
      });
    }

    res.status(200).json({
      items: cart.items,
    });
  } catch (error) {
    console.error("Get cart error:", error);

    res.status(500).json({
      message: "Failed to get cart",
    });
  }
};

exports.updateQuantity = async (req, res) => {
  const userId = req.user.id;
  const { productId, size } = req.body;
  const quantity = Number(req.body.quantity);

  try {
    if (!Number.isInteger(quantity)) {
      return res.status(400).json({
        message: "Invalid quantity",
      });
    }

    const normalizedSize = String(size).trim().toUpperCase();

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.productId &&
        item.productId.toString() === productId &&
        String(item.size).toUpperCase() === normalizedSize,
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    if (quantity < 1) {
      cart.items.splice(itemIndex, 1);

      await cart.save();

      return res.json({
        message: "Item removed from cart",
        cart,
      });
    }

    const variant = await ProductVariant.findOne({
      product: productId,
      size: normalizedSize,
    });

    if (!variant) {
      return res.status(404).json({
        message: "Product variant not found",
      });
    }

    if (quantity > variant.stock) {
      return res.status(400).json({
        message: `Only ${variant.stock} item(s) available`,
      });
    }

    cart.items[itemIndex].quantity = quantity;

    await cart.save();

    res.json({
      message: "Cart updated",
      cart,
    });
  } catch (error) {
    console.error("Update cart error:", error);

    res.status(500).json({
      message: "Failed to update cart",
    });
  }
};

exports.removeCartItem = async (req, res) => {
  const userId = req.user.id;
  const { productId, size } = req.params;

  try {
    const normalizedSize = String(size).trim().toUpperCase();

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    cart.items = cart.items.filter(
      (item) =>
        !(
          item.productId.toString() === productId &&
          String(item.size).toUpperCase() === normalizedSize
        ),
    );

    await cart.save();

    res.status(200).json({
      message: "Item removed from cart",
      cart,
    });
  } catch (error) {
    console.error("Remove cart item error:", error);

    res.status(500).json({
      message: "Failed to remove item from cart",
    });
  }
};

exports.clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      {
        userId: req.user.id,
      },
      {
        items: [],
      },
    );

    res.json({
      message: "Cart cleared",
    });
  } catch (error) {
    console.error("Clear cart error:", error);

    res.status(500).json({
      message: "Failed to clear cart",
    });
  }
};
