const selectTheme = document.getElementById("select-theme");
const selectDefaultScheduleTab = document.getElementById("select-default-schedule-tab");
const selectDefaultScreen = document.getElementById("select-default-screen");
const btnSave = document.getElementById("btn-save");

chrome.storage.local.get({
  theme: "auto",
  defaultScreen: "schedule",
  defaultScheduleTab: "todayplus"
}).then(({ theme, defaultScreen, defaultScheduleTab }) => {
  selectTheme.value = theme;
  selectDefaultScreen.value = defaultScreen;
  selectDefaultScheduleTab.value = defaultScheduleTab;
});

btnSave.addEventListener("click", () => {
  chrome.storage.local.set({
    theme: selectTheme.value,
    defaultScreen: selectDefaultScreen.value,
    defaultScheduleTab: selectDefaultScheduleTab.value
  });
});
