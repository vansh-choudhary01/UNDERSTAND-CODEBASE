import { neo4jDriver, NEO4J_DATABASE } from "./neo4j.js";

export interface GraphConnection {
    sourceId: string;
    sourceName: string;
    targetId: string;
    targetName: string;
    relationship: string;
}

function mapConnections(records: any[]): GraphConnection[] {
    return records.map((record) => ({
        sourceId: record.get("sourceId"),
        sourceName: record.get("sourceName"),
        targetId: record.get("targetId"),
        targetName: record.get("targetName"),
        relationship: record.get("relationship"),
    }));
}

export async function getOutgoingCalls(
    symbolId: string
): Promise<GraphConnection[]> {
    const result = await neo4jDriver.executeQuery(
        `
        MATCH (source:Symbol {id: $symbolId})
              -[:CALLS]->
              (target:Symbol)

        RETURN
            source.id AS sourceId,
            source.name AS sourceName,
            target.id AS targetId,
            target.name AS targetName,
            "CALLS" AS relationship
        `,
        { symbolId },
        { database: NEO4J_DATABASE }
    );

    return mapConnections(result.records);
}

export async function getIncomingCalls(
    symbolId: string
): Promise<GraphConnection[]> {
    const result = await neo4jDriver.executeQuery(
        `
        MATCH (source:Symbol)
              -[:CALLS]->
              (target:Symbol {id: $symbolId})

        RETURN
            source.id AS sourceId,
            source.name AS sourceName,
            target.id AS targetId,
            target.name AS targetName,
            "CALLS" AS relationship
        `,
        { symbolId },
        { database: NEO4J_DATABASE }
    );

    return mapConnections(result.records);
}

export async function getCallDependencies(
    symbolId: string,
    depth: number = 2
): Promise<GraphConnection[]> {
    // Validate before interpolating into Cypher.
    if (!Number.isInteger(depth) || depth < 1 || depth > 3) {
        throw new Error("Depth must be between 1 and 3");
    }

    const result = await neo4jDriver.executeQuery(
        `
        MATCH (start:Symbol {id: $symbolId})
        MATCH path = (start)-[:CALLS*1..${depth}]->(target:Symbol)

        // Collect every relationship along the path.
        UNWIND relationships(path) AS rel

        WITH DISTINCT rel

        RETURN
            startNode(rel).id AS sourceId,
            startNode(rel).name AS sourceName,
            endNode(rel).id AS targetId,
            endNode(rel).name AS targetName,
            type(rel) AS relationship

        LIMIT 100
        `,
        { symbolId },
        { database: NEO4J_DATABASE }
    );

    return mapConnections(result.records);
}