import "server-only";

import { Db, MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

function mongoUri() {
  return process.env.MONGODB_URI?.trim();
}

function mongoDbName() {
  return process.env.MONGODB_DB_NAME?.trim() || "xtyle";
}

function createClientPromise() {
  const uri = mongoUri();
  if (!uri) {
    throw new Error(
      "MONGODB_URI no está configurada. Agrégala al entorno antes de consultar datos.",
    );
  }

  return new MongoClient(uri).connect();
}

export function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    global._mongoClientPromise ??= createClientPromise();
    return global._mongoClientPromise;
  }

  clientPromise ??= createClientPromise();
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(mongoDbName());
}

export function isMongoConfigured(): boolean {
  return Boolean(mongoUri());
}
