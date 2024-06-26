const DEFAULTS = {
  __checkboxes: `["verifiedList", "channels", "streamTags"]`,
  channels: "",
  tags: "ArtifactDRM",
  css: "filter: invert(1);\ntransform: scale(-1);",
};

const VERIFIED_LIST =
  "https://gist.githubusercontent.com/g7eternal/b186c348fb7973276640bdfdbf48eb4c/raw/790818d91501f3ac2ed1bc225a02684409ce458a/gistfile1.txt";

/**
 * Helper function, sets an icon for our extension.
 * @param {number} tabId tab's id, usually - sender.tab.id
 * @param {String} newIcon icon name
 */
function setIconForBrowser(tabId, newIcon = "icon") {
  const iconPath = `/images/${newIcon}128.png`;
  chrome.action.setIcon({ path: iconPath, tabId: tabId });
}

/**
 * Fetch and parse list of verified channel names, where extension must run automatically.
 * This list is curated by extension owner.
 * @returns {Promise<Array<String>>} List of channel names
 */
async function updateVerifiedStreamersList() {
  try {
    const response = await fetch(VERIFIED_LIST);
    const text = await response.text();

    const list = text
      .trim()
      .split(/\r?\n/)
      .map((r) => r.trim());
    console.log("ADRM: Verified list updated. Channel count: " + list.length);
    chrome.storage.sync.set({ verifiedList: list.join(",") });

    return list;
  } catch (error) {
    console.error("ADRM: Verified streams list was not retrieved, error:", error);
    return [];
  }
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

  // first fetch of verified list
  await updateVerifiedStreamersList();

  // all done!
  console.log("ADRM: Extension installed!");
});

chrome.runtime.onStartup.addListener(async () => {
  // fetch of verified list on each browser restart
  await updateVerifiedStreamersList();

  // all done!
  console.log("ADRM: Extension initialized!");
});

/* main action: toggle state */
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
    case "updateVerifiedChannels": {
      updateVerifiedStreamersList().then((list) => {
        chrome.runtime.sendMessage({ action: "verifiedChannels", list: list });
      });
      break;
    }
    default: {
      console.debug("ADRM: Unknown action: ", request.action);
      console.trace("ADRM: Skipping request: ", request);
    }
  }
});

/* Schedule periodic list update */
chrome.alarms.create("updateVerifiedChannelsTimer", { periodInMinutes: 180 });

chrome.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case "updateVerifiedChannelsTimer": {
      console.debug("ADRM: Firing a periodic update for verified channel list.");
      updateVerifiedStreamersList();
      break;
    }
    default: {
      console.debug("ADRM: Unknown alarm trigger: ", alarm);
    }
  }
});
