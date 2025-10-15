import { REMOTE_SERVER_URL } from "@/@common/constants";

function extractSubdomain(url) {
  const regex = /^https:\/\/([^\.]+)\.mehery\.xyz\//;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export const tenant_partition_key = extractSubdomain(REMOTE_SERVER_URL);