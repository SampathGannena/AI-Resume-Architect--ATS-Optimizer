const { normalizeUserId } = require("../store/billingStore");

function attachUserContext(req, _, next) {
  const headerUserId = req.headers["x-user-id"];
  const queryUserId = req.query?.userId;
  const bodyUserId = req.body?.userId;

  const userId = normalizeUserId(
    typeof headerUserId === "string"
      ? headerUserId
      : typeof queryUserId === "string"
        ? queryUserId
        : typeof bodyUserId === "string"
          ? bodyUserId
          : "demo-user"
  );

  req.user = {
    id: userId
  };

  next();
}

module.exports = {
  attachUserContext
};
