import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hvacRouter from "./hvac";
import usageRouter from "./usage";
import sponsorRouter from "./sponsor";
import feedbackRouter from "./feedback";
import resolutionRouter from "./resolution";
import historyRouter from "./history";
import demoRouter from "./demo"; // APPLE REVIEW — demo-account bypass
import unitsRouter from "./units";
import diagnosticLogsRouter from "./diagnosticLogs";
import nameplateRouter from "./nameplate";
import timelineRouter from "./timeline";
import resourcesRouter from "./resources";
import storageRouter from "./storage";
import unitPhotosRouter from "./unitPhotos";
import scheduledEventsRouter from "./scheduledEvents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hvacRouter);
router.use(usageRouter);
router.use(sponsorRouter);
router.use(feedbackRouter);
router.use(resolutionRouter);
router.use(historyRouter);
router.use(demoRouter); // APPLE REVIEW — demo sign-in token endpoint
router.use(unitsRouter);
router.use(diagnosticLogsRouter);
router.use(nameplateRouter);
router.use(timelineRouter);
router.use(resourcesRouter);
router.use(storageRouter);
router.use(unitPhotosRouter);
router.use(scheduledEventsRouter);

export default router;
