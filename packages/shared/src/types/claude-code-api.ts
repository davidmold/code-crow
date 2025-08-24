/**
 * Comprehensive Claude Code SDK API Options
 * 
 * This interface defines all possible options that can be passed to the Claude Code SDK.
 * Adding new options here automatically makes them available throughout the entire system
 * without needing to modify server/agent communication layers.
 */
export interface ClaudeCodeApiOptions {
  // Session Management
  continueSession?: boolean;
  resume?: string; // Official API parameter for resuming specific sessions
  sessionFile?: string;

  // Execution Control
  maxTurns?: number;
  timeout?: number;
  timeoutMs?: number;

  // Working Environment
  cwd?: string;
  workingDirectory?: string;

  // AI Behavior
  systemPrompt?: string;
  allowedTools?: string[];
  permissionMode?: 'plan' | 'allow' | 'deny';

  // Advanced Options
  streamOutput?: boolean;
  model?: string;
  temperature?: number;

  // Custom Options (extensible for future Claude Code SDK features)
  [key: string]: any;
}

/**
 * Utility type to extract known option keys for type safety
 */
export type KnownApiOptionKeys = keyof Omit<ClaudeCodeApiOptions, string>;

/**
 * Options specifically for the web client UI
 */
export interface WebClientOptions {
  newSession?: boolean;
}

/**
 * Combined options that include both API options and web client specific options
 */
export interface CombinedOptions {
  apiOptions?: ClaudeCodeApiOptions;
  clientOptions?: WebClientOptions;
}

/**
 * Helper functions for options management
 */
export class ApiOptionsHelper {
  /**
   * Merges backwards compatibility options into apiOptions format
   */
  static mergeCompatibilityOptions(
    apiOptions: ClaudeCodeApiOptions = {},
    legacyOptions: {
      workingDirectory?: string;
      continueSession?: boolean;
      cwd?: string;
      allowedTools?: string[];
      systemPrompt?: string;
      maxTurns?: number;
      timeoutMs?: number;
    } = {}
  ): ClaudeCodeApiOptions {
    return {
      ...apiOptions,
      // Merge legacy options, giving priority to apiOptions
      ...(legacyOptions.workingDirectory && !apiOptions.workingDirectory ? { workingDirectory: legacyOptions.workingDirectory } : {}),
      ...(legacyOptions.cwd && !apiOptions.cwd ? { cwd: legacyOptions.cwd } : {}),
      ...(legacyOptions.continueSession !== undefined && apiOptions.continueSession === undefined ? { continueSession: legacyOptions.continueSession } : {}),
      ...(legacyOptions.allowedTools && !apiOptions.allowedTools ? { allowedTools: legacyOptions.allowedTools } : {}),
      ...(legacyOptions.systemPrompt && !apiOptions.systemPrompt ? { systemPrompt: legacyOptions.systemPrompt } : {}),
      ...(legacyOptions.maxTurns && !apiOptions.maxTurns ? { maxTurns: legacyOptions.maxTurns } : {}),
      ...(legacyOptions.timeoutMs && !apiOptions.timeoutMs ? { timeoutMs: legacyOptions.timeoutMs } : {}),
    };
  }

  /**
   * Extracts only the options that should be passed to Claude Code SDK
   */
  static extractApiOptions(options: ClaudeCodeApiOptions): ClaudeCodeApiOptions {
    const {
      continueSession,
      resume,
      sessionFile,
      maxTurns,
      timeout,
      timeoutMs,
      cwd,
      workingDirectory,
      systemPrompt,
      allowedTools,
      permissionMode,
      streamOutput,
      model,
      temperature,
      ...customOptions
    } = options;

    return {
      ...(continueSession !== undefined ? { continueSession } : {}),
      ...(resume ? { resume } : {}),
      ...(sessionFile ? { sessionFile } : {}),
      ...(maxTurns ? { maxTurns } : {}),
      ...(timeout ? { timeout } : {}),
      ...(timeoutMs ? { timeoutMs } : {}),
      ...(cwd ? { cwd } : {}),
      ...(workingDirectory ? { workingDirectory } : {}),
      ...(systemPrompt ? { systemPrompt } : {}),
      ...(allowedTools ? { allowedTools } : {}),
      ...(permissionMode ? { permissionMode } : {}),
      ...(streamOutput !== undefined ? { streamOutput } : {}),
      ...(model ? { model } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      ...customOptions
    };
  }
}