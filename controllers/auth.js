const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs/promises");
const path = require("path");
const cloudinary = require("../cloudinary");

const { User } = require("../models/user");
const { HttpError, ctrlWrapper } = require("../helpers");

const { SECRET_KEY } = process.env;

const register = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    throw HttpError(409, "Email already in use");
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
  });

  const payload = {
    id: newUser._id,
  };

  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });

  await User.findByIdAndUpdate(newUser._id, { token });

  res.status(201).json({
    token,
    email: newUser.email,
    name: newUser.name,
    avatarURL: newUser.avatarURL,
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw HttpError(401, "Email or password invalid");
  }

  const passwordCompare = await bcrypt.compare(password, user.password);
  if (!passwordCompare) {
    throw HttpError(401, "Email or password invalid");
  }

  const payload = {
    id: user._id,
  };

  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
  await User.findByIdAndUpdate(user._id, { token });

  res.json({
    token,
    name: user.name,
    email: user.email,
    avatarURL: user.avatarURL,
  });
};

const getCurrent = async (req, res) => {
  const { email, name } = req.user;
  res.json({ email, name });
};

const logout = async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: "" });

  res.json({ message: "Logout success" });
};

const updateProfile = async (req, res) => {
  const { _id } = req.user;
  const { name, email, password } = req.body;
  let updatedFields = { name, email };

  const existingUser = await User.findOne({ email });
  if (existingUser && existingUser._id.toString() !== _id.toString()) {
    throw HttpError(409, "Email already in use");
  }

  if (password) {
    const hashPassword = await bcrypt.hash(password, 10);
    updatedFields.password = hashPassword;
  }

  if (req.file) {
    const { path: tempUpload } = req.file;
    try {
      const result = await cloudinary.uploader.upload(tempUpload, {
        folder: "avatars",
        public_id: _id,
      });

      updatedFields.avatarURL = result.secure_url;
    } catch (error) {
      throw HttpError(500, "Failed to upload avatar");
    } finally {
      await fs.unlink(tempUpload);
    }
  }

  const updatedUser = await User.findByIdAndUpdate(_id, updatedFields, {
    new: true,
  });

  res.json({
    name: updatedUser.name,
    email: updatedUser.email,
    avatarURL: updatedUser.avatarURL,
  });
};

module.exports = {
  register: ctrlWrapper(register),
  login: ctrlWrapper(login),
  getCurrent: ctrlWrapper(getCurrent),
  logout: ctrlWrapper(logout),
  updateProfile: ctrlWrapper(updateProfile),
};
