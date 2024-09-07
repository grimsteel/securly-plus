const selectTheme = document.getElementById("select-theme");
const selectDefaultScreen = document.getElementById("select-default-screen");
const btnSave = document.getElementById("btn-save");

chrome.storage.local.get({
  theme: "auto",
  defaultScreen: "todayplus"
}).then(({ theme, defaultScreen }) => {
  selectTheme.value = theme;
  selectDefaultScreen.value = defaultScreen;
});

btnSave.addEventListener("click", () => {
  chrome.storage.local.set({
    theme: selectTheme.value,
    defaultScreen: selectDefaultScreen.value
  });
});
