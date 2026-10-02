import express, {type Request, type Response, type NextFunction, type Errback} from "express";
import path from "node:path";
import routes from "./routes/repo.js";

const app = express();

app.use(express.static('public'));

app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
});

app.use(express.json());

app.use("/api", routes);

app.use((err: Errback, req: Request, res: Response, next: NextFunction) => {
    return res.status(500).json({
        success: false,
        message: JSON.stringify(err)
    })
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})