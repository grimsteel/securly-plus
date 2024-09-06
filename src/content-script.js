let webpackPush;
window.webpackChunkeduspire = new Proxy([], {
  set(target, prop, value) {
    if (prop === "push") {
      webpackPush = value;
      return true;
    } else {
      return Reflect.set(...arguments);
    }
  },
  get(target, prop, receiver) {
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
          return webpackPush([
            [179],
            item[1],
            item[2]
          ]);
        }

        // just default action
        return webpackPush(item);
      };
    } else {
      return Reflect.get(...arguments);
    }
  }
});
