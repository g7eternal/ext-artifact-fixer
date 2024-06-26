/**
 * Poor man's JQuery, xdd
 * @param {String} query
 * @returns {Array<HTMLElement>} list of matching elements
 */
function $(query) {
  return Array.from(document.querySelectorAll(query));
}

document.addEventListener("DOMContentLoaded", async function () {
  const optionInputs = $("*[data-storage-key]");
  const cbInputs = $("input[data-flag-name]");

  // Load saved options
  const storedKeys = optionInputs.map((element) => element.getAttribute("data-storage-key"));
  const items = await chrome.storage.sync.get(storedKeys);
  console.debug("ADRM: Stored content: ", items);
  const checkboxesRaw = await chrome.storage.sync.get("__checkboxes");
  const checkboxes = checkboxesRaw ? JSON.parse(checkboxesRaw.__checkboxes || "[]") : [];
  console.debug("ADRM: Stored checkbox state: ", checkboxes);

  // Init each checkbox, and assign a "change" listener:
  cbInputs.forEach((element) => {
    const flagName = element.getAttribute("data-flag-name");
    element.checked = checkboxes.includes(flagName);
    element.addEventListener("change", async () => {
      if (element.checked) {
        checkboxes.push(flagName);
      } else {
        const idx = checkboxes.indexOf(flagName);
        if (idx >= 0) checkboxes.splice(idx, 1);
      }

      console.debug(`ADRM: Enabled checkboxes:`, checkboxes);
      await chrome.storage.sync.set({
        __checkboxes: JSON.stringify(checkboxes),
      });
    });
  });

  // Init each input with value, and assign a "change" listener:
  optionInputs.forEach((element) => {
    const key = element.getAttribute("data-storage-key");
    const initData = items[key] || "";
    element.value = initData;

    const saveListener = async function () {
      const value = element.value.replace(/[{}]/g, "");
      if (element.value !== value) element.value = css;

      console.debug(`ADRM: Option [${key}] is now set as:`, value);
      const storedObject = {};
      storedObject[key] = value;
      await chrome.storage.sync.set(storedObject);
    };

    element.addEventListener("input", saveListener);
    element.addEventListener("change", saveListener);
  });

  // Init each depended text input, tie to corresponding checkbox:
  $("input[data-locked-by]").forEach((element) => {
    const cbId = element.getAttribute("data-locked-by");
    const cb = document.getElementById(cbId);
    if (!cb) {
      console.warn(`ADRM: could not find a checkbox #${cbId}, requested by dependent element:`, element);
      return;
    }

    cb.addEventListener("change", () => {
      element.disabled = !cb.checked;
    });
  });

  // Verified list automatic counter:
  const verifiedListInput = document.getElementById("verifiedList");
  const verifiedListCount = document.getElementById("verListCount");
  const verifiedListChangeListener = () => {
    const value = (verifiedListInput.value || "").trim();
    const matches = value.match(/,/g);
    verifiedListCount.innerText = (matches ? matches.length : 0) + (value.length > 0);
  };
  verifiedListInput.addEventListener("change", verifiedListChangeListener);
  verifiedListInput.dispatchEvent(new Event("change", { bubbles: true })); // first recalculation

  // Enable update button:
  const verifiedListBtn = document.getElementById("doUpdateVerifiedList");
  verifiedListBtn.addEventListener("click", () => {
    verifiedListBtn.disabled = true;

    chrome.runtime.sendMessage({ action: "updateVerifiedChannels" });

    verifiedListBtn.classList.remove("btn-outline-primary");
    verifiedListBtn.classList.add("btn-outline-success");
    verifiedListBtn.innerText = "Updated!";
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case "verifiedChannels": {
        verifiedListInput.value = message.list;
        verifiedListInput.dispatchEvent(new Event("change", { bubbles: true }));
        break;
      }
      default: {
        console.debug("ADRM: Unknown message action: ", message.action);
        console.trace("ADRM: Skipping message: ", message);
      }
    }
  });
});
