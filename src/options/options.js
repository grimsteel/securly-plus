const selectTheme = document.getElementById("select-theme");
const selectDefaultScheduleTab = document.getElementById("select-default-schedule-tab");
const selectDefaultScreen = document.getElementById("select-default-screen");
//const checkForceSearch = document.getElementById("check-force-search");
const checkSessionCaching = document.getElementById("check-session-caching");
const checkInstantRequests = document.getElementById("check-instant-requests");
const checkIgnoreLimits = document.getElementById("check-ignore-limits");
const checkBulkFlexing = document.getElementById("check-bulk-flexing");
const checkStartDirectoryToday = document.getElementById("check-start-directory-today");
const toastSavedSuccesfully = document.getElementById("toast-saved-successfully");
const btnSave = document.getElementById("btn-save");

chrome.storage.local.get({
  theme: "auto",
  defaultScreen: "schedule",
  defaultScheduleTab: "todayplus",
  //forceSearch: true,
  sessionCaching: true,
  instantRequests: true,
  ignoreLimits: false,
  bulkFlexing: true,
  startDirectoryToday: false
}).then(({ theme, defaultScreen, defaultScheduleTab, sessionCaching, instantRequests, ignoreLimits, bulkFlexing, startDirectoryToday }) => {
  selectTheme.value = theme;
  selectDefaultScreen.value = defaultScreen;
  selectDefaultScheduleTab.value = defaultScheduleTab;
  //checkForceSearch.checked = forceSearch;
  checkSessionCaching.checked = sessionCaching;
  checkInstantRequests.checked = instantRequests;
  checkIgnoreLimits.checked = ignoreLimits;
  checkBulkFlexing.checked = bulkFlexing;
  checkStartDirectoryToday.checked = startDirectoryToday;
});

btnSave.addEventListener("click", () => {
  chrome.storage.local.set({
    theme: selectTheme.value,
    defaultScreen: selectDefaultScreen.value,
    defaultScheduleTab: selectDefaultScheduleTab.value,
    //forceSearch: checkForceSearch.checked,
    sessionCaching: checkSessionCaching.checked,
    instantRequests: checkInstantRequests.checked,
    ignoreLimits: checkIgnoreLimits.checked,
    bulkFlexing: checkBulkFlexing.checked,
    startDirectoryToday: checkStartDirectoryToday.checked
  });

  // show a success toast
  toastSavedSuccesfully.classList.add("show");
  setTimeout(() => toastSavedSuccesfully.classList.remove("show"), 3000);
});

if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  document.documentElement.dataset.bsTheme = "dark";
}
