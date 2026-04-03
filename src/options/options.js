function showToast(toastElem, duration = 3000) {
  toastElem.classList.add("show");
  setTimeout(() => toastElem.classList.remove("show"), duration);
}

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

// Refresh Source Mappings button and toast
const btnRefreshSourcemap = document.getElementById("btn-refresh-sourcemap");
const toastRefreshedSourcemap = document.getElementById("toast-refreshed-sourcemap");
const sourcemapFoundCount = document.getElementById("sourcemap-found-count");
const sourcemapTotalCount = document.getElementById("sourcemap-total-count");
const sourcemapRefreshedText = document.getElementById("sourcemap-refreshed-text");

btnRefreshSourcemap.addEventListener("click", async () => {
  btnRefreshSourcemap.disabled = true;
  btnRefreshSourcemap.textContent = "Refreshing...";
  sourcemapFoundCount.textContent = "0";
  sourcemapTotalCount.textContent = "0";
  toastRefreshedSourcemap.classList.remove("text-bg-success", "text-bg-error");
  try {
    const response = await chrome.runtime.sendMessage({ type: "refresh-source-map" });
    if (response && response.success) {
      // show how many items were found
      sourcemapFoundCount.textContent = response.found;
      sourcemapTotalCount.textContent = response.total;
      sourcemapRefreshedText.textContent = "Source map refreshed successfully!";
      toastRefreshedSourcemap.classList.add("text-bg-success");
    } else {
      sourcemapRefreshedText.textContent = `Error refreshing source map: ${response.error}`;
      toastRefreshedSourcemap.classList.add("text-bg-error");
    }
    showToast(toastRefreshedSourcemap, 4000);
  } catch (e) {
    sourcemapRefreshedText.textContent = `Error refreshing source map: ${e}`;
    toastRefreshedSourcemap.classList.add("text-bg-error");
    showToast(toastRefreshedSourcemap, 4000);
  } finally {
    // reenable button
    btnRefreshSourcemap.disabled = false;
    btnRefreshSourcemap.textContent = "Refresh Source Mappings";
  }
});

chrome.storage.local.get({
  theme: "auto",
  defaultScreen: "schedule",
  defaultScheduleTab: "todayplus",
  sessionCaching: true,
  instantRequests: true,
  ignoreLimits: true,
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
  showToast(toastSavedSuccesfully, 3000);
});

if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  document.documentElement.dataset.bsTheme = "dark";
}
