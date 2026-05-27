const baseUrl = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export function assetUrl(path: string) {
  return `${baseUrl}${path.replace(/^\/+/, "")}`;
}
