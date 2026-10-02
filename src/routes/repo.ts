import { Router } from "express";
import z from "zod";
import { ask, indexRepo } from "../index.js";
import prisma from "../lib/prisma.js";
import axios from "axios";

const router = Router();

const postRepoValidator = z.object({
    repo: z.string()
})

router.post("/indexRepo", async (req, res, next) => {
    try {
        const body = req.body;

        const validate = postRepoValidator.safeParse(body);

        if (!validate.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid request body"
            })
        }

        let { repo } = validate.data;

        // Validate GitHub URL format
        const githubUrlRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(?:\.git)?\/?$/;
        if (!githubUrlRegex.test(repo)) {
            return res.status(400).json({ message: 'Invalid GitHub URL format' });
        }

        const match = repo.match(/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/);
        if (!match) {
            return res.status(400).json({ message: 'Invalid GitHub URL format' });
        }

        const [, owner, repoName] = match;
        let apiUrl = `https://api.github.com/repos/${owner}/${repoName}`;

        const githubRes = await axios.get(apiUrl);

        if (githubRes.status !== 200) {
            return res.status(400).json({ message: githubRes.data.message });
        }

        apiUrl = `https://github.com/${owner}/${repoName}.git`

        const exist = await prisma.repo.findFirst({
            where: {
                repository: apiUrl
            }
        })

        if (exist) {
            return res.status(200).json({
                success: true,
                message: "Repository already indexed"
            })
        }

        const repoRes = await indexRepo(apiUrl);

        return res.status(201).json({
            success: true,
            data: repoRes
        })
    } catch (err) {
        next(err);
    }
});

const askValidator = z.object({
    question: z.string(),
    repo: z.string()
})

router.get("/ask", (req, res, next) => {
    try {
        const query = req.query;

        const validate = askValidator.safeParse(query);

        if (!validate.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid request body"
            })
        }

        const { question, repo } = validate.data;

        const answer = ask(question, repo);

        return res.status(200).json({
            success: true,
            data: answer
        })
    } catch (err) {
        next(err)
    }
});

export default router;