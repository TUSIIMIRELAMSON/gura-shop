# Deploy GURA on Railway

This Railway setup keeps the GURA database and all uploaded product photos in
one persistent Railway Volume. It runs the app's Worker-compatible server
locally inside the Railway service, so do not add a separate PostgreSQL service
for this version.

## In Railway

1. Create a new project and choose **Deploy from GitHub repository**.
2. Select the repository containing this GURA source.
3. In the service, add a **Volume** and mount it at /data.
4. In **Variables**, add:

   - GURA_DATA_DIR = /data
   - OWNER_SETUP_KEY = a long, private random value you choose

   Keep the setup key private. You will use it once to create the shop owner
   account on the new Railway website.
5. Deploy the service. Railway uses the included Dockerfile.
6. After deployment succeeds, open **Settings → Networking → Generate Domain**.
7. Open the generated domain. At the bottom of the first page choose
   **Set up shop owner**, enter the private setup key, then choose your owner
   email and an owner password of at least 10 characters.

## Important

- The Railway database and photos begin empty. Your local .wrangler data and
  the previously published ChatGPT Site do not move automatically.
- Keep the /data Volume attached. Removing it removes the persistent database
  and photo storage used by this Railway deployment.
- Customer accounts need passwords of at least 6 characters.
- The GitHub repository should contain this whole project, including the
  Dockerfile and scripts/railway-start.mjs. Do not upload .dev.vars,
  .wrangler, or node_modules.
