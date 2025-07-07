console.log("Definitive sidebar control script v1.3 loaded!");

// We will inject a style that hooks into the page's own functionality.
// The page uses the 'sidebar-collapse' class on the <body> to shrink the sidebar
// and adjust the content margin. We will piggyback on this.
const customCSS = `
  /* When the body has the 'sidebar-collapse' class... */
  body.sidebar-collapse .main-sidebar {
    /* ...instead of just shrinking, disappear completely! */
    display: none !important;
  }
  
  /* Also, when it's collapsed, ensure the content uses the full width. */
  body.sidebar-collapse .content-wrapper {
    margin-left: 0 !important;
  }
`;

// Inject our custom styles into the page's head
const styleSheet = document.createElement("style");
styleSheet.innerText = customCSS;
document.head.appendChild(styleSheet);

// The toggle function now simply uses the page's own class.
function toggleSidebar() {
  // Toggle the class the page already uses for its layout.
  document.body.classList.toggle('sidebar-collapse');
  
  // Return the current state for the log.
  return document.body.classList.contains('sidebar-collapse') ? 'hidden' : 'visible';
}

// Listen for the message from the popup.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    const currentState = toggleSidebar();
    console.log(`Sidebar is now ${currentState}.`);
    // Confirm to the popup that the action was received.
    sendResponse({ status: `Sidebar is now ${currentState}` });
  }
  return true; // Keep the message channel open for the asynchronous response.
});