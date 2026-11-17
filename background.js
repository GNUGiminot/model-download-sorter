importScripts('rules.js');

// Finds the page the download came from: the tab with the referrer URL,
// otherwise the active tab of the last focused window.
async function sourceTab(item) {
  try {
    if (item.referrer && /^https?:/.test(item.referrer)) {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => t.url === item.referrer);
      if (tab) return tab;
    }
    const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return active || null;
  } catch (e) {
    return null;
  }
}

async function decide(item) {
  const stored = await chrome.storage.sync.get(null);
  const settings = MDS.mergeSettings(stored);
  const info = {
    filename: item.filename,
    url: item.url,
    finalUrl: item.finalUrl,
    referrer: item.referrer,
  };
  if (!settings.enabled || !settings.types[MDS.extensionOf(item.filename)]) return null;
  const tab = await sourceTab(item);
  if (tab) {
    info.tabUrl = tab.url;
    info.tabTitle = tab.title;
  }
  return MDS.chooseFolder(info, settings);
}

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  decide(item)
    .then((path) => {
      if (path) suggest({ filename: path, conflictAction: 'uniquify' });
      else suggest();
    })
    .catch((e) => {
      console.error('Model Download Sorter:', e);
      suggest();
    });
  return true; // suggest is called asynchronously
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(null);
  if (!stored.sites) await chrome.storage.sync.set(MDS.mergeSettings(stored));
});
