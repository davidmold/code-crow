# Generic Options Passthrough System

## ✅ **Problem Solved**

**Before**: Adding a new Claude Code SDK option like `maxTurns` required updating 6+ files across the entire communication chain.

**Now**: Adding new options only requires updating the `ClaudeCodeApiOptions` interface - everything else passes through automatically!

## 🚀 **Architecture Overview**

### **1. Single Source of Truth**
```typescript
// packages/shared/src/types/claude-code-api.ts
export interface ClaudeCodeApiOptions {
  // Session Management
  continueSession?: boolean;
  resume?: string; // Official API uses 'resume'
  resumeSessionId?: string; // Backwards compatibility
  
  // Execution Control  
  maxTurns?: number;
  timeout?: number;
  timeoutMs?: number;
  
  // AI Behavior
  systemPrompt?: string;
  allowedTools?: string[];
  
  // Extensible for future options
  [key: string]: any;
}
```

### **2. Passthrough Communication**
- **Frontend** → specifies any Claude Code options
- **Server** → passes options through unchanged  
- **Agent** → passes options through unchanged
- **Claude Code Service** → interprets all options

### **3. Backwards Compatibility**
- Old scattered option fields still work
- New `apiOptions` field is preferred
- Automatic merging via `ApiOptionsHelper.mergeCompatibilityOptions()`

## 📋 **What Was Implemented**

### **Core Infrastructure**
✅ `ClaudeCodeApiOptions` - Comprehensive options interface  
✅ `ApiOptionsHelper` - Merging and extraction utilities  
✅ Updated WebSocket message interfaces with generic `apiOptions`  
✅ Backwards compatibility for existing option fields  

### **Communication Layer Updates**
✅ **Server**: `handleExecuteCommand()` uses generic options passthrough  
✅ **Agent**: `handleCommand()` merges and forwards all options  
✅ **Frontend**: `executeCommand()` accepts full `ClaudeCodeApiOptions`

### **Enhanced Frontend API**
✅ New `sendCommandWithOptions()` method in session store  
✅ Full TypeScript support for all Claude Code SDK options  
✅ Demo component showing how easy it is to use new options

## 🎯 **Usage Examples**

### **Adding New Options is Now Trivial**

```typescript
// Adding maxTurns - just use it!
await sessionStore.sendCommandWithOptions(
  "Refactor this code for better performance",
  projectId,
  {
    maxTurns: 5,
    systemPrompt: "You are a senior software engineer focused on performance optimization",
    allowedTools: ["str_replace_editor", "bash"],
    timeout: 120000
  }
);
```

### **Project Session Switching**
```typescript
// Automatically resumes correct project session
await sessionStore.sendCommandWithOptions(
  "Continue working on the authentication feature",
  "auth-project", // Switches to auth project and resumes its session
  {
    continueSession: true,
    maxTurns: 10
  }
);
```

### **Advanced Configuration**
```typescript
// All Claude Code SDK options available immediately
await sessionStore.sendCommandWithOptions(
  "Implement the new feature with comprehensive tests",
  projectId,
  {
    maxTurns: 15,
    systemPrompt: "Focus on writing clean, well-tested code with comprehensive error handling",
    allowedTools: ["str_replace_editor", "bash", "computer"],
    timeoutMs: 600000, // 10 minutes
    temperature: 0.3, // More focused responses
    model: "claude-3-opus-20240229" // Specific model
  },
  {
    newSession: true // Client-specific option
  }
);
```

## 🔧 **For Developers**

### **Adding New Claude Code SDK Options**
1. Update `ClaudeCodeApiOptions` interface ← **ONLY CHANGE NEEDED!**
2. Frontend can immediately use the new option
3. No server, agent, or communication changes required

### **Migration Path**
- Existing code continues to work (backwards compatible)
- Gradually migrate to `sendCommandWithOptions()` for new features
- Eventually remove old scattered option fields

## 🎉 **Benefits Achieved**

✅ **Extensibility**: New options require only 1 file change  
✅ **Type Safety**: Full TypeScript support for all options  
✅ **Backwards Compatibility**: Existing code continues to work  
✅ **Per-Project Sessions**: Smart session management with project switching  
✅ **Clean Architecture**: Clear separation between API options and client options  
✅ **Future-Proof**: Ready for any new Claude Code SDK features

The system now provides the same ease of configuration as the Claude Code CLI while maintaining the powerful multi-project session management you requested!