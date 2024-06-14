const DEFAULTS = { channels: "mitpod", tags: "ArtifactDRM" };

/**
 * Helper function, sets an icon for our extension.
 * @param {String} newIcon icon name
 */
function setIconForBrowser(newIcon = "icon") {
  const iconPath = `/images/${newIcon}128.png`;
  chrome.action.setIcon({ path: iconPath });
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
      setIconForBrowser(request.icon);
      break;
    }
    default: {
      console.debug("Unknown action: ", request.action);
      console.trace("Skipping request: ", request);
    }
  }
});
