document.getElementById('toggleSidebar').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggle_sidebar" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          alert("Error: Could not connect to the page.\n\nPlease make sure you are on the correct website.");
        } else if (response) {
          console.log(response.status);
        }
      });
    }
  });
});