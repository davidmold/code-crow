# Session Continuity Test

This test suite isolates the backend session management to diagnose why follow-up questions aren't working in the conversation flow.

## Overview

The test creates:
1. **MockAgent** - Simulates an agent that responds to commands with predefined answers and Claude session IDs
2. **SessionContinuityTest** - Acts as a web client that sends two sequential questions
3. **Comprehensive logging** - Tracks session ID flow throughout the system

## Test Flow

1. **Initial Question**: "how many planets do we have in this sim?"
   - Should receive answer about 8 planets
   - Should capture a Claude session ID for continuation

2. **Follow-up Question**: "And which should we add next?"
   - Should use the captured Claude session ID with `resume` parameter
   - Should receive contextually relevant answer about adding Pluto/asteroids

## Running the Test

### Prerequisites
1. Start the server: `npm run dev:server` (from server package)
2. Install dependencies: `npm install` (in server package)

### Run Test
```bash
# From the server package directory
npm run test:session

# Or directly
tsx src/test/run-session-test.ts
```

## What to Look For

### Success Indicators ✅
- Both questions receive responses
- Claude session ID is captured from first response
- Follow-up question uses the same Claude session ID
- Responses are contextually relevant

### Failure Indicators ❌
- Claude session ID is missing/null/undefined
- Follow-up question doesn't use the session ID from first response
- Responses are generic/unrelated
- Session continuity is broken

## Expected Output

The test will show detailed logging including:
- Session ID tracking at each step
- API options merging and forwarding
- Claude session ID capture and reuse
- WebSocket message flow

## Key Files

- `session-continuity-test.ts` - Web client simulator
- `mock-agent.ts` - Agent simulator with predefined responses
- `run-session-test.ts` - Test orchestrator and runner
- `CommandHandler.ts` - Enhanced with session tracking logs

## Troubleshooting

### Test Timeouts
- Increase timeout in test calls if needed
- Check server logs for errors
- Ensure WebSocket connections are established

### No Responses
- Verify server is running on http://localhost:8080
- Check that mock agent is connecting successfully
- Review WebSocket connection logs

### Session ID Issues
- Look for "SESSION TRACKING" logs in server output
- Verify that `claudeSessionId` is being passed through all layers
- Check that `resume` parameter is being set correctly

## Understanding the Problem

This test specifically isolates the backend to help identify:

1. **Are session IDs being properly captured?**
2. **Are session IDs being properly forwarded for continuation?**
3. **Is the message flow working correctly?**
4. **Where exactly does the session continuity break down?**

The enhanced logging will show exactly where the session information is being lost or not properly handled.