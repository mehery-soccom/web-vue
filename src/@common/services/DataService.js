import axios from "axios";
import store from "./../store";
import { DataProcessor } from "./processor";
import { i18n } from "./i18n";
import Urly from "./../utils/Urly";
import storage from "local-storage-fallback";
import jskeeper from "./jskeeper";

let varAdd = false;
let myRespInterceptor;

function path2key(path) {
  return path
    .replace(/\/$/, "")
    .replace(/^\//, "")
    .replace(/^api\//, "")
    .split(/[\/\_]/)
    .map(function (string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    })
    .join("");
}

function processor(params, responseData, config) {
  var dataType = config?.dataType || params?._processor;
  // console.log("DataProcessor",dataType,params,responseData,config)
  if (dataType && DataProcessor[dataType]) {
    if (responseData.data) {
      responseData.data = DataProcessor[dataType](responseData.data);
    }
    if (responseData.results) {
      for (var i in responseData.results) {
        responseData.results[i] = DataProcessor[dataType](
          responseData.results[i]
        );
      }
    }
  }
  var metaType = config?.metaType;
  if (metaType && DataProcessor[metaType]) {
    if (responseData.meta) {
      responseData.meta = DataProcessor[metaType](responseData.meta);
    }
    if (responseData.details) {
      for (let i in responseData.details) {
        responseData.details[i] = DataProcessor[metaType](
          responseData.details[i]
        );
      }
    }
  }
  return responseData;
}

function slashUrl(url, query, config) {
  return Urly.clean_url(url)
    .split("}")
    .map(function (part) {
      let parts = part.split("{");
      if (parts[1]) {
        let pathVal = query[parts[1]];
        delete query[parts[1]];
        return parts[0] + "" + pathVal;
      }
      return part;
    })
    .join("");
}

const DataService = {
  axios: axios,
  async dispatch(a, b, c) {
    return store.dispatch(a, b, c);
  },

  _GET_X: {},
  async setX(url, responseData, query, config) {
    url = slashUrl(url);
    var pathKey = path2key(url);
    let _config = config || {};
    let results = responseData.results ? responseData.results : responseData;
    if (url.indexOf("/api/") == 0 || url.indexOf("api/") == 0) {
      console.log("submitX", pathKey, results, responseData);
      await store.dispatch("UPDATE_API_STORE", {
        pathKey: pathKey,
        data: results,
      });
      varAdd = true;
      await this.getX(url);
    } else {
      await store.dispatch("UPDATE_REST_STORE", {
        pathKey: pathKey,
        data: results,
      });
    }
    return results;
  },
  async get(url, query, config) {
    let _config = config || {};
    url = _config.skipCleanUrl ? url : slashUrl(url, query, config);
    _config.params = query;
    _config.baseURL = url.indexOf("./") == 0 ? "/" : undefined;
    let response = null;
    if (_config.first) {
      response = await jskeeper.first(function () {
        return axios.get(url, _config);
      }, "getfirst:" + _config.first);
    } else {
      response = await axios.get(url, _config);
    }
    return processor(query, response.data, _config);
  },
  async getX(url, query, config) {
    url = slashUrl(url);
    var pathKey = path2key(url);
    let _config = config || {};

    if (this._GET_X[pathKey]) {
      await this._GET_X[pathKey];
    }

    // if(store.getters.StateApi[pathKey] && !_config.refresh){
    if (
      store.getters.StateApi[pathKey] &&
      !_config.refresh &&
      varAdd == false
    ) {
      // console.log("stop getX1",pathKey,query,config);
      return store.getters.StateApi[pathKey];
    }
    varAdd = false;
    let proms = axios.get(url, { params: query });
    this._GET_X[pathKey] = proms;
    let response = await proms;
    delete this._GET_X[pathKey];
    let responseData = processor(query, response.data, _config);
    let results = responseData.results ? responseData.results : responseData;
    if (url.indexOf("/api/") == 0 || url.indexOf("api/") == 0) {
      console.log("getX", pathKey, results, response.data);
      store.dispatch("UPDATE_API_STORE", { pathKey: pathKey, data: results });
    } else {
      store.dispatch("UPDATE_REST_STORE", { pathKey: pathKey, data: results });
    }
    return results;
  },
  async post(url, params, config) {
    url = slashUrl(url);
    let _config = config || {};
    let response = await axios.post(url, params, _config);
    return processor(params, response.data, _config);
  },
  async put(url, params, config) {
    url = slashUrl(url);
    let _config = config || {};
    let response = await axios.put(url, params, _config);
    return processor(params, response.data, _config);
  },
  async patch(url, params, config) {
    url = slashUrl(url);
    let _config = config || {};
    let response = await axios.patch(url, params, _config);
    return processor(params, response.data, _config);
  },
  async submit(url, params, config) {
    url = slashUrl(url);
    let _config = config || {};
    let SubmitForm = new URLSearchParams();
    for (var key in params) {
      if (params[key] !== null && params[key] !== undefined) {
        SubmitForm.append(key, params[key]);
      }
    }
    try {
      if (_config.blob === true) {
        _config.responseType = "blob";
      }
      let response = await axios.post(url, SubmitForm, _config);
      return processor(params, response.data, _config);
    } catch (e) {
      if (
        _config &&
        _config.ref &&
        typeof _config.ref.setErrors == "function"
      ) {
        _config.ref.setErrors(e.response.data.veeErrors);
      }
      return Promise.reject(e);
    }
  },
  async submitX(url, params, config) {
    url = slashUrl(url);
    var pathKey = path2key(url);
    let _config = config || {};
    let responseData = await this.submit(url, params, _config);
    let results = responseData.results ? responseData.results : responseData;
    if (url.indexOf("/api/") == 0 || url.indexOf("api/") == 0) {
      console.log("submitX", pathKey, results, responseData);
      store.dispatch("UPDATE_API_STORE", { pathKey: pathKey, data: results });
    }
    return results;
  },
  async delete(url, query, config) {
    url = slashUrl(url);
    let _config = config || {};
    _config.params = query;
    //_config.data = query;
    let response = await axios.delete(url, _config);
    return processor(query, response.data, _config);
  },
  async deleteX(url, query, config) {
    url = slashUrl(url);
    var pathKey = path2key(url);
    let _config = config || {};

    let responseData = await this.delete(url, query, _config);
    let results = responseData.results ? responseData.results : responseData;
    if (url.indexOf("/api/") == 0 || url.indexOf("api/") == 0) {
      console.log("deleteX", pathKey, results, responseData);
      store.dispatch("UPDATE_API_STORE", { pathKey: pathKey, data: results });
    }
    return results;
  },
  config(argument) {
    switch (argument) {
      case "DISABLE_RESPONSE_INTERCEPTOR":
        axios.interceptors.response.eject(myRespInterceptor);
        break;
    }
  },
  async store(namespace, key, item) {
    store.dispatch("UpdateLocalStore", {
      namespace: namespace,
      key: key,
      data: item,
    });
  },
  async local() {
    store.dispatch("UpdateLocalStore", {
      namespace: arguments.length > 2 ? arguments[0] : "default",
      key: arguments.length > 2 ? arguments[1] : arguments[0],
      data: arguments.length > 2 ? arguments[2] : arguments[1],
    });
  },
  localStorage: {
    get(key) {
      return JSON.parse(storage.getItem("service.storage." + key) || "{}")
        .value;
    },
    set(key, value) {
      storage.setItem(
        "service.storage." + key,
        JSON.stringify({
          value: value,
        })
      );
    },
  },
  url(url) {
    return {
      url: url,
      response: null,
      headers: {},
      ngrok() {
        this.headers["ngrok-skip-browser-warning"] = "skip";
        return this;
      },
      get() {
        this.response = fetch(this.url, {
          headers: this.headers,
        });
        return this;
      },
      async json() {
        let resp = await this.response;
        return await resp.json();
      },
    };
  },

  // init() will set up Axios interceptors (called from plugin)
  init(VueApp) {
    console.log("[v3] [DataService] init");

    myRespInterceptor = axios.interceptors.response.use(
      function (response) {
        const config = response.config;

        if (response.request.responseURL.endsWith("/auth/login")) {
          const nextURL = new URL(response.request.responseURL);
          nextURL.searchParams.append(
            "referer",
            encodeURIComponent(window.location.href)
          );
          window.location.reload();
        }

        if (config.toast !== false && response.data?.message) {
          VueApp.config.globalProperties.$toast?.success?.(
            response.data.message
          );
        }

        return response;
      },
      function (error) {
        const response = error.response;
        const config = error.config;

        if (config.toast !== false && response?.data?.message) {
          VueApp.config.globalProperties.$toast?.error?.(response.data.message);
        }

        if (response?.data?.errors) {
          response.data.veeErrors = response.data.errors.reduce((acc, err) => {
            const path = [err.obzect, err.field].filter(Boolean).join(".");
            const fieldKey = `fields.${path}`;
            let translatedField = i18n.t(fieldKey);
            translatedField =
              translatedField === fieldKey
                ? i18n.t(`fields.${err.field}`)
                : translatedField;

            const keys = [
              `errors.${err.codeKey}`,
              `errors.${err.code}`,
              `errors.${err.description}`,
              err.codeKey,
              err.code,
              err.description,
            ];

            let message;
            for (const key of keys) {
              message = i18n.t(key, { ...err, _field_: translatedField });
              if (message !== key) break;
            }

            acc[path] = message;
            return acc;
          }, {});
        }

        return Promise.reject(error);
      }
    );

    axios.interceptors.request.use((config) => {
      config.headers["timezone"] =
        Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (config.skipApiContext === true) {
        config.baseURL = window.location.origin;
      }

      return config;
    });
  },
};

export default DataService;
