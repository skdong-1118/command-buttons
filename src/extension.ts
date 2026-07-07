import * as vscode from 'vscode';
import { CommandButtonsProvider } from './tree/provider';
import { createRunButtonHandler } from './commands/sendText';
import { ResolvedButton } from './config/types';

export function activate(context: vscode.ExtensionContext): void {
  // ── Tree provider ──────────────────────────────────────────────
  const provider = new CommandButtonsProvider(context);

  const treeView = vscode.window.createTreeView('commandButtons.sidebar', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });

  // ── Commands ───────────────────────────────────────────────────
  const refreshCmd = vscode.commands.registerCommand('commandButtons.refresh', () => {
    provider.refresh();
  });

  const runHandler = createRunButtonHandler();
  const runCmd = vscode.commands.registerCommand(
    'commandButtons.runButton',
    (button: ResolvedButton) => runHandler(button)
  );

  // ── Config change watcher ──────────────────────────────────────
  const configListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('commandButtons.buttons')) {
      provider.refresh();
    }
  });

  // ── Workspace file watcher ─────────────────────────────────────
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/.vscode/command-buttons.json');
  fileWatcher.onDidChange(() => provider.refresh());
  fileWatcher.onDidCreate(() => provider.refresh());
  fileWatcher.onDidDelete(() => provider.refresh());

  // ── Dispose ────────────────────────────────────────────────────
  context.subscriptions.push(treeView, refreshCmd, runCmd, configListener, fileWatcher);
}

export function deactivate(): void {
  // Nothing to clean up — all disposables are pushed to context.subscriptions.
}
