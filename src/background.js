chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.tabs.onCreate.add