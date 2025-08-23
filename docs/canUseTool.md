 

Based on the available sources, there's a known issue with the `canUseTool` callback in the Claude Code TypeScript SDK [(1)](https://github.com/anthropics/claude-code/issues/4775). The error you're encountering is related to the streaming JSON input format requirement.

According to the documentation, streaming JSON input requires using an AsyncIterable prompt format [(2)](https://docs.anthropic.com/en/docs/claude-code/sdk#input-formats). Here's how to properly structure it:

```ts
const { query } = require('@anthropic-ai/claude-code');

const stream = query({
    prompt: (async function* () {
        yield { type: 'user', message: { role: 'user', content: 'What is 2+2?' } };
    })(),
    options: {
        canUseTool: (toolName, toolInput) => {
            return { behavior: "allow", updatedInput: toolInput };
        }
    }
});

for await (const message of stream) {
    if (message.type === 'result') break;
}
```
[(1)](https://github.com/anthropics/claude-code/issues/4775)

However, there's a known bug where the `canUseTool` callback hangs indefinitely [(1)](https://github.com/anthropics/claude-code/issues/4775). A workaround has been identified:

```ts
let done
let receivedResult = new Promise(resolve => {
    done = resolve;
})
const stream = query({
    prompt: (async function* () {
        yield { type: 'user', message: { role: 'user', content: 'echo "test" into test.txt' } };
        await receivedResult
    })(),
    options: {
        canUseTool: async (toolName, toolInput) => {
            return { behavior: "allow", updatedInput: toolInput };
        }
    }
});

for await (const message of stream) {
    if (message.type === 'result') {
        done()
    }
}
```
[(1)](https://github.com/anthropics/claude-code/issues/4775)

The key requirements are:
1. Use an AsyncIterable for the prompt (async generator function)
2. Structure messages as `{ type: 'user', message: { role: 'user', content: 'your prompt' } }`
3. Apply the workaround to prevent hanging

The issue is being tracked and a fix is expected where Claude Code will not hang but instead reject the tool call if this occurs [(1)](https://github.com/anthropics/claude-code/issues/4775).