import DataService from "@/@common/services/DataService";

const parseSseBlock = (raw) => {
  let event = "message";
  const dataLines = [];
  raw.split("\n").forEach((line) => {
    if (!line || line.startsWith(":")) return;
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  });
  if (!dataLines.length) return null;
  const dataText = dataLines.join("\n");
  let data = dataText;
  try {
    data = JSON.parse(dataText);
  } catch (e) {
    data = dataText;
  }
  return { event, data };
};

/** POST a JSON body and consume the response as an event stream (falls back to plain JSON). */
export const postEventStream = async (path, body, { onEvent, signal } = {}) => {
  let seen = 0;
  let buffer = "";

  const flush = (block) => {
    const evt = parseSseBlock(block);
    if (evt) onEvent?.(evt);
  };

  const consume = (text = "") => {
    buffer += text.slice(seen).replace(/\r\n/g, "\n");
    seen = text.length;
    let splitAt = buffer.indexOf("\n\n");
    while (splitAt !== -1) {
      flush(buffer.slice(0, splitAt));
      buffer = buffer.slice(splitAt + 2);
      splitAt = buffer.indexOf("\n\n");
    }
  };

  const response = await DataService.axios.post(path, body, {
    skipApiContext: true,
    toast: false,
    signal,
    headers: { Accept: "text/event-stream" },
    onDownloadProgress: (e) => consume(e.event?.target?.responseText),
  });

  const contentType = String(response.headers?.["content-type"] || "");
  if (contentType.includes("application/json")) {
    const json = response.data;
    onEvent?.({ event: "done", data: json?.data || json });
    return json;
  }

  if (typeof response.data === "string") consume(response.data);
  if (buffer.trim()) flush(buffer);
  return null;
};
