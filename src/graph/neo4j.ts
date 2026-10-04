import neo4j, { Driver } from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config();

export const neo4jDriver: Driver = neo4j.driver(
    process.env.NEO4J_URI!,

    neo4j.auth.basic(
        process.env.NEO4J_USERNAME!,
        process.env.NEO4J_PASSWORD!
    )
)

export const NEO4J_DATABASE = process.env.NEO4J_DATABASE || "neo4j";

export async function verifyNeo4jConnection(): Promise<void> {
    try {
        await neo4jDriver.verifyConnectivity();

        console.log("Neo4j connected")
    } catch (error) {
        console.error("Neo4j connection failed: ", error)
    }
}

export async function closeNeo4j(): Promise<void> {
    await neo4jDriver.close();

    console.log("Neo4j connection closed")
}
