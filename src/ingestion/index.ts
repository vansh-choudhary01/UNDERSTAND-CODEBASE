import fs from "fs";
import { spawn } from "child_process";
import type { FilePath } from "./types.js";

const languageMap: { [key: string]: string } = {
    "ts": "TypeScript",
    "tsx": "TypeScript",
    "js": "JavaScript",
    "json": "JSON",
    "txt": "Text",
    "md": "Markdown",
    "yaml": "YAML",
    "yml": "YAML",
    "Unknown": "Unknown",
    "jsx": "JavaScript",
    "py": "Python",
    "java": "Java",
    "cpp": "C++",
    "c": "C",
    "cs": "C#",
    "rb": "Ruby",
    "go": "Go",
    "php": "PHP",
    "html": "HTML",
    "css": "CSS",
    // Add more mappings as needed
};

async function postRepo(repo: string) {
    return new Promise((res, rej) => {
        const pwd = process.cwd() + "/repos";
        // create a container then clone it or just fetch 
        fs.mkdir(pwd, { recursive: true }, (err) => { console.log(err) });

        const command = `git clone ${repo}`
        const child = spawn(command, {
            cwd: pwd,
            shell: true
        })


        child.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        child.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        child.on("error", rej);

        child.on("close", res);

    });
}

function findRepoFolderName(repo: string) {
    const parts = repo.split("/");
    const lastPart = parts[parts.length - 1] as string;
    return lastPart.replace(".git", "");
}

export async function ingestRepo(repo: string) {
    const res = await postRepo(repo);

    if (res !== 0 && res !== 128) {
        console.error("Error cloning the repository");
        return;
    }
    const ingestionArray: FilePath[] = [];
    const rootFolder = findRepoFolderName(repo);

    function handleDirectory(dirPath: string) {
        for (const file of fs.readdirSync(dirPath)) {
            if (file === ".git") continue;
            if (file === "node_modules") continue;
            // first detect is it folder or file
            const filePath = `${dirPath}/${file}`;
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                const path = filePath.split(`/repos/${rootFolder}`)[1] as string;
                const content = fs.readFileSync(filePath, "utf8");
                const size = stat.size;
                const language = languageMap[file.split(".").pop() || "Unknown"] || "Unknown";
                ingestionArray.push({ path, language, content, size });
            } else {
                // It's a directory
                handleDirectory(filePath);
            }
        }
    }

    handleDirectory(`${process.cwd()}/repos/${findRepoFolderName(repo)}`);
    return ingestionArray;
}
