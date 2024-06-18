const CLASSNAME = "artifact-drm";
const CSS_ID = "ARDM__CustomStylesheet";

/**
 * Retrieves required data keys from storage. Each argument passed for this function is a key.
 * @returns {Promise<Object>} parsed data from extension storage
 */
async function getListOfElements() {
  const keys = Array.from(arguments);
  const data = await chrome.storage.sync.get(["channels", "tags"]);

  const result = {};
  for (const key of keys) {
    if (!data[key]) {
      result[key] = [];
      continue;
    }
    result[key] = data[key]
      .toLocaleLowerCase()
      .split(",")
      .map((s) => s.trim());
  }
  return result;
}

/**
 * Injects custom user-defined transformation style for video content.
 * @param {String} userCSS
 */
function applyCustomCSS(userCSS = "") {
  if (!userCSS) {
    console.warn("ADRM: Empty transformation style, skipping work.");
    return;
  }

  const renderedStyle = document.getElementById(CSS_ID);
  if (renderedStyle) return;

  const style = document.createElement("style");
  style.id = CSS_ID;

  // replacing {}, because we want to disallow users to modify any other elements
  style.textContent = `body.artifact-drm video {${String(userCSS).replace(/[{}]/g, "")}}`;

  document.head.appendChild(style);
  console.log("ADRM: User styles appended.");
}

/**
 * Helper function: enables or disables DRM transformation (CSS styles).
 * @param {boolean} forceActive new state; if not specified, toggles current state
 */
function toggleTransform(forceActive) {
  const isForActivation = forceActive !== undefined ? forceActive : !document.body.classList.contains(CLASSNAME);
  console.log("ADRM: Transformation change. New state: ", isForActivation);
  document.body.classList.toggle(CLASSNAME, isForActivation);
  chrome.runtime.sendMessage({ action: "setIcon", icon: isForActivation ? "invert" : "icon" });
}

/**
 * Checks if current stream page has any of listed tags.
 * Tags may be passed as an array, or as comma-separated list of arguments.
 *
 * @async
 * @returns {Promise<Array<String>>} an array of matched tags, or an empty array if none matched
 */
function checkTags() {
  if (arguments.length === 0) {
    return [];
  }

  const src = Array.isArray(arguments[0]) ? arguments[0] : Array.from(arguments);

  const matchList = src.map((a) => String(a).toLocaleLowerCase());

  return new Promise((resolve) => {
    let checkTagsEmptyOrNotLoaded = null;

    const checkTagsReady = setInterval(() => {
      const tagElements = document.querySelectorAll("a.tw-tag");
      if (tagElements.length > 0) {
        console.log("ADRM: Tags have been rendered.");
        clearInterval(checkTagsReady);
        clearTimeout(checkTagsEmptyOrNotLoaded);

        const tags = Array.from(tagElements).map((e) => (e.innerText || "").toLocaleLowerCase());

        resolve(matchList.filter((m) => tags.includes(m)));
      }
    }, 100);

    checkTagsEmptyOrNotLoaded = setTimeout(() => {
      console.log("ADRM: Tags have not been rendered; maybe this stream has none... Skipping.");
      clearInterval(checkTagsReady);
      resolve([]);
    }, 10e3);
  });
}

/**
 * A function which detects the initial state of DRM transformation (enabled or not).
 */
async function init() {
  let isDrmStream = false;

  try {
    // css injection should happen once during page load:
    const cssData = await chrome.storage.sync.get("css");
    applyCustomCSS(cssData.css);

    // and then we decide if css is applied or not (by toggling classname on <body>)
    const opts = await getListOfElements("channels", "tags");

    // condition: stream name is in the list
    if (!isDrmStream) {
      const streamName = window.location.pathname.split("/").pop().toLowerCase();
      if (opts.channels.includes(streamName)) {
        console.log("ADRM: Stream name is marked as experimental.");
        isDrmStream = true;
      }
    }

    // condition: stream has certain tags
    if (!isDrmStream) {
      const tags = await checkTags(opts.tags);
      console.log("ADRM: Stream matching tags found:", tags);

      if (tags.length > 0) {
        isDrmStream = true;
      } else {
        console.log("ADRM: Stream has no matching tags.");
      }
    }
  } finally {
    toggleTransform(isDrmStream);
  }
}

/* assign a URL listener for AJAX-based navigation; re-init state every time user navigates */
(function (callback) {
  let oldHref = document.location.href;

  const bodyList = document.querySelector("body");
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(() => {
      if (oldHref !== document.location.href) {
        oldHref = document.location.href;
        callback();
      }
    });
  });

  observer.observe(bodyList, { childList: true, subtree: true });

  window.addEventListener("popstate", () => {
    callback();
  });
})(() => {
  console.log("ADRM: URL changed. New path: " + window.location.pathname);
  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init);
  }
});

/* listen for messages from the background script */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "toggleTransform": {
      toggleTransform(request.isActive);
      break;
    }
    default: {
      console.debug("Unknown action: ", request.action);
      console.trace("Skipping request: ", request);
    }
  }
});

/* run init once when this content script loads */
console.log("ADRM: Content loaded. Trying to detect initial state...");
init();
