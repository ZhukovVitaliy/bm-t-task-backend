function getFullAvatarURL(req, avatarURL) {
  if (avatarURL.startsWith("//")) {
    return `https:${avatarURL}`;
  }
  return `${req.protocol}://${req.get("host")}${avatarURL}`;
}

module.exports = getFullAvatarURL;
