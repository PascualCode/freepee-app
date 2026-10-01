import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const disposableDomains = new Set<string>(require("disposable-email-domains"));

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain != null && disposableDomains.has(domain);
}
