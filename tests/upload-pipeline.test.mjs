import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("uploads raw image bytes before the app router", async () => {
  const [worker, client] = await Promise.all([
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/image-upload-utils.ts", import.meta.url), "utf8"),
  ]);

  const uploadBranch = worker.indexOf('url.pathname === "/admin/media"');
  const appRouter = worker.indexOf("return handler.fetch(request, env, ctx)");
  assert.ok(uploadBranch >= 0 && uploadBranch < appRouter);
  assert.match(worker, /env\.BUCKET\.put\(key, request\.body/);
  assert.doesNotMatch(client, /new FormData\(\)/);
  assert.match(client, /body: file/);
});

test("A4 uploads retain safe source and transfer limits", async () => {
  const source = await readFile(new URL("../app/admin/image-upload-utils.ts", import.meta.url), "utf8");
  assert.match(source, /MAX_SOURCE_BYTES = 80 \* MB/);
  assert.match(source, /MAX_UPLOAD_BYTES = 8 \* MB/);
  assert.match(source, /A4_LONG_EDGE_PX = 3508/);
});
