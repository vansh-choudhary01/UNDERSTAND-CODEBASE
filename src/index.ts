import { ingestRepo } from "./ingestion/index.js";

async function main() {
    const ingestionArray = await ingestRepo("https://github.com/vansh-choudhary01/todo");
    console.log(ingestionArray);
}

main();