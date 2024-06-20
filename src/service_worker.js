const DEFAULTS = { channels: "mitpod,ribpod", tags: "ArtifactDRM", css: "filter: invert(1);\ntransform: scale(-1);" };

/**
 * Helper function, sets an icon for our extension.
 * @param {number} tabId tab's id, usually - sender.tab.id
 * @param {String} newIcon icon name
 */
function setIconForBrowser(tabId, newIcon = "icon") {
  const iconPath = `/images/${newIcon}128.png`;
  chrome.action.setIcon({ path: iconPath, tabId: tabId });
}

//////////////////////////////////////////////////////////

chrome.runtime.onInstalled.addListener(async () => {
  // add defaults for some options
  const keys = Object.keys(DEFAULTS);
  const items = await chrome.storage.sync.get(keys);
  const opts = {};

  for (const key of keys) {
    if (!items[key]) {
      opts[key] = DEFAULTS[key];
    }
  }

  await chrome.storage.sync.set(opts);
  console.log("ADRM: Defaults applied for user options: ", opts);

  // all done!
  console.log("Extension installed");
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "toggleTransform" });
});

/* listen for messages from the content script */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "setIcon": {
      if (sender.tab) {
        setIconForBrowser(sender.tab.id, request.icon);
      } else {
        console.warn("ADRM: Unexpected caller for setIcon: ", sender);
      }
      break;
    }
    default: {
      console.debug("ADRM: Unknown action: ", request.action);
      console.trace("ADRM: Skipping request: ", request);
    }
  }
});
