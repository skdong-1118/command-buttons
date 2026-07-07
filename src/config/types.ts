/**
 * Type definitions for the Command Buttons extension configuration.
 */

/** A single button configuration. */
export interface ButtonConfig {
  /** Unique identifier. Used for command registration and merging. */
  id: string;

  /** Display text shown on the button. */
  label: string;

  /** Text to send to the terminal. A newline is appended automatically. */
  command: string;

  /** Optional group name. Buttons in the same group appear under a collapsible section. */
  group?: string;

  /** Optional Codicon ID (e.g. '$(gear)'). */
  icon?: string;

  /** Optional hover tooltip. Defaults to showing `command` if omitted. */
  tooltip?: string;
}

/** Top-level configuration format (used in both settings and workspace file). */
export interface CommandButtonsConfig {
  version: number;
  buttons: ButtonConfig[];
}

/** A validated button ready for rendering. */
export interface ResolvedButton extends ButtonConfig {
  /** Resolved tooltip — always a string after loading. */
  tooltip: string;
  /** Where this button config came from. */
  source: 'global' | 'workspace';
}
