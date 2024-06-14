document.addEventListener("DOMContentLoaded", async function () {
  const channelsInput = document.getElementById("channels");
  const tagsInput = document.getElementById("streamTags");

  // Load saved options
  const items = await chrome.storage.sync.get(["channels", "tags"]);
  console.debug("Stored content: ", items);
  if (items.channels) {
    channelsInput.value = items.channels;
  }
  if (items.tags) {
    tagsInput.value = items.tags;
  }

  // Save options
  const saveListener = async function () {
    const channels = channelsInput.value;
    const tags = tagsInput.value;

    await chrome.storage.sync.set({
      channels: channels,
      tags: tags,
    });
  };
  for (const evType of ["change", "input"]) {
    channelsInput.addEventListener(evType, saveListener);
    tagsInput.addEventListener(evType, saveListener);
  }
});
