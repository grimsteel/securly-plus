import { TraceMap, eachMapping, originalPositionFor } from '@jridgewell/trace-mapping';

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

// fetch flex.securly.com file as text
const fetchFile = path => fetch(`https://flex.securly.com/${path}`).then(r => r.text());

async function fetchSourceNames() {
  const docRes = await fetchFile("");
  const matches = docRes.matchAll(/src="(\w+)\.(\w+)\.js"/g);
  return Object.fromEntries(matches.map(([_, name, hash]) => [name, `${name}.${hash}.js`]));
}

/** Scan backwards from col in source to find the chunk id and export name */
function scanChunkExport(name, source, col) {
  let chunkId = null;
  let ptr = col;
  while (ptr > 0) {
    ptr = source.lastIndexOf(':', ptr - 1);
    if (ptr === -1) break;
    
    const header = source.substring(Math.max(0, ptr - 15), ptr + 2);
    // search for ,12312 at the end of the string
    const idMatch = header.match(/[,{](\d+):\($/);
    if (idMatch) {
      chunkId = parseInt(idMatch[1]);
      break;
    }
  }
  
  if (chunkId) {
    // between chunk start and def
    const searchArea = source.substring(ptr, col);
    // Matches key:()=>w
    const getterPattern = new RegExp(`([\\w$]+):\\(\\)=>${name}`);
    const exportName = searchArea.match(getterPattern)?.[1];
    
    return { chunkId, exportName };
  }
  return null;
}

async function refreshSourceMap(filename) {
  log("sourcemap decode", `fetching latest source file: ${filename}`);
  // fetch source and source map
  const source = await fetchFile(filename);
  const lines = source.split("\n");
  const sourceMap = JSON.parse(await fetchFile(`${filename}.map`));
  // parse source map
  log("sourcemap decode", `parsing source map`);
  const tracer = new TraceMap(sourceMap);

  // stuff we inject
  const relevantNames = {
    // rxjs observable
    Observable: {
      source: "/Observable.js"
    },
    AppConfig: {
      source: "/app.config.ts"
    },
    // XhrBackend injector
    HttpClientModule: {
      source: "/http.mjs"
    },
    // angular create component
    ɵɵdefineComponent: {
      source: "/core.mjs"
    },
    AuthFactoryService: {
      source: "/auth-factory.service.ts"
    },
    HttpResponse: {
      source: "/http.mjs"
    }
  };

  let foundNames = {};
  
  // iterate over all names
  eachMapping(tracer, m => {
    const name = relevantNames[m.name];
    if (name && !(m.name in foundNames) && m.source.endsWith(name.source)) {
      const line = lines[m.generatedLine - 1];
      const slice = line.slice(m.generatedColumn, m.generatedColumn + 10);
      // read the source at this point to find the obfuscated name
      const obfusName = slice.match(/^([\w$]+)/)?.[1];
      // look backwards to find the chunk id + the exported name of this item
      const exportInfo = scanChunkExport(obfusName, line, m.generatedColumn);
      foundNames[m.name] = exportInfo;
    }
  });

  // merge with old parsed map
  const oldMap = await chrome.storage.local.get("sourcemap");
  if (oldMap?.sourcemap) {
    foundNames = {
      ...oldMap.sourcemap.foundNames,
      ...foundNames
    };
  }

  // print how many we were able to find
  const numFound = Object.keys(foundNames).length;
  const numTotal = Object.keys(relevantNames).length;
  log("sourcemap decode", `parsed source map. found ${numFound}/${numTotal}`);

  // store in cache
  await chrome.storage.local.set({
    sourcemap: {
      foundNames,
      // store the name of the js file
      name: filename
    }
  });
  
  return {
    found: numFound,
    total: numTotal,
    filename
  };
}

async function tryRefreshSourceMap(force) {
  const sourceNames = await fetchSourceNames();
  const cachedMap = await chrome.storage.local.get("sourcemap");
  // check if the file name changed (need to refetch)
  if (!force && cachedMap?.sourcemap?.name === sourceNames.main) {
    log("sourcemap decode", "no refresh needed");
    return null;
  }
  return await refreshSourceMap(sourceNames.main);
}

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.tabs.create({ url: "/onboarding/onboarding.html" });
  }

  // trigger refresh on each install
  tryRefreshSourceMap();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "refresh-source-map"){
    // force a refresh
    tryRefreshSourceMap(true)
      .then(r => sendResponse({ ...r, success: true }))
      .catch(e => sendResponse({ error: e, success: false }));
    return true; // async
  }
});
