import express, {type Request, type Response, type NextFunction, type Errback} from "express";
import path from "node:path";
import routes from "./routes/repo.js";
import { verifyNeo4jConnection } from "./graph/neo4j.js";
import dotenv from "dotenv";
import { initializeGraphSchema } from "./graph/schema.js";
dotenv.config();

await verifyNeo4jConnection()
await initializeGraphSchema();

const app = express();
const publicDir = path.resolve(process.cwd(), "public");

app.use(express.static(publicDir));

app.get("/", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
});

app.use(express.json());

app.use("/api", routes);

app.get("/:owner/:repoName", (_req, res) => {
    res.sendFile(path.join(publicDir, "repo.html"));
});

app.get("/:repoName", (_req, res) => {
    res.sendFile(path.join(publicDir, "repo.html"));
});

app.use((err: Errback, _req: Request, res: Response, _next: NextFunction) => {
    console.log(err);
    return res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : "Internal server error"
    })
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})
