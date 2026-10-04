import { neo4jDriver, NEO4J_DATABASE } from "./neo4j.js";

export async function initializeGraphSchema(): Promise<void> {
    await neo4jDriver.executeQuery(
        `
        CREATE CONSTRAINT file_id_unique IF NOT EXISTS
        FOR (f:File)
        REQUIRE f.id IS UNIQUE
        `,
        {},
        { database: NEO4J_DATABASE }
    );

    await neo4jDriver.executeQuery(
        `
        CREATE CONSTRAINT symbol_id_unique IF NOT EXISTS
        FOR (s:Symbol)
        REQUIRE s.id IS UNIQUE
        `,
        {},
        { database: NEO4J_DATABASE }
    );

    await neo4jDriver.executeQuery(
        `
        CREATE INDEX file_path_index IF NOT EXISTS
        FOR (f:File)
        ON (f.filePath)
        `,
        {},
        { database: NEO4J_DATABASE }
    );

    await neo4jDriver.executeQuery(
        `
        CREATE INDEX symbol_file_path_index IF NOT EXISTS
        FOR (s:Symbol)
        ON (s.filePath)
        `,
        {},
        { database: NEO4J_DATABASE }
    );

    await neo4jDriver.executeQuery(
        `
        CREATE INDEX symbol_type_index IF NOT EXISTS
        FOR (s:Symbol)
        ON (s.type)
        `,
        {},
        { database: NEO4J_DATABASE }
    );

    console.log("Graph schema initialized");
}
