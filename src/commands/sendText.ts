import * as vscode from 'vscode';
import { ResolvedButton } from '../config/types';

/**
 * Execute a button: send its command text to the active terminal,
 * followed by a newline (so it runs immediately).
 *
 * If no terminal is open, one is created automatically.
 */
export async function sendText(button: ResolvedButton): Promise<void> {
  let terminal = vscode.window.activeTerminal;

  if (!terminal) {
    terminal = vscode.window.createTerminal('Command Buttons');
  }

  terminal.show();
  terminal.sendText(button.command, true);
}

/**
 * VSCode command handler bound to `commandButtons.runButton`.
 * Accepts a ResolvedButton argument from tree item clicks or command palette.
 */
export function createRunButtonHandler(): (button: ResolvedButton) => Promise<void> {
  return async (button: ResolvedButton) => {
    try {
      await sendText(button);
    } catch (err) {
      vscode.window.showErrorMessage(
        `Command Buttons: Failed to send "${button.label}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };
}
