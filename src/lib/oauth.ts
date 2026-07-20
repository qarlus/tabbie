/** OAuth helpers — CapTab stays local-first with personal tokens. */

export const GITHUB_TOKEN_URL =
  "https://github.com/settings/tokens/new?scopes=repo,read:user,notifications&description=CapTab";

export const LINEAR_API_KEYS_URL = "https://linear.app/settings/api";

export const OAUTH_NOTE =
  "Personal tokens keep CapTab local-first; OAuth apps would need a backend.";
