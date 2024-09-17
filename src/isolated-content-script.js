async function sendPrefs() {
  const prefs = await chrome.storage.local.get({
    theme: "auto",
    defaultScheduleTab: "todayplus",
    defaultScreen: "schedule",
    //forceSearch: true,
    sessionCaching: true,
    idbUrl: chrome.runtime.getURL("idb.js")
  });
  window.postMessage({
    ...prefs,
    type: "__securly-plus-prefs"
  });
  // DARK MODE
  if (prefs.theme === "dark") {
    document.documentElement.classList.add("dark-mode");
  } else if (prefs.theme === "auto") {
    const prefersDark = matchMedia("(prefers-color-scheme: dark)");
    if (prefersDark.matches) document.documentElement.classList.add("dark-mode");
    prefersDark.addEventListener("change", e => {
      document.documentElement.classList.toggle("dark-mode", e.matches);
    });
  }
}

// send prefs on load and also when they request it
sendPrefs();
window.addEventListener("message", e => {
  if (e.data.type === "__securly-plus-get-prefs") sendPrefs();
});
