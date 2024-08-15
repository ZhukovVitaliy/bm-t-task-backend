const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs/promises");
const path = require("path");

const { User } = require("../models/user");
const { HttpError, ctrlWrapper } = require("../helpers");
const getFullAvatarURL = require("../helpers/getFullAvatarURL");

const { SECRET_KEY } = process.env;
const avatarsDir = path.join(__dirname, "../", "public", "avatars");

const register = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    throw HttpError(409, "Email already in use");
  }

  const hashPassword = await bcrypt.hash(password, 10);
  const avatarURL = gravatar.url(email);

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    avatarURL,
  });

  res.status(201).json({
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

  const fullAvatarURL = getFullAvatarURL(req, user.avatarURL);

  res.json({
    token,
    name: user.name,
    email: user.email,
    avatarURL: fullAvatarURL,
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

const updateAvatar = async (req, res) => {
  const { _id } = req.user;
  const { path: tempUpload, originalname } = req.file;
  const filename = `${_id}_${originalname}`;

  const resultUpload = path.join(avatarsDir, filename);

  await fs.rename(tempUpload, resultUpload);
  const avatarURL = path.join("avatars", filename);
  await User.findByIdAndUpdate(_id, { avatarURL });

  const fullAvatarURL = getFullAvatarURL(req, avatarURL);

  res.json({ avatarURL: fullAvatarURL });
};

const updateProfile = async (req, res) => {
  const { _id } = req.user;
  const { name, email, password } = req.body;
  let avatarURL;
  let updatedFields = { name, email };

  if (password) {
    const hashPassword = await bcrypt.hash(password, 10);
    updatedFields.password = hashPassword;
  }

  if (req.file) {
    const { path: tempUpload, originalname } = req.file;
    const filename = `${_id}_${originalname}`;
    const resultUpload = path.join(avatarsDir, filename);

    await fs.rename(tempUpload, resultUpload);

    avatarURL = `/avatars/${filename}`;
    updatedFields.avatarURL = avatarURL;
  }

  const updatedUser = await User.findByIdAndUpdate(_id, updatedFields, {
    new: true,
  });

  const fullAvatarURL = getFullAvatarURL(req, updatedUser.avatarURL);

  res.json({
    name: updatedUser.name,
    email: updatedUser.email,
    avatarURL: fullAvatarURL,
  });
};

module.exports = {
  register: ctrlWrapper(register),
  login: ctrlWrapper(login),
  getCurrent: ctrlWrapper(getCurrent),
  logout: ctrlWrapper(logout),
  updateAvatar: ctrlWrapper(updateAvatar),
  updateProfile: ctrlWrapper(updateProfile),
};
