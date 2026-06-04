import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import { createSupabaseAdmin, isSupabaseConfigured } from "../src/lib/supabase/admin";

const CV_BUCKET = "cv-uploads";
const MAX_CV_BYTES = 5 * 1024 * 1024;

async function main() {
  if (!isSupabaseConfigured()) {
    console.error(
      "Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
    );
    process.exit(1);
  }

  const client = createSupabaseAdmin();
  const { data: buckets, error: listError } = await client.storage.listBuckets();

  if (listError) {
    console.error("listBuckets failed:", listError.message);
    process.exit(1);
  }

  const exists = buckets?.some((b) => b.name === CV_BUCKET);
  if (exists) {
    console.log(`ok — bucket "${CV_BUCKET}" already exists`);
    return;
  }

  const { error: createError } = await client.storage.createBucket(CV_BUCKET, {
    public: false,
    fileSizeLimit: MAX_CV_BYTES,
    allowedMimeTypes: [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  });

  if (createError) {
    console.error("createBucket failed:", createError.message);
    process.exit(1);
  }

  console.log(`ok — created bucket "${CV_BUCKET}" (private, 5 MB limit)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
