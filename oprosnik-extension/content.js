console.log("Sidebar control script v1.6 (Correct approach) loaded!");

/**
 * This function finds the page's own sidebar toggle button
 * and simulates a click on it. This is the most reliable method
 * as it uses the page's built-in JavaScript to correctly
 * handle all layout changes.
 */
function toggleSidebar() {
  // Find the button by its unique attribute: 'data-widget="pushmenu"'
  const sidebarButton = document.querySelector('a[data-widget="pushmenu"]');

  if (sidebarButton) {
    // Simulate a user click
    sidebarButton.click();
    console.log("Successfully triggered the page's own sidebar script.");
    return "Toggle command sent successfully.";
  } else {
    // This message will appear if the button isn't found
    console.error("Error: Could not find the sidebar toggle button.");
    return "Error: Sidebar button not found on the page.";
  }
}

// Listen for the message from the popup to run our function
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    const status = toggleSidebar();
    // Send a response back to the popup
    sendResponse({ status: status });
  }
  // Return true to indicate you wish to send a response asynchronously
  return true;
});