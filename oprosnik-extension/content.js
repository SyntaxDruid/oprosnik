console.log("Sidebar control script v1.9 (Final, precise version) loaded!");

/**
 * This is the definitive solution based on identifying the margin issue.
 * 1. We toggle the page's own 'sidebar-collapse' class on the <body>.
 * This is crucial because the page's own scripts will see this class
 * and automatically remove the 'margin-left' from the '.content-wrapper'.
 * 2. We inject a single, simple CSS rule to make the sidebar invisible
 * when it's in the collapsed state, instead of just being a narrow bar.
 */

// 1. The simple, powerful override rule.
const customCSS = `
  /* When the body is in collapse mode... */
  body.sidebar-collapse .main-sidebar {
    /* ...make the sidebar truly disappear. */
    display: none !important;
  }
`;

// 2. Inject this rule into the page.
const styleSheet = document.createElement("style");
styleSheet.innerText = customCSS;
document.head.appendChild(styleSheet);

// 3. The most reliable toggle function. It just flips the class.
function toggleSidebar() {
  // Let the page's own scripts handle the margin by toggling the class.
  document.body.classList.toggle('sidebar-collapse');

  const isHidden = document.body.classList.contains('sidebar-collapse');
  console.log(`Toggled class. Sidebar is now ${isHidden ? 'hidden' : 'visible'}.`);
  return isHidden ? 'hidden' : 'visible';
}

// 4. Listen for the message from the popup.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    const currentState = toggleSidebar();
    sendResponse({ status: `Sidebar is now ${currentState}` });
  }
  return true; // Keep the message channel open for the response.
});