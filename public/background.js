const FOCUS_BLOCK_STORAGE_KEY = "captab-focus-block";

/** @type {{ active: boolean; endsAt: number | null; hosts: string[]; focusText: string }} */
let cachedState = {
  active: false,
  endsAt: null,
  hosts: [],
  focusText: "",
};

function normalizeHost(hostname) {
  return String(hostname).trim().toLowerCase().replace(/^www\./, "");
}

function hostMatches(url, hosts) {
  if (!url || !hosts || hosts.length === 0) return false;
  try {
    const u = new URL(url);
    if (u.protocol === "chrome:" || u.protocol === "chrome-extension:" || u.protocol === "about:") {
      return false;
    }
    const host = normalizeHost(u.hostname);
    return hosts.some((entry) => {
      const normalized = normalizeHost(entry);
      if (!normalized) return false;
      return host === normalized || host.endsWith("." + normalized);
    });
  } catch {
    return false;
  }
}

function isExpired(state) {
  return state.endsAt != null && Date.now() >= state.endsAt;
}

function inactiveState() {
  return { active: false, endsAt: null, hosts: [], focusText: "" };
}

function applyState(raw) {
  if (!raw || typeof raw !== "object") {
    cachedState = inactiveState();
    return cachedState;
  }
  cachedState = {
    active: Boolean(raw.active),
    endsAt: typeof raw.endsAt === "number" ? raw.endsAt : null,
    hosts: Array.isArray(raw.hosts) ? raw.hosts.filter((h) => typeof h === "string") : [],
    focusText: typeof raw.focusText === "string" ? raw.focusText : "",
  };
  if (isExpired(cachedState)) {
    cachedState = inactiveState();
    chrome.storage.local.set({ [FOCUS_BLOCK_STORAGE_KEY]: cachedState });
  }
  return cachedState;
}

function loadState() {
  chrome.storage.local.get(FOCUS_BLOCK_STORAGE_KEY, (result) => {
    applyState(result[FOCUS_BLOCK_STORAGE_KEY]);
  });
}

function maybeRedirect(tabId, url) {
  if (!cachedState.active || isExpired(cachedState)) return;
  if (!hostMatches(url, cachedState.hosts)) return;
  const blockedUrl =
    chrome.runtime.getURL("blocked.html") + "?to=" + encodeURIComponent(url);
  chrome.tabs.update(tabId, { url: blockedUrl });
}

chrome.runtime.onInstalled.addListener(() => {
  loadState();
});

chrome.runtime.onStartup.addListener(() => {
  loadState();
});

loadState();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[FOCUS_BLOCK_STORAGE_KEY]) return;
  applyState(changes[FOCUS_BLOCK_STORAGE_KEY].newValue);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url || (changeInfo.status === "loading" ? tab.url : undefined);
  if (!url) return;
  maybeRedirect(tabId, url);
});

setInterval(() => {
  if (cachedState.active && isExpired(cachedState)) {
    cachedState = inactiveState();
    chrome.storage.local.set({ [FOCUS_BLOCK_STORAGE_KEY]: cachedState });
  }
}, 30_000);
