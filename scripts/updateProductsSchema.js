const mongoose = require("mongoose");
const Product = require("../models/Product");

const updateProduct = async () => {
  try {
    await Product.updateMany(
      {},
      {
        $set: {
          totalSold: 0,
          isBestSeller: false,
        },
      },
    );

    console.log("Products Updated");

    process.exit();
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

updateProduct();
