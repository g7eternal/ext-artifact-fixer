document.addEventListener("DOMContentLoaded", async function () {
  const channelsInput = document.getElementById("channels");
  const tagsInput = document.getElementById("streamTags");
  const cssInput = document.getElementById("videoCSS");

  // Load saved options
  const items = await chrome.storage.sync.get(["channels", "tags", "css"]);
  console.debug("Stored content: ", items);
  if (items.channels) {
    channelsInput.value = items.channels;
  }
  if (items.tags) {
    tagsInput.value = items.tags;
  }
  if (items.css) {
    cssInput.value = items.css;
  }

  // Save options
  const saveListener = async function () {
    const channels = channelsInput.value;
    const tags = tagsInput.value;

    let css = cssInput.value.replace(/[{}]/g, "");
    if (cssInput.value !== css) cssInput.value = css;

    await chrome.storage.sync.set({
      channels: channels,
      tags: tags,
      css: css,
    });
  };
  for (const evType of ["change", "input"]) {
    channelsInput.addEventListener(evType, saveListener);
    tagsInput.addEventListener(evType, saveListener);
    cssInput.addEventListener(evType, saveListener);
  }
});
