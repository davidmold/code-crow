```ts
import { query } from "@anthropic-ai/claude-code";

// Continue most recent conversation
for await (const message of query({
  prompt: "Now refactor this for better performance",
  options: { continueSession: true }
})) {
  if (message.type === "result") console.log(message.result);
}

// Resume specific session with custom options
for await (const message of query({
  prompt: "Update the tests with comprehensive coverage",
  options: { 
    resume: "550e8400-e29b-41d4-a716-446655440000",
    systemPrompt: "Focus on thorough testing and edge cases"
  }
})) {
  if (message.type === "result") console.log(message.result);
}
```