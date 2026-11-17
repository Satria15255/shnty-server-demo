const User = require("../models/User");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

exports.getUser = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getUserTransaction = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID user tidak valid" });
    }

    const userId = new mongoose.Types.ObjectId(req.params.id);

    const transactions = await Transaction.find({ user: userId }).populate(
      "user",
      "name email",
    );

    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error get user transaction", err });
  }
};

exports.getUserWithTransactions = async (req, res) => {
  try {
    const { user } = req.params;

    if (!mongoose.isValidObjectId(user)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const [users, transactions, totalTransactions] = await Promise.all([
      User.findById(user).select("-password").lean(),
      Transaction.find({ user })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Transaction.countDocuments({ user }),
    ]);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...users,
        transactions,
      },
      pagination: {
        page,
        limit,
        totalTransactions,
        totalPages: Math.ceil(totalTransactions / limit),
      },
    });
  } catch (error) {
    console.error("getUserWithTransactions error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
