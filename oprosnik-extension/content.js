console.log("Sidebar control script v1.4 with user CSS loaded!");

// Using the user-provided CSS for a more comprehensive fix.
const customCSS = `
  /* When the body has the 'sidebar-collapse' class... */
  .sidebar-collapse .main-sidebar {
    /* ...hide the sidebar completely. */
    display: none !important;
  }

  /* ...and adjust all main content containers. */
  .sidebar-collapse .content-wrapper,
  .sidebar-collapse .main-content,
  .sidebar-collapse .main-container {
    margin-left: 0 !important;
  }
  
  /* ...also adjust the top navigation bar. */
  .sidebar-collapse .main-header {
      margin-left: 0 !important;
  }
`;

// Inject our custom styles into the page's head.
const styleSheet = document.createElement("style");
styleSheet.innerText = customCSS;
document.head.appendChild(styleSheet);

// The toggle function simply uses the page's own class.
function toggleSidebar() {
  document.body.classList.toggle('sidebar-collapse');
  return document.body.classList.contains('sidebar-collapse') ? 'hidden' : 'visible';
}

// Listen for the message from the popup.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    const currentState = toggleSidebar();
    console.log(`Sidebar is now ${currentState}.`);
    sendResponse({ status: `Sidebar is now ${currentState}` });
  }
  return true; // Keep the message channel open for the response.
});