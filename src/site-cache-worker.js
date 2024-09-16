const scheduleRe = /\/ftm\/district\/school\/[\w-]+\/flex-period\/schedule/;
addEventListener("fetch", e => {
  e.respondWith(fetch(e.request));
});
