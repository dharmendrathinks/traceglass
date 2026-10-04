import { parseImport } from "./core/ingest";
import { MAX_FILE_BYTES } from "./core/model";
self.onmessage = async (event: MessageEvent<{ file: File }>) => {
  try {
    const { file } = event.data;
    if (file.size > MAX_FILE_BYTES)
      throw new Error(
        "File exceeds the 20 MB import limit. Export a shorter journey.",
      );
    const capture = parseImport(await file.text(), file.name);
    self.postMessage({ capture });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Import failed.",
    });
  }
};
