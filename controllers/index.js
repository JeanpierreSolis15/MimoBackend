const Router = require("express");
const { couponsRouter } = require("./api/coupons");
const { advertisingRouter } = require("./api/advertising")

const { couponsUpdateRouter } = require("./api/couponsUpdate");
const { bannerRouter } = require("./api/banner");
const { notificationsRouter } = require("./api/notifications");
const apiRouter = Router();

apiRouter.use("/coupons", couponsRouter);
apiRouter.use("/advertising", advertisingRouter)
apiRouter.use("/couponsUpdate", couponsUpdateRouter)
apiRouter.use("/banners", bannerRouter)
apiRouter.use("/notifications", notificationsRouter)
module.exports = apiRouter;
