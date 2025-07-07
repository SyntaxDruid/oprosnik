console.log("Sidebar control script loaded!");

// Function to toggle the sidebar's visibility
function toggleSidebar() {
  // Find the sidebar element
  const sidebar = document.querySelector('aside.main-sidebar');
  // Find the main content area
  const contentWrapper = document.querySelector('div.content-wrapper');

  if (sidebar && contentWrapper) {
    // Check if the sidebar is currently visible
    if (sidebar.style.display !== 'none') {
      // If it's visible, hide it
      sidebar.style.display = 'none';
      // Remove the left margin from the content area so it fills the space
      contentWrapper.style.marginLeft = '0';
      console.log('Sidebar hidden.');
    } else {
      // If it's hidden, show it again
      sidebar.style.display = 'block'; // 'block' is the default for <aside>
      // Remove the inline style to restore the original margin
      contentWrapper.style.marginLeft = '';
      console.log('Sidebar shown.');
    }
  }
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    toggleSidebar();
  }
});