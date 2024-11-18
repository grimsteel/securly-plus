(() => {
  // fancy log function
  function log(type, message) {
    console.log(
      "%cSECURLY PLUS%c%s%c • %s",
      "background: #0d9488; color: #fef3c7; border-top-left-radius: 4px; border-bottom-left-radius: 4px; padding: 4px; font-weight: bold;",
      "background: #bef264; color: #052e16; padding: 4px; border-top-right-radius: 4px; border-bottom-right-radius: 4px;",
      type,
      "",
      message
    );
  }

  log("general", "Securly Plus v__VERSION__ loaded");
  
  window.postMessage({ type: "__securly-plus-get-prefs" });
  window.addEventListener("message", async e => {
    if (e.data.type !== "__securly-plus-prefs" || data !== null) return;
    
    data = e.data;
    // load idb (but sanitize the URL first)
    log("session caching", "loaded indexed DB");
    const idbUrl = data.idbUrl.match(/^(moz|chrome)-extension:\/\/([\w-]+)\/idb.js$/);
    if (!idbUrl) throw new Error("invalid IDB url");
    const idb = await import(`${idbUrl[1]}-extension://${idbUrl[2]}/idb.js`);
    db.resolve(await idb.openDB("__securly-plus-db", 2, {
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
    }));
  });
  
  // PATCH CONFIG

  const defaultScheduleTab = "DefaultCalendarViewTabRoleMapping";
  const defaultScreen = "DefaultRouteUserRoleMapping";
  const scheduleTabMap = {
    today: 1,
    todayplus: 5,
    week: 7,
    month: 31
  };
  // match the callback within the function: (Te,Q,h)=>h.d(Q,{X
  //                   ( Te,   Q ,   h  )=>  h  .  d  ( Q ,{ X
  // we want to find "d" and "X" (actual names might be different)
  const callbackRe = /\(\w+,(\w+),(\w+)\)=>.*\2\.(\w+)\(\1,{([^}]+)}/;
  const objectKvRe = /([\$\w]+):\(\)=>[\$\w]+,?/g;
  const scheduleRe = /^\/ftm\/district\/school\/[\w-]+\/flex-period\/schedule$/;
  const activityListRe = /^\/ftm\/district\/school\/flex-period\/([\w-]+)\/scheduled-activity$/;
  const registrationRe = /^\/ftm\/district\/school\/flex-period\/activity\/scheduled-activity\/scheduled-activity-scheduling\/([\w-]+)\/student\/registration$/;
  const directoryScheduleRe = /^\/ftm\/district\/school\/flex-period\/activity\/([\w-]+)\/scheduled-activity$/;

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
  let Observable = null;
  let eventManager = null;
  let HttpResponse = null;
  // they do some weird "polyfilling" of Promise
  const Promise = window.Promise;
  /** @type {PromiseWithResolvers<import("idb").IDBPDatabase>} */
  const db = Promise.withResolvers();
  /** @type {{ defaultScheduleTab: string, defaultScreen: string, idbUrl: string, sessionCaching: boolean, instantRequests: boolean, ignoreLimits: boolean, bulkFlexing: boolean, startDirectoryToday: boolean } | null} */
  let data = null;
  let mostRecentActivityItems = null;
  let mostRecentActivityScheduleId = null;
  let currentDirectoryPageActivityId = null;
  let tokenService = null;
  let currentDirectoryPageSelected = new Map();

  const chunks = [
    // config chunk (app.config.ts)
    {
      keywords: [defaultScheduleTab, defaultScreen],
      fns: {
        0(result) {
          log("config patcher", "hooked config function");
          // patch schedule tab
          Object.defineProperty(result[defaultScheduleTab], "student", {
            get() {
              log("config patcher", "returned patched schedule tab");
              const tabId = data?.defaultScheduleTab ? scheduleTabMap[data.defaultScheduleTab] : 1;
              return tabId;
            }
          });

          // patch screen
          Object.defineProperty(result[defaultScreen], "student", {
            get() {
              log("config patcher", "returned patched default screen");
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
          Observable = result;
        }
      }
    },
    // auth factory service
    {
      keywords: ["Impesonate"], // W spelling
      fns: {
        0(result) {
          result.prototype.isImpersonate = new Proxy(result.prototype.isImpersonate, {
            apply(_target, thisArg, _params) {
              tokenService = thisArg.authUserService;
              return Reflect.apply(...arguments);
            }
          });
        }
      }
    },
    // angular create component
    {
      keywords: ["g.co/ng/security"],
      fns: {
        74(result) {          
          return new Proxy(result, {
            apply(_target, _thisArg, [item]) {
              const selector = item?.selectors?.[0]?.[0];
              if (selector === "app-join-activity-modal" && data?.ignoreLimits) {
                const scheduleListComponent = item.dependencies[3];
                scheduleListComponent.prototype.getDenominator = new Proxy(scheduleListComponent.prototype.getDenominator, {
                  apply(_target, _thisArg, [e]) {
                    if (e.registeredStudentsCount === "Full") {
                      return `${e.maxAttendees} (Will attempt to flex)`;
                    } else return Reflect.apply(...arguments);
                  }
                });
              } else if (selector === "app-dates-and-registrations-modal" && data?.bulkFlexing) {
                item.template = new Proxy(item.template, {
                  apply(_target, _thisArg, [flag, params]) {
                    const newId = params?.directoryScheduledActivity?.activity?.uuid;
                    if (newId !== currentDirectoryPageActivityId || flag === 1) {
                      currentDirectoryPageSelected = new Map();
                      log("bulk flexing", "found new directory schedule modal");
                    }
                    currentDirectoryPageActivityId = newId;
                    return Reflect.apply(...arguments);
                  }
                });
              } else if (selector === "app-root" && data?.bulkFlexing) {
                // get the event manager
                item.dependencies[2].prototype.ngOnInit = new Proxy(item.dependencies[2].prototype.ngOnInit, {
                  apply(_target, thisArg, _params) {
                    log("bulk flexing", "got event manager");
                    eventManager = thisArg.eventManager;
                    return Reflect.apply(...arguments);
                  }
                });
              }
              return Reflect.apply(...arguments);
            }
          });
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
          log("general", "hooked XHR Backend");

          // get a reference to the XHR backend
          const xhrBackend = result.ɵinj.providers[0].ɵproviders[1];
          xhrBackend.prototype.handle = new Proxy(xhrBackend.prototype.handle, {
            apply(_target, _thisArg, [request]) {
              const url = new URL(request.urlWithParams, location.href);

              const registrationMatch = url.pathname.match(registrationRe);
              const activityListMatch = url.pathname.match(activityListRe);
              const directoryScheduleMatch = url.pathname.match(directoryScheduleRe);
              if (registrationMatch && data?.instantRequests && request.method === "POST") {
                // reflect registration in the cache immediately
                const reqObservable = Reflect.apply(...arguments);

                // wrap the original observable
                return new Observable(observer => {
                  reqObservable.subscribe(async r => {
                    // 4 = successful resposne
                    if (r.type === 4) {
                      const item = mostRecentActivityItems?.find(a => a.uuid === registrationMatch[1]);
                      if (item && mostRecentActivityScheduleId) {
                        log("instant requests", `auto cached request for ${item.activityDate}`);
                        const tx = (await db.promise).transaction(["schedulings-cache", "catchall-cache"], "readwrite");
                        const date = Date.parse(item.scheduledDate);
                        // delete any old items
                        const range = IDBKeyRange.only(
                          [mostRecentActivityScheduleId, date]
                        );
                        await tx.objectStore("schedulings-cache").delete(range);
                        await tx.objectStore("catchall-cache").delete(range);

                        // cache this item
                        const dbItem = {
                          ...item,
                          isRegistered: true,
                          scheduleUuid: mostRecentActivityScheduleId,
                          dateNumber: date,
                          lastAccessed: Date.now()
                        };
                        await tx.objectStore("schedulings-cache").put(dbItem);
                      }
                    }
                    observer.next(r);
                  });
                });
              } else if (activityListMatch) {
                // keep track of fetched activity items

                const reqObservable = Reflect.apply(...arguments);

                // wrap the original observable
                return new Observable(observer => {
                  reqObservable.subscribe(r => {
                    // 4 = successful resposne
                    if (r.type === 4) {
                      log("instant requests", "got new activity list");
                      mostRecentActivityItems = r.body;
                      mostRecentActivityScheduleId = activityListMatch[1];
                      if (data?.ignoreLimits) {
                        // set canRegister to true
                        r.body.forEach(session => {
                          if (!session.canRegister) {
                            session.canRegister = true;
                            session.registeredStudentsCount = "Full";
                            session.registeredStudentsCountOfRoomCap = "Full";
                          }
                        });
                      }
                    }
                    observer.next(r);
                  });
                });
              } else if (url.pathname.match(scheduleRe) && data?.sessionCaching) {
                // cache schedules

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
                      try {
                        const tx = (await db.promise).transaction(["schedule-item-cache", "catchall-cache", "schedulings-cache"], "readwrite");

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

                          log("session caching", `cached schedule items from ${url.searchParams.get("startDate")} to ${url.searchParams.get("endDate")}`);
                        }
                      } catch (e) {
                        // error while saving - we still want to return data
                        console.warn(e);
                      }
                      return r;
                    })
                    .catch(e => { console.warn(e); throw e });

                  // but also see if we have something cached
                  const cacheRequest = (async () => {
                    const tx = (await db.promise).transaction(["schedule-item-cache", "catchall-cache", "schedulings-cache"], "readonly");
                    const scheduleItems = await tx.objectStore("schedule-item-cache").getAll();
                    // force a fetch
                    if (scheduleItems.length === 0) {
                      console.log("no cache available");
                      throw new Error("no cache available");
                    }

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

                    log("session caching", `returned cached schedule items from ${url.searchParams.get("startDate")} to ${url.searchParams.get("endDate")}`);

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
              } else if (directoryScheduleMatch) {
                if (data?.startDirectoryToday) {
                  // set startDate to today
                  request.params.map.set("startDate", [new Date().toISOString().split("T")[0]]);
                  const params = new URLSearchParams(request.params.map).toString();
                  // update the full url as well
                  request.urlWithParams = request.url + "?" + params;
                }

                if (data?.bulkFlexing) {
                  // create bulk flexing controls

                  const reqObservable = Reflect.apply(...arguments);

                  // create select all checkboxes
                  const modalBody = document.querySelector("app-dates-and-registrations-modal div.modal-body");
                  if (modalBody) {
                    if (!modalBody.querySelector("#__securly-plus-bulk-flex-footer")) {
                      const footer = modalBody.appendChild(document.createElement("div"));
                      footer.id = "__securly-plus-bulk-flex-footer";
                      const row1 = footer.appendChild(document.createElement("div"));
                      row1.classList.add("d-flex", "align-items-center", "justify-content-between");
                      // select all checkbox
                      const check = row1.appendChild(document.createElement("div"));
                      check.classList.add("custom-control", "custom-checkbox");
                      const input = check.appendChild(document.createElement("input"));
                      input.type = "checkbox";
                      input.id = `__securly-plus-bulk-flex-select-all`;
                      input.classList.add("custom-control-input");
                      const label = check.appendChild(document.createElement("label"));
                      label.classList.add("custom-control-label");
                      label.htmlFor = `__securly-plus-bulk-flex-select-all`;
                      label.innerText = "Select all";
                      input.addEventListener("change", () => {
                        const allChecks = document.querySelectorAll(".__securly-plus-bulk-flex-check");
                        if (allChecks.length === currentDirectoryPageSelected.size) {
                          // clear
                          currentDirectoryPageSelected.clear();
                          allChecks.forEach(el => el.checked = false);
                        } else {
                          // select all
                          allChecks.forEach(el => {
                            el.checked = true;
                            currentDirectoryPageSelected.set(el.dataset.id, el.dataset.date);
                          });
                        }
                      });

                      const button = row1.appendChild(document.createElement("button"));
                      button.type = "button";
                      button.classList.add("btn", "btn-outline-primary", "btn-padded", "btn-radius");
                      button.innerText = "Apply";

                      // exclude already flexed sessions check
                      const checkExclude = footer.appendChild(document.createElement("div"));
                      checkExclude.classList.add("custom-control", "custom-checkbox", "my-3");
                      const inputExclude = checkExclude.appendChild(document.createElement("input"));
                      inputExclude.type = "checkbox";
                      inputExclude.id = `__securly-plus-bulk-flex-exclude`;
                      inputExclude.classList.add("custom-control-input");
                      const labelExclude = checkExclude.appendChild(document.createElement("label"));
                      labelExclude.classList.add("custom-control-label");
                      labelExclude.htmlFor = `__securly-plus-bulk-flex-exclude`;
                      labelExclude.innerText = "Exclude days with existing flex requests";

                      const statusText = footer.appendChild(document.createElement("p"));
                      statusText.text = "0 items selected";
                      modalBody.addEventListener("change", () => {
                        statusText.innerText = `${currentDirectoryPageSelected.size} items selected`;
                      });

                      button.addEventListener("click", async () => {
                        eventManager.broadcast({ name: "preloaderShow", content: true });

                        const items = currentDirectoryPageSelected.entries();
                        const total = currentDirectoryPageSelected.size;
                        const headers = {
                          "X-Requested-SchoolYear": JSON.parse(sessionStorage.getItem("schoolYearSettings")).schoolYear,
                          "X-Requested-School": JSON.parse(sessionStorage.getItem("schoolUserAuthority")).uuid,
                          "Authorization": `Bearer ${tokenService.getToken()}`
                        };

                        let existingSessions = new Set();

                        // retrieve days with existing flex sessions
                        if (inputExclude.checked) {
                          const days = [...currentDirectoryPageSelected.values()];
                          existingSessions = await fetch(`https://flexprod-api-k8s.flex.securly.com/ftm/district/school/${headers["X-Requested-School"]}/flex-period/schedule?startDate=${days[0]}&endDate=${days[days.length - 1]}`, {
                            method: "GET",
                            headers
                          })
                            .then(r => r.json())
                            .then(r => {
                              return new Set(r.flatMap(f => f.scheduledActivitySchedulings.map(s => s.scheduledDate)));
                            });
                        }

                        console.log(existingSessions);

                        // flex into each session, one at a time
                        let success = 0;
                        let skipped = 0;
                        let count = 0;
                        
                        statusText.innerText = `Progress: 0 / ${total}`;
                        for (let [sessionId, date] of items) {
                          if (existingSessions.has(date)) {
                            skipped++;
                            statusText.innerText = `Progress: ${++count} / ${total}`;
                            continue;
                          }
                          try {
                            const response = await fetch(`https://flexprod-api-k8s.flex.securly.com/ftm/district/school/flex-period/activity/scheduled-activity/scheduled-activity-scheduling/${sessionId}/student/registration`, {
                              method: "POST",
                              body: "{}",
                              headers
                            });
                            if (response.ok) {
                              success++;
                            } else {
                              const text = await response.text();
                              log("bulk flexing", `flexing failed for ${sessionId}: ${text}`);
                            }
                          } catch (e) {
                            log("bulk flexing", `flexing failed for ${sessionId}: ${e}`);
                          }
                          statusText.innerText = `Progress: ${++count} / ${total}`;
                        }
                        statusText.innerText = `Successfully flexed into ${success} / ${total} sessions. ${skipped ? `(${skipped} skipped)` : ""}`;
                        // TODO: show error details
                        eventManager.broadcast({ name: "preloaderShow", content: false });
                      });

                      log("bulk flexing", "created bulk flex controls");
                    }
                  }

                  // wrap the original observable
                  return new Observable(observer => {
                    reqObservable.subscribe(r => {
                      observer.next(r);

                      // 4 = successful resposne
                      // make sure it's for the current activity
                      if (r.type === 4 && directoryScheduleMatch[1] === currentDirectoryPageActivityId) {
                        // figure out which item we're on
                        const startIdx = (parseInt(url.searchParams.get("page")) - 1) * parseInt(url.searchParams.get("pageSize"));
                        log("bulk flexing", "got more schedule itesm");
                        // hacky way to wait for DOM to update
                        setTimeout(() => {
                          const items = document.querySelectorAll("app-dates-and-registrations-modal ul.general-list > .general-list-item");
                          const now = Date.now();
                          // add checkboxes to each item
                          r.body.forEach((el, i) => {
                            const scheduleItem = items[i + startIdx];

                            const check = document.createElement("div");
                            check.classList.add("custom-control", "custom-checkbox");
                            check.style.marginTop = "-2px";
                            const input = check.appendChild(document.createElement("input"));
                            input.type = "checkbox";
                            input.id = `__securly-plus-bulk-flex-${el.uuid}`;
                            input.classList.add("custom-control-input", "__securly-plus-bulk-flex-check");
                            input.dataset.id = el.uuid;
                            input.dataset.date = el.scheduledDate;
                            const label = check.appendChild(document.createElement("label"));
                            label.classList.add("custom-control-label");
                            label.htmlFor = `__securly-plus-bulk-flex-${el.uuid}`;

                            // hide input if it's in the past
                            if (Date.parse(el.scheduledDate + "T00:00:00") < now) {
                              check.style.visibility = "hidden";
                            } else {
                              input.addEventListener("change", () => {
                                // toggle
                                if (!currentDirectoryPageSelected.has(el.uuid)) {
                                  currentDirectoryPageSelected.set(el.uuid, el.scheduledDate);
                                } else {
                                  currentDirectoryPageSelected.delete(el.uuid);
                                }
                              });
                            }

                            scheduleItem.prepend(check);
                          });
                        }, 100);
                      }
                    });
                  });
                }
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

          for (const [k, v] of Object.entries(item[1])) {
            // look for the config function
            const functionString = v.toString();

            for (const chunk of chunks) {
              if (chunk.keywords.every(keyword => functionString.includes(keyword))) {
                
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
                          let overriddenResult = null;
                          dFunctionArgs[1][funKey] = () => {
                            // this function is the one we care about

                            const result = origXFunction();
                            if (!hasHooked) {
                              hasHooked = true;

                              const overrideResult = callback(result);
                              if (overrideResult) overriddenResult = overrideResult;
                            }
                            return overriddenResult ?? result;
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
