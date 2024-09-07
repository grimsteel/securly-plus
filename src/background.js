chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

function contentScript() {
  if (window.__securlyPlus) return;
  window.__securlyPlus = true;
  
  let webpackPush;
  let array = [];
  if (window.webpackChunkeduspire) {
    array = window.webpackChunkeduspire;
    webpackPush = array.push;
  }
  window.webpackChunkeduspire = new Proxy(array, {
    set(_target, prop, value) {
      if (prop === "push") {
        webpackPush = value;
        return true;
      } else {
        return Reflect.set(...arguments);
      }
    },
    get(_target, prop, _receiver) {
      if (prop === "push" && webpackPush) {
        return (item) => {
          // this is the push function

          // 66626 is currently in 179
          if (item[0][0] === 179) {
            // monkey-patch the 66626 function
            const orig = item[1][66626];
            item[1][66626] = (...args) => {

              // it's called "d"
              const origDFunction = args[2].d;
              args[2].d = (...dFunctionArgs) => {
                // and within that it's called "X"
                const origXFunction = dFunctionArgs[1].X;
                dFunctionArgs[1].X = () => {
                  // this function actually returns the config
                  
                  const result = origXFunction();
                  // set to today+4 view
                  if ("DefaultCalendarViewTabRoleMapping" in result) {
                    result.DefaultCalendarViewTabRoleMapping.student = 5;
                  }
                  return result;
                };
                return origDFunction(...dFunctionArgs);
              };

              orig(...args);
            };
            // push the modified item
            return webpackPush(item);
          }

          // just default action
          return webpackPush(item);
        };
      } else {
        return Reflect.get(...arguments);
      }
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status  === "loading" && tab.url) {
    // inject the content script as soon as the tab has started loading
    chrome.scripting.executeScript({
      target: {
        tabId
      },
      world: "MAIN",
      injectImmediately: true,
      func: contentScript
    });
  }
});
