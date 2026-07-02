import { Router, type IRouter, type Request, type Response } from "express";
import { conditionalClerkMiddleware, buildAuthDebugPayload } from "../lib/serverAuth";

const authDebugRouter: IRouter = Router();

authDebugRouter.use(conditionalClerkMiddleware());

authDebugRouter.get("/auth-debug", (req: Request, res: Response) => {
  res.json(buildAuthDebugPayload(req));
});

export default authDebugRouter;
