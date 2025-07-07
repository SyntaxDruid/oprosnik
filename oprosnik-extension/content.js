console.log("Advanced sidebar control script loaded!");

/**
 * This is a more robust approach. We will inject our own CSS stylesheet
 * into the page to override the default styles. Then, we just toggle a class
 * on the body to turn our styles on and off.
 */

// 1. Define our custom CSS rules as a string.
// The "!important" flag ensures our styles will always be applied.
const customCSS = `
  /* When the body has our class... */
  body.hide-sidebar-extension {
    /* ...the main content wrapper should have no left margin. */
    .content-wrapper {
      margin-left: 0 !important;
    }
    
    /* ...and the sidebar itself should be completely hidden. */
    .main-sidebar {
      display: none !important;
    }
  }
`;

// 2. Create a <style> HTML element.
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = customCSS;

// 3. Append the <style> element to the <head> of the document.
// This effectively "injects" our stylesheet into the page.
document.head.appendChild(styleSheet);

// 4. The function to toggle the sidebar is now very simple.
// It just adds or removes our custom class from the body tag.
function toggleSidebar() {
  document.body.classList.toggle('hide-sidebar-extension');
  if (document.body.classList.contains('hide-sidebar-extension')) {
      console.log('Sidebar hidden using custom stylesheet.');
  } else {
      console.log('Sidebar shown.');
  }
}

// 5. Listen for the message from the popup to run our function.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    toggleSidebar();
  }
});