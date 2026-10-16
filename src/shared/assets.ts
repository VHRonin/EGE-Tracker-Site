// Vite supplies the deployment path for both root hosting and GitHub project Pages.
export function publicAsset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
