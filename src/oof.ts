import { _fetch } from "./_fetch";

// Header can either be an object or a function that return an object or a function that returns a Promise that resolves to an object
type Header = Object | Function;

// Add supported HTTP methods
type HTTPMethod =
  | "HEAD"
  | "OPTIONS"
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE";

/**
 * oof: Object Oriented Fetch abstraction over `_fetch`
 *
 * This object oriented approach gives users a familiar chainable interface to build their API calls
 */
export class oof {
  // Must be initialized with empty string
  // So if user does not set any baseUrl, _baseUrl + this.path will not result in undefined + this.path
  static _baseUrl = "";

  /* Private Instance variables that are only accessible internally */
  #method: HTTPMethod;
  #headers: Array<Header>;
  #path: string;
  #opts: RequestInit;

  // data can be any type as JSON.stringify accepts any type that is serializable
  #data?: any;

  /** Low level constructor API that generally isnt used. Stick with the provided static methods for a cleaner API. */
  constructor({
    method,
    path,
    opts = {},
    headers = [],
  }: {
    method: HTTPMethod;
    path: string;
    opts?: RequestInit;
    headers?: Header | Array<Header>;
  }) {
    this.#method = method;
    this.#path = path;
    this.#opts = opts;

    // Ensure that this.#headers is always an array regardless of what the user passes in
    // Users can pass in a single header object/function or an array of header objects/functions
    // If an array is passed in, leave it as it is, else wrap the single header object/function in a array
    this.#headers = Array.isArray(headers) ? headers : [headers];
  }

  /**
   * Wrapper function over constructor to make the constructor API more ergonomic.
   *
   * This exposed static method allows users to use HTTP methods that are not provided by default.
   * This method is meant for HTTP methods like GET that do not allow entity bodies.
   * Although the provided GET and DEL methods can use this method internally,
   * they do not use this so as to optimize away the additional function call.
   * @param {String} method The CAPITALISED verb string of the HTTP method
   * @returns {oof} Returns a new instance of `oof` after constructing it to let you chain method calls
   */
  static _METHODS_WO_DATA = (method: HTTPMethod, path: string): oof =>
    new oof({ method, path });

  /**
   * Wrapper function over constructor to make the constructor API more ergonomic.
   *
   * This static method allows users to use HTTP methods like POST that have JSON entity bodies
   * @param {String} method The CAPITALISED verb string of the HTTP method
   * @returns {oof} Returns a new instance of `oof` after constructing it to let you chain method calls
   */
  static _METHODS_WITH_DATA = (method: HTTPMethod, path: string): oof =>
    new oof({
      method,
      path,
      headers: { "Content-Type": "application/json" },
    });

  /**
   * Wrapper function over constructor to construct a new `oof` instance for a `GET` API call
   *
   * @param {String} path Path of your API
   * @returns {oof} Returns a new instance of `oof` after constructing it to let you chain method calls
   */
  static GET = (path: string): oof => new oof({ method: "GET", path });

  /**
   * Wrapper function over constructor to construct a new `oof` instance for a `POST` API call
   *
   * @param {String} path Path of your API
   * @returns {oof} Returns a new instance of `oof` after constructing it to let you chain method calls
   */
  static POST = (path: string): oof => oof._METHODS_WITH_DATA("POST", path);

  /**
   * Wrapper function over constructor to construct a new `oof` instance for a `PUT` API call
   *
   * @param {String} path Path of your API
   * @returns {oof} Returns a new instance of `oof` after constructing it to let you chain method calls
   */
  static PUT = (path: string): oof => oof._METHODS_WITH_DATA("PUT", path);

  /**
   * Wrapper function over constructor to construct a new `oof` instance for a `DEL` API call
   *
   * @param {String} path Path of your API
   * @returns {oof} Returns a new instance of `oof` after constructing it to let you chain method calls
   */
  static DEL = (path: string): oof => new oof({ method: "DELETE", path });

