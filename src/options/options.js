const selectTheme = document.getElementById("select-theme");
const selectDefaultScheduleTab = document.getElementById("select-default-schedule-tab");
const selectDefaultScreen = document.getElementById("select-default-screen");
//const checkForceSearch = document.getElementById("check-force-search");
const checkSessionCaching = document.getElementById("check-session-caching");
const checkInstantRequests = document.getElementById("check-instant-requests");
const checkIgnoreLimits = document.getElementById("check-ignore-limits");
const toastSavedSuccesfully = document.getElementById("toast-saved-successfully");
const btnSave = document.getElementById("btn-save");

chrome.storage.local.get({
  theme: "auto",
  defaultScreen: "schedule",
  defaultScheduleTab: "todayplus",
  //forceSearch: true,
  sessionCaching: true,
  instantRequests: true,
  ignoreLimits: false
}).then(({ theme, defaultScreen, defaultScheduleTab, sessionCaching, instantRequests, ignoreLimits }) => {
  selectTheme.value = theme;
  selectDefaultScreen.value = defaultScreen;
  selectDefaultScheduleTab.value = defaultScheduleTab;
  //checkForceSearch.checked = forceSearch;
  checkSessionCaching.checked = sessionCaching;
  checkInstantRequests.checked = instantRequests;
  checkIgnoreLimits.checked = ignoreLimits;
});

btnSave.addEventListener("click", () => {
  chrome.storage.local.set({
    theme: selectTheme.value,
    defaultScreen: selectDefaultScreen.value,
    defaultScheduleTab: selectDefaultScheduleTab.value,
    //forceSearch: checkForceSearch.checked,
    sessionCaching: checkSessionCaching.checked,
    instantRequests: checkInstantRequests.checked,
    ignoreLimits: checkIgnoreLimits.checked
  });

  // show a success toast
  toastSavedSuccesfully.classList.add("show");
  setTimeout(() => toastSavedSuccesfully.classList.remove("show"), 3000);
});

if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  document.documentElement.dataset.bsTheme = "dark";
}
