const Router = require("express");
const { couponsRouter } = require("./api/coupons");
const { advertisingRouter } = require("./api/advertising")

const { couponsUpdateRouter } = require("./api/couponsUpdate");
const { bannerRouter } = require("./api/banner");
const apiRouter = Router();

apiRouter.use("/coupons", couponsRouter);
apiRouter.use("/advertising", advertisingRouter)
apiRouter.use("/couponsUpdate", couponsUpdateRouter)
apiRouter.use("/banners", bannerRouter)
module.exports = apiRouter;
