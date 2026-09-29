import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("recompute trending scores", { minutes: 15 }, internal.trending.recompute, {});

crons.daily(
  "re-audit stale scorecards",
  { hourUTC: 6, minuteUTC: 0 },
  internal.trending.scheduleReaudits,
  {},
);

export default crons;
