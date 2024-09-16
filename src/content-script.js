(() => {
  window.__securlyPlusLoad = async loadedData => {
    data = loadedData;
    // load idb
    idb = await import(data.idbUrl);
    db = await idb.openDB("__securly-plus-db", 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("schedule-item-cache", {
            keyPath: "uuid"
          });
        }
        if (oldVersion < 2) {
          const catchallStore = db.createObjectStore("catchall-cache", {
            keyPath: ["scheduleUuid", "dateNumber"],
          });
          catchallStore.createIndex("last-accessed", "lastAccessed");
          const schedulingsStore = db.createObjectStore("schedulings-cache", {
            keyPath: ["scheduleUuid", "dateNumber"]
          });
          schedulingsStore.createIndex("last-accessed", "lastAccessed");
        }
      }
    });
  };
  
  // PATCH CONFIG

  const defaultScheduleTab = "DefaultCalendarViewTabRoleMapping";
  const defaultScreen = "DefaultRouteUserRoleMapping";
  // match the callback within the function: (Te,Q,h)=>h.d(Q,{X
  //                   ( Te,   Q ,   h  )=>  h  .  d  ( Q ,{ X
  // we want to find "d" and "X" (actual names might be different)
  const callbackRe = /\(\w+,(\w+),(\w+)\)=>.*\2\.(\w+)\(\1,{([^}]+)}/;
  const objectKvRe = /(\w+):\(\)=>\w+,?/g;
  const scheduleRe = /\/ftm\/district\/school\/[\w-]+\/flex-period\/schedule/;
  const activityListRe = /\/ftm\/district\/school\/flex-period\/[\w-]+\/scheduled-activity/;

  function getFunKey(paramObject, idx) {
    const matches = [...paramObject.matchAll(objectKvRe)];
    return matches[idx][1];
  }

  let webpackPush;
  let array = [];
  // bind to the existing webpack chunk list if applicable
  if (window.webpackChunkeduspire) {
    array = window.webpackChunkeduspire;
    webpackPush = array.push;
  }
  let gotMainFile = false;
  let Observable = null;
  let HttpResponse = null;
  /** @type {import("idb") | null} */
  let idb = null;
  /** @type {import("idb").IDBPDatabase} */
  let db = null;
  /** @type {{ screenId: number, defaultScreen: number, idbUrl: string } | null} */
  let data = null;
  // they do some weird "polyfilling" of Promise
  const Promise = window.Promise;

  const chunks = [
    // config chunk (app.config.ts)
    {
      keywords: [defaultScheduleTab, defaultScreen],
      fns: {
        0(result) {
          console.debug("[SECURLY PLUS] hooked config function");
          // patch schedule tab
          Object.defineProperty(result[defaultScheduleTab], "student", {
            get() {
              console.log("[SECURLY PLUS] returned patched config");
              return data?.screenId ?? 1;
            }
          });

          // patch screen
          Object.defineProperty(result[defaultScreen], "student", {
            get() {
              console.log("[SECURLY PLUS] returned patched config");
              return data?.defaultScreen ?? 1;
            }
          });
        }
      }
    },
    // rxjs observable chunk (Observable.js)
    {
      keywords: ["_isScalar"],
      fns: {
        0(result) {
          console.log("[SECURLY PLUS] got reference to Observable");
          Observable = result;
        }
      }
    },
    // angular http chunk (http.mjs)
    {
      keywords: ["maybeSetNormalizedName"],
      fns: {
        4(result) {
          HttpResponse = result;
        },
        0(result) {
          console.log("[SECURLY PLUS] hooked XHR Backend");

          // get a reference to the XHR backend
          const xhrBackend = result.ɵinj.providers[0].ɵproviders[1];
          xhrBackend.prototype.handle = new Proxy(xhrBackend.prototype.handle, {
            apply(target, thisArg, [request]) {
              const url = new URL(request.urlWithParams, location.href);
              if (url.pathname.match(scheduleRe)) {
                return new Observable(observer => {
                  observer.next({ type: 0 });
                  request.headers.init();

                  const startTime = Date.parse(url.searchParams.get("startDate"));
                  const endTime = Date.parse(url.searchParams.get("endDate"));

                  // start fetching this in the background
                  const fetchRequest = fetch(url, {
                    headers: request.headers.headers
                  })
                    .then(r => r.json())
                    .then(async r => {
                      // update the cache
                      const tx = db?.transaction(["schedule-item-cache", "catchall-cache", "schedulings-cache"], "readwrite");

                      for (const item of r) {
                        const { catchallCollection, scheduledActivitySchedulings, ...rest } = item;
                        await tx.objectStore("schedule-item-cache").put(rest);

                        const range = IDBKeyRange.bound(
                          [item.uuid, startTime],
                          [item.uuid, endTime]
                        );
                        // delete old items
                        await tx.objectStore("catchall-cache").delete(range);
                        await tx.objectStore("schedulings-cache").delete(range);

                        // cache catchall items
                        for (const catchall of catchallCollection) {
                          const dbItem = {
                            ...catchall,
                            scheduleUuid: item.uuid,
                            dateNumber: Date.parse(catchall.date),
                            lastAccessed: Date.now()
                          };
                          await tx.objectStore("catchall-cache").put(dbItem);
                        }
                        // cache scheduled items
                        for (const scheduling of scheduledActivitySchedulings) {
                          const dbItem = {
                            ...scheduling,
                            scheduleUuid: item.uuid,
                            dateNumber: Date.parse(scheduling.scheduledDate),
                            lastAccessed: Date.now()
                          };
                          await tx.objectStore("schedulings-cache").put(dbItem);
                        }
                      }
                      return r;
                    })
                    .catch(e => { console.warn(e); throw e });
                  
                  // but also see if we have something cached
                  const cacheRequest = (async () => {
                    const tx = db.transaction(["schedule-item-cache", "catchall-cache", "schedulings-cache"], "readonly");
                    const scheduleItems = await tx.objectStore("schedule-item-cache").getAll();
                    // force a fetch
                    if (scheduleItems.length === 0) throw new Error("no cache available");
                    
                    for (const item of scheduleItems) {
                      const range = IDBKeyRange.bound(
                        [item.uuid, startTime],
                        [item.uuid, endTime]
                      );
                      const catchalls = await tx.objectStore("catchall-cache").getAll(range);
                      const schedulings = await tx.objectStore("schedulings-cache").getAll(range);
                      // if we have no catchall items, force a fetch
                      if (catchalls.length === 0) throw new Error("no cache available");
                      item.catchallCollection = catchalls;
                      item.scheduledActivitySchedulings = schedulings;
                    }

                    return scheduleItems;
                  })();
                  
                  Promise.any([fetchRequest, cacheRequest])
                    .then(items => {
                      observer.next(new HttpResponse({
                        headers: {},
                        body: items,
                        status: 200,
                        statusText: "OK",
                        url: request.urlWithParams,
                      }));
                      observer.complete();
                    })
                    .catch(e => console.warn(e));
                });
              }
              return Reflect.apply(...arguments);
            }
          });
        }
      }
    }
  ];
  
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

          if (gotMainFile) return webpackPush(item);

          for (const [k, v] of Object.entries(item[1])) {
            // look for the config function
            const functionString = v.toString();

            for (const chunk of chunks) {
              if (chunk.keywords.every(keyword => functionString.includes(keyword))) {
                // all 3 chunks are in the same js file
                gotMainFile = true;
                
                // find out where the callback function is
                const callbackMatch = functionString.match(callbackRe);
                if (callbackMatch) {
                  // monkey-patch this function
                  item[1][k] = (...args) => {
                    // each function calls a "d-function" with a number of other functions
                    // monkey-patch everything down to the other function at idx {chunk.idx}

                    const origDFunction = args[2][callbackMatch[3]];
                    // determine which function we want to monkey-patch
                    args[2][callbackMatch[3]] = (...dFunctionArgs) => {
                      // when it's called, the config function passes in another function as the second argument
                      // monkey-patch it
                      if (dFunctionArgs[0] === args[1]) {
                        for (const [idx, callback] of Object.entries(chunk.fns)) {
                          const funKey = getFunKey(callbackMatch[4], idx);
                          const origXFunction = dFunctionArgs[1][funKey];
                          let hasHooked = false;
                          dFunctionArgs[1][funKey] = () => {
                            // this function is the one we care about

                            const result = origXFunction();
                            if (!hasHooked) {
                              hasHooked = true;

                              callback(result);
                            }
                            return result;
                          };
                        }
                      }
                      return origDFunction(...dFunctionArgs);
                    };

                    v(...args);
                  };
                }
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
