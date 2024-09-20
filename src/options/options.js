const selectTheme = document.getElementById("select-theme");
const selectDefaultScheduleTab = document.getElementById("select-default-schedule-tab");
const selectDefaultScreen = document.getElementById("select-default-screen");
//const checkForceSearch = document.getElementById("check-force-search");
const checkSessionCaching = document.getElementById("check-session-caching");
const checkInstantRequests = document.getElementById("check-instant-requests");
const btnSave = document.getElementById("btn-save");

chrome.storage.local.get({
  theme: "auto",
  defaultScreen: "schedule",
  defaultScheduleTab: "todayplus",
  //forceSearch: true,
  sessionCaching: true,
  instantRequests: true
}).then(({ theme, defaultScreen, defaultScheduleTab, sessionCaching, instantRequests }) => {
  selectTheme.value = theme;
  selectDefaultScreen.value = defaultScreen;
  selectDefaultScheduleTab.value = defaultScheduleTab;
  //checkForceSearch.checked = forceSearch;
  checkSessionCaching.checked = sessionCaching;
  checkInstantRequests.checked = instantRequests;
});

btnSave.addEventListener("click", () => {
  chrome.storage.local.set({
    theme: selectTheme.value,
    defaultScreen: selectDefaultScreen.value,
    defaultScheduleTab: selectDefaultScheduleTab.value,
    //forceSearch: checkForceSearch.checked,
    sessionCaching: checkSessionCaching.checked,
    instantRequests: checkInstantRequests.checked
  });
});

if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  document.documentElement.dataset.bsTheme = "dark";
}
