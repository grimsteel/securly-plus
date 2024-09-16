chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

/**
 * this content script basically just sends data to the main content script
 * @param {{ theme: string, defaultScreen: string, defaultScheduleTab: string }} preferences
 */
function contentScript(preferences, idbUrl) {
  // RUN ONCE
  if (window.__securlyPlusLoaded) return;

  const screenIdMap = {
    today: 1,
    todayplus: 5,
    week: 7,
    month: 31
  };

  const screenId = screenIdMap[preferences.defaultScheduleTab] ?? screenIdMap.todayplus;

  // DARK MODE
  if (preferences.theme === "dark") {
    document.documentElement.classList.add("dark-mode");
  } else if (preferences.theme === "auto") {
    const prefersDark = matchMedia("(prefers-color-scheme: dark)");
    if (prefersDark.matches) document.documentElement.classList.add("dark-mode");
    prefersDark.addEventListener("change", e => {
      document.documentElement.classList.toggle("dark-mode", e.matches);
    });
  }
  
  console.debug("[SECURLY PLUS] injected preferences");

  // SEND DATA TO CONFIG PATCHER
  window.__securlyPlusLoaded = true;

  window.__securlyPlusLoad?.({
    screenId,
    ...preferences,
    idbUrl
  });
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status  === "loading" && tab.url) {
    // get the user's preferences
    const prefs = await chrome.storage.local.get({
      theme: "auto",
      defaultScheduleTab: "todayplus",
      defaultScreen: "schedule",
      forceSearch: true,
      sessionCaching: true
    });
    
    // inject the content script as soon as the tab has started loading
    await chrome.scripting.executeScript({
      target: {
        tabId
      },
      world: "MAIN",
      injectImmediately: true,
      func: contentScript,
      args: [prefs, chrome.runtime.getURL("idb.js")]
    });
  }
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.tabs.create({ url: "/onboarding/onboarding.html" });
  }
});
