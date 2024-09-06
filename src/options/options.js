const checkDarkMode = document.getElementById("check-dark-mode");
const selectDefaultScreen = document.getElementById("select-default-screen");

chrome.storage.local.get({
    theme: "dark",
    defaultScreen: "todayplus"
}).then(({ theme, defaultScreen }) => {
    checkDarkMode.checked = theme === "dark";
    selectDefaultScreen.value = defaultScreen;
});