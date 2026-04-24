import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const corsOrigin = process.env["CORS_ORIGIN"];
app.use(
  cors({
    origin: corsOrigin
      ? corsOrigin.split(",").map((o) => o.trim())
      : true,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use(
  (err: Error & { cause?: unknown }, req: Request, res: Response, _next: NextFunction) => {
    const errorDetails: Record<string, unknown> = {
      method: req.method,
      url: req.url,
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
    for (const key of Object.getOwnPropertyNames(err)) {
      if (!(key in errorDetails)) {
        errorDetails[key] = (err as unknown as Record<string, unknown>)[key];
      }
    }
    if (err.cause) {
      const cause = err.cause as Error & Record<string, unknown>;
      const causeDetails: Record<string, unknown> = {
        name: cause.name,
        message: cause.message,
        stack: cause.stack,
      };
      for (const key of Object.getOwnPropertyNames(cause)) {
        if (!(key in causeDetails)) {
          causeDetails[key] = cause[key];
        }
      }
      errorDetails["cause"] = causeDetails;
    }
    logger.error(errorDetails, "unhandled route error");
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

export default app;
