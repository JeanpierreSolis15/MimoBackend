const Router = require("express");
const { couponsRouter } = require("./api/coupons");

const apiRouter = Router();

apiRouter.use("/coupons", couponsRouter);

module.exports = apiRouter;
