document.getElementById('deleteButton').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  const deleteButton = document.getElementById('deleteButton');
  
  try {
    // Disable button and show loading animation
    // deleteButton.disabled = true;
    statusDiv.innerHTML = '<div class="spinner"></div>';
    statusDiv.className = 'status loading';
    statusDiv.style.display = 'block';
    
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on a Notion page
    if (!tab.url.includes('notion.so')) {
      throw new Error('Please navigate to a Notion page first');
    }

    // Execute the content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: emptyTrash
    });

    // Show success message
    statusDiv.textContent = 'Successfully emptied trash!';
    statusDiv.className = 'status success';
    statusDiv.style.display = 'block';
  } catch (error) {
    // Show error message
    statusDiv.textContent = error.message;
    statusDiv.className = 'status error';
    statusDiv.style.display = 'block';
  } finally {
    // Re-enable button
    deleteButton.disabled = false;
  }
});

// This function will be injected into the page
async function emptyTrash() {
  async function getSpaceId() {
    const resp = await fetch("https://www.notion.so/api/v3/loadUserContent", {
      credentials: "include",
      headers: {
        accept: "*/*",
        "cache-control": "no-cache",
        "content-type": "application/json",
        pragma: "no-cache",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
      },
      referrerPolicy: "same-origin",
      body: "{}",
      method: "POST",
      mode: "cors",
    });
    const json = await resp.json();
    const spaceId = Object.keys(json.recordMap.space)[0];
    return spaceId;
  }

  async function getBlockIds(spaceId) {
    const resp = await fetch("https://www.notion.so/api/v3/search", {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
      },
      body: `{\"type\":\"BlocksInSpace\",\"spaceId\":\"${spaceId}\",\"limit\":1000,\"filters\":{\"isDeletedOnly\":true,\"excludeTemplates\":false,\"navigableBlockContentOnly\":false,\"requireEditPermissions\":false,\"includePublicPagesWithoutExplicitAccess\":false,\"ancestors\":[],\"createdBy\":[],\"editedBy\":[],\"lastEditedTime\":{},\"createdTime\":{},\"inTeams\":[]},\"sort\":{\"field\":\"relevance\"},\"source\":\"quick_find_input_change\",\"searchExperimentOverrides\":{}}`,
      method: "POST",
      mode: "cors",
      credentials: "include",
    });
    const json = await resp.json();
    const blockIds = json.results.map((el) => el.id);
    return blockIds;
  }

  try {
    const spaceId = await getSpaceId();
    const blockIds = await getBlockIds(spaceId);
    
    for (const blockId of blockIds) {
      await fetch("https://www.notion.so/api/v3/deleteBlocks", {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json",
        },
        referrer: "https://www.notion.so/",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: `{\"blocks\":[{\"id\":\"${blockId}\",\"spaceId\":\"${spaceId}\"}],\"permanentlyDelete\":true}`,
        method: "POST",
        mode: "cors",
        credentials: "include"
      });
    }
  } catch (error) {
    throw new Error('Failed to empty trash: ' + error.message);
  }
} 