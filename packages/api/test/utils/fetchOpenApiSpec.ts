import fs from "node:fs";
import fetch from "cross-fetch";
import {OpenApiFile, OpenApiJson} from "./parseOpenApiSpec.js";

/* eslint-disable no-console */

export async function fetchOpenApiSpec(openApiFile: OpenApiFile): Promise<OpenApiJson> {
  if (fs.existsSync(openApiFile.filepath)) {
    const openApiJson = JSON.parse(fs.readFileSync(openApiFile.filepath, "utf8")) as OpenApiJson;
    if (openApiFile.version.test(openApiJson.info.version)) {
      // Ok, cached file has wanted version
      return openApiJson;
    }
  }

  // File not cached, or wrong version
  console.log(`Downloading oapi file from ${openApiFile.url}`);
  const openApiStr = await fetch(openApiFile.url).then((res) => res.text());

  const openApiJson = JSON.parse(openApiStr) as OpenApiJson;
  // Parse before writting to ensure it's proper JSON
  fs.writeFileSync(openApiFile.filepath, openApiStr);

  if (!openApiFile.version.test(openApiJson.info.version)) {
    throw Error(`Downloaded oapi file version ${openApiJson.info.version} doesn't match ${openApiFile.version}`);
  }

  return openApiJson;
}