  /**
   * Set options for the fetch method call. Usually used to set custom RequestInit parameters.
   * This is generally not used unless you have specific options to pass in e.g. cache: "no-cache".
   *
   * Note that passing in a header object here will override all headers passed in via the 'header' method.
   * Because these options are merged with the header object using a shallow merge.
   *
   * This method directly assigns the arguement to `this.#opts` which means calling this method overrides
   * whatever options that is already set previously. Because it does not make sense for the user to call
   * this repeatedly since there is no default options set by this library anyways. Thus it is a direct
   * assignment instead of a merge like `this.#opts = { ...this.#opts, ...opts }`
   *
   * @param {RequestInit} opts Options object used as the RequestInit object
   * @returns {oof} Returns the current instance of `oof` to let you chain method calls
   */
  options(opts: RequestInit): oof {
    this.#opts = opts;
    return this;
  }

  /**
   * Add Headers to include in the API call.
   *
   * Accepts plain header objects, functions and async functions.
   *
   * Functions passed in will be called right before the API call to generate a header object,
   * to delay generating certain header values like a time limited auth token or recaptcha.
   *
   * This method can be called multiple times, and all the header objects will be combined.
   * @param {Header} header
   * @returns {oof} Returns the current instance of `oof` to let you chain method calls
   */
  header(header: Header): oof {
    this.#headers.push(header);
    return this;
  }

  /**
   * Set data/object to be sent to server in API calls for methods such as POST/PUT
   * @returns {oof} Returns the current instance of `oof` to let you chain method calls
   */
  data(data: any): oof {
    this.#data = data;
    return this;
  }

  /** Call method after constructing the API call object to make the API call */
  // @todo Wrap this in a try/catch and return {res, err} to force user to check instead of letting caller handle any throws
  async run(): Promise<Response> {
    return _fetch(
      // Check if `this.#path` contains any http protocol identifier using a case-insensitive regex match
      // If found, assume user passed in full URL to skip using base URL, thus use `this.#path` directly as full URL
      // Else prepend base URL to `this.#path` to get the full URL
      // @todo Alternatively, check for / as first character, if so, assume it is a relative URL...?
      // Then if it does not start with / means full URL
      this.#path.match(/https:\/\/|http:\/\//i)
        ? this.#path
        : oof._baseUrl + this.#path,
      {
        method: this.#method,

        // Run header functions if any to ensure array of headers is now an array of header objects,
        // The array of headers have the type of `object | Promise<object>` because header generator
        // functions can be an async, to let users delay generating headers until `run` time.
        //
        // `await Promise.all` on the array of headers to ensure all are resolved to `object` type,
        // before reducing the array of header objects into a single header object.
        headers: (
          await Promise.all(
            this.#headers.map((header) =>
              typeof header === "function" ? header() : header
            )
          )
        ).reduce((obj, item) => ({ ...obj, ...item }), {}),

        // Add and/or Override defaults if any
        // If there is a headers property in this options object, it will override the headers entirely
        // Also options merging is a shallow merge not a deepmerge
        ...this.#opts,
      },
      this.#data
    );
  }

  /**
   * Wrapper around `run` method to auto parse return data as JSON before returning
   * Returns the parsed JSON response.
   * Return type will always union with { ok: boolean; status: number; } as these will always be injected in
   *
   * When API server responds with a status code of anything outside of 200-299 Response.ok is auto set to false
   * https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#checking_that_the_fetch_was_successful
   * https://developer.mozilla.org/en-US/docs/Web/API/Response/ok
   *
   * Thus instead of making API servers include an 'ok' data prop in response body,
   * this method auto injects in the ok prop using Response.ok as long as API server use the right HTTP code.
   * However the 'ok' prop is set before the spread operator so your API can return an 'ok' to override this.
   */
  runJSON<T extends Record<string, any> = Record<string, any>>(): Promise<
    T & { ok: boolean; status: number }
  > {
    // It's nested this way to ensure response.ok is still accessible after parsedJSON is received
    return this.run().then((response) =>
      response.json().then((parsedJSON) => ({
        ok: response.ok,
        status: response.status,
        ...parsedJSON,
      }))
    );
  }
}