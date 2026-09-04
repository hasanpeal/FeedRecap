import app from "./app";
import { startBackgroundJobs } from "./jobs";

const port = 3001;

startBackgroundJobs();

app.listen(port, () => {
  console.log(`[Server] Listening on port ${port}`);
});
