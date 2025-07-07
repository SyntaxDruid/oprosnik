console.log("Sidebar control script v1.5 (Event-based) loaded!");

/**
 * This is the correct approach. Instead of fighting the page's CSS and JS,
 * we will trigger the page's own functionality.
 * The page has a link with a 'data-widget="pushmenu"' attribute that handles
 * collapsing and expanding the sidebar correctly. We will simulate a click on it.
 */
function toggleSidebar() {
  // Find the specific 'a' tag that controls the sidebar.
  const sidebarButton = document.querySelector('a[data-widget="pushmenu"]');

  if (sidebarButton) {
    // Programmatically click the button.
    sidebarButton.click();
    console.log('Successfully triggered the pushmenu widget.');
    return "Toggled sidebar via page's own script.";
  } else {
    console.error('Could not find the sidebar toggle button (a[data-widget="pushmenu"]).');
    return "Error: Button not found.";
  }
}

// Listen for the message from the popup.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    const status = toggleSidebar();
    sendResponse({ status: status });
  }
  return true; // Keep the message channel open for the response.
});