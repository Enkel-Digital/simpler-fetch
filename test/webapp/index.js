import { oof } from "../../dist/index.js";

(async function () {
  // Change this to use dist/oof so the .then dont have to destructure it out
  // import("../../dist/index.js")
  //     .then(({ oof }) => oof.GET("https://jsonplaceholder.typicode.com/todos/1").runJSON())
  //     .then(res => console.log("res", res));

  oof._baseUrl = "http://localhost:3000";
  console.log("oof._baseUrl: ", oof._baseUrl);

  await oof
    .GET("/test")
    .runJSON()
    .then((res) => console.log("res 0", res));
  await oof
    .GET("http://localhost:3000/test")
    .runJSON()
    .then((res) => console.log("res 1", res));
  await oof
    .GET("https://jsonplaceholder.typicode.com/todos/1")
    .runJSON()
    .then((res) => console.log("res 2", res));

  // const response = await oof
  //     .GET("/test")
  //     .header({ lastHeader: 1 })
  //     .runJSON()

  // const response2 = await oof
  //     .POST("/test")
  //     // Can be a synchronous function that returns a header object
  //     .header(() => ({ randomHeader: true, anotherHeader: "value" }))
  //     // Can be an asynchronous function that returns a header Promise<object>
  //     .header(async () => ({ asyncHeader: await Promise.resolve("value") }))
  //     // Can also just directly pass in a header object. Header method can be called multiple times
  //     .header({ lastHeader: 1 })
  //     .data({ test: true, anotherTest: "testing" })
  //     .run()
  //     .then((response) => response.json());

  // console.log(response, response2);
})();