// lib/inngest/functions.ts
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world", name: "Hello World" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.run("say-hello", async () => {
      console.log("Hello, " + event.data.name + "!");
    });
    return { event, body: "Hello, World!" };
  }
);
