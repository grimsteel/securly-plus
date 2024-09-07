chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

/**
 * @param {{ theme: string, defaultScreen: string }} preferences
 */
function contentScript(preferences) {
  // RUN ONCE
  if (window.__securlyPlus) return;
  window.__securlyPlus = true;

  const screenIdMap = {
    today: 1,
    todayplus: 5,
    week: 7,
    month: 31
  };

  const screenId = screenIdMap[preferences.defaultScreen] ?? screenIdMap.todayplus;

  // DARK MODE
  if (preferences.theme === "dark") {
    document.documentElement.classList.add("dark-mode");
  } else if (preferences.theme === "auto") {
    const prefersDark = matchMedia("(prefers-color-scheme: dark)");
    if (prefersDark.matches) document.documentElement.classList.add("dark-mode");
    prefersDark.addEventListener("change", e => {
      document.documentElement.classList.toggle("dark-mode", e.matches);
    });
  }

  // PATCH CONFIG
  
  // this needs to be changed every time securly flex gets an update
  const configFunctionLocation = {
    chunkId: 179,
    functionId: 66626,
    returnHook: "d",
  };

  
  let webpackPush;
  let array = [];
  // bind to the existing webpack chunk list if applicable
  if (window.webpackChunkeduspire) {
    array = window.webpackChunkeduspire;
    webpackPush = array.push;
  }
  window.webpackChunkeduspire = new Proxy(array, {
    set(_target, prop, value) {
      // webpack will try to set the "push" function to its own push hook. intercept this
      if (prop === "push") {
        webpackPush = value;
        // don't actually set the push function, but return true for success
        return true;
      } else {
        return Reflect.set(...arguments);
      }
    },
    get(_target, prop, _receiver) {
      if (prop === "push" && webpackPush) {
        return item => {
          // this is our custom push function

          // find the chunk which contains the function
          if (item[0][0] === configFunctionLocation.chunkId) {

            // monkey-patch the config function within the chunk
            const orig = item[1][configFunctionLocation.functionId];
            item[1][configFunctionLocation.functionId] = (...args) => {
              // the config function is passed this "d-function" which it calls
              // monkey-patch it
              const origDFunction = args[2][configFunctionLocation.returnHook];
              args[2][configFunctionLocation.returnHook] = (...dFunctionArgs) => {
                // when it's called, the config function passes in another function as the second argument
                // monkey-patch it
                const functionKey = Object.keys(dFunctionArgs[1])[0];
                const origXFunction = dFunctionArgs[1][functionKey];
                dFunctionArgs[1][functionKey] = () => {
                  // this function actually returns the config
                  
                  const result = origXFunction();
                  // set to today+4 view
                  if ("DefaultCalendarViewTabRoleMapping" in result) {
                    result.DefaultCalendarViewTabRoleMapping.student = screenId;
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

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status  === "loading" && tab.url) {
    // get the user's preferences
    const prefs = await chrome.storage.local.get({
      theme: "auto", defaultScreen: "todayplus"
    });
    
    // inject the content script as soon as the tab has started loading
    await chrome.scripting.executeScript({
      target: {
        tabId
      },
      world: "MAIN",
      injectImmediately: true,
      func: contentScript,
      args: [prefs]
    });
  }
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.tabs.create({ url: "/onboarding/onboarding.html" });
  }
});
