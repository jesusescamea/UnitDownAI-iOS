import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hvacRouter from "./hvac";
import usageRouter from "./usage";
import sponsorRouter from "./sponsor";
import feedbackRouter from "./feedback";
import resolutionRouter from "./resolution";
import historyRouter from "./history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hvacRouter);
router.use(usageRouter);
router.use(sponsorRouter);
router.use(feedbackRouter);
router.use(resolutionRouter);
router.use(historyRouter);

export default router;
