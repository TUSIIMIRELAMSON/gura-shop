declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    OWNER_SETUP_KEY?: string;
    BUCKET?: R2Bucket;
  }
}
