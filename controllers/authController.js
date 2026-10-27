const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const user = new User({ name, email, password });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email Not Found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Wrong Password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }
    console.log(user);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User Not Found",
      });
    }

    const { name, phoneNumber } = req.body;

    if (name !== undefined) {
      user.name = name.trim();
    }

    if (phoneNumber !== undefined) {
      user.phoneNumber = phoneNumber.trim();
    }

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Profile Updated",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        address: updatedUser.address,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        message: "Current passsword incorrect",
      });
    }

    user.password = newPassword;

    await user.save();

    res.status(200).json({
      message: " Update Password Successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ADDRESS CONTROLLER //
exports.addUserAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User Not Found",
      });
    }

    const { label, country, city, specificAddress } = req.body;

    user.address.push({
      label: label || "Home",
      country: country || "",
      city: city || "",
      specificAddress: specificAddress || "",
    });

    await user.save();

    res.status(201).json({
      message: "Address Added",
      address: user.address,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add address",
      error: error.message,
    });
  }
};

exports.updateUserAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User Not Found",
      });
    }

    const address = user.address.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({
        message: "Address Not Found",
      });
    }

    const { label, country, city, specificAddress } = req.body;

    if (label !== undefined) {
      address.label = label.trim();
    }

    if (country !== undefined) {
      address.country = country.trim();
    }

    if (city !== undefined) {
      address.city = city.trim();
    }

    if (specificAddress !== undefined) {
      address.specificAddress = specificAddress.trim();
    }

    await user.save();

    res.status(200).json({
      message: "Address Updated",
      address,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update address",
      error: error.message,
    });
  }
};

exports.deleteUserAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User Not Found",
      });
    }

    const address = user.address.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({
        message: "Address Not Found",
      });
    }

    address.deleteOne();

    await user.save();

    res.status(200).json({
      message: "Address Deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete address",
      error: error.message,
    });
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User Not Found",
      });
    }

    const selectedAddress = user.address.id(req.params.addressId);

    if (!selectedAddress) {
      return res.status(404).json({
        message: "Address Not Found",
      });
    }

    user.address.forEach((address) => {
      address.isDefault = false;
    });

    selectedAddress.isDefault = true;

    await user.save();

    res.status(200).json({
      message: "Default Address Updated",
      address: selectedAddress,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update default address",
      error: error.message,
    });
  }
};
