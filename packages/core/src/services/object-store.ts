import { Client } from "minio";

export type StoredObject = {
  body: Buffer;
  contentType: string;
};

export type ObjectStore = {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
};

export type ObjectStoreConfig = {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
};

const MISSING = new Set(["NoSuchKey", "NotFound"]);

export function createObjectStore(config: ObjectStoreConfig): ObjectStore {
  const client = new Client({
    endPoint: config.endPoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
  let ready: Promise<void> | null = null;
  const ensureBucket = (): Promise<void> => {
    ready ??= client.bucketExists(config.bucket).then((exists) => {
      if (!exists) return client.makeBucket(config.bucket);
    });
    return ready;
  };
  return {
    async put(key, body, contentType) {
      await ensureBucket();
      await client.putObject(config.bucket, key, body, body.length, { "Content-Type": contentType });
    },
    async get(key) {
      await ensureBucket();
      try {
        const stream = await client.getObject(config.bucket, key);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) chunks.push(Buffer.from(chunk));
        return { body: Buffer.concat(chunks), contentType: "application/octet-stream" };
      } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
        if (MISSING.has(code)) return null;
        throw error;
      }
    },
  };
}
