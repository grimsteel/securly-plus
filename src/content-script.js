(() => {
  // PATCH CONFIG

  const defaultScheduleTab = "DefaultCalendarViewTabRoleMapping";
  const defaultScreen = "DefaultRouteUserRoleMapping";
  // match the callback within the function: (Te,Q,h)=>h.d(Q,{X
  //                   ( Te,   Q ,   h  )=>  h  .  d  ( Q ,{ X
  // we want to find "d" and "X" (actual names might be different)
  const callbackRe = /\(\w+,(\w+),(\w+)\)=>.*\2\.(\w+)\(\1,{(\w+)/;

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

          for (const [k, v] of Object.entries(item[1])) {
            // look for the config function
            const functionString = v.toString();
            if (functionString.includes(defaultScheduleTab) && functionString.includes(defaultScreen)) {
              // find out where the callback function is
              const callbackMatch = functionString.match(callbackRe);
              if (callbackMatch) {
                // monkey-patch the config function within the chunk
                item[1][k] = (...args) => {
                  // the config function is passed this "d-function" which it calls
                  // monkey-patch it
                  const origDFunction = args[2][callbackMatch[3]];
                  args[2][callbackMatch[3]] = (...dFunctionArgs) => {
                    // when it's called, the config function passes in another function as the second argument
                    // monkey-patch it
                    const origXFunction = dFunctionArgs[1][callbackMatch[4]];
                    let hasHooked = false;
                    dFunctionArgs[1][callbackMatch[4]] = () => {
                      // this function actually returns the config
                      
                      const result = origXFunction();
                      // patch the default calendar tab and screen (only if it hasn't been patched already)
                      if (defaultScheduleTab in result && !hasHooked) {
                        console.debug("[SECURLY PLUS] hooked config function");
                        hasHooked = true;

                        // patch schedule tab
                        result[defaultScheduleTab] = new Proxy(result[defaultScheduleTab], {
                          get(target, prop, receiver) {
                            if (prop === "student") {
                              console.log("[SECURLY PLUS] returned patched config");
                              return window.__securlyPlus?.screenId ?? 1;
                            }
                            return Reflect.get(...arguments);
                          }
                        });
                        
                        // patch screen
                        result[defaultScreen] = new Proxy(result[defaultScreen], {
                          get(target, prop, receiver) {
                            if (prop === "student") {
                              console.log("[SECURLY PLUS] returned patched config");
                              return window.__securlyPlus?.defaultScreen ?? "schedule";
                            }
                            return Reflect.get(...arguments);
                          }
                        });
                      }
                      return result;
                    };
                    return origDFunction(...dFunctionArgs);
                  };

                  v(...args);
                };
                break;
              }
            }
          }

          // push the modified item
          return webpackPush(item);
        };
      } else {
        return Reflect.get(...arguments);
      }
    }
  });
})();
