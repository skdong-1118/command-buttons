import * as vscode from 'vscode';
import { CommandButtonsProvider } from './tree/provider';
import { createRunButtonHandler } from './commands/sendText';
import {
  createAddHandler,
  createEditHandler,
  createDeleteHandler,
  createMoveHandler,
} from './commands/manageButtons';
import { ResolvedButton } from './config/types';

export function activate(context: vscode.ExtensionContext): void {
  // ── Tree provider ──────────────────────────────────────────────
  const provider = new CommandButtonsProvider(context);

  const treeView = vscode.window.createTreeView('commandButtons.sidebar', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });

  const refresh = () => provider.refresh();

  // ── Commands ───────────────────────────────────────────────────
  const runHandler = createRunButtonHandler();
  const runCmd = vscode.commands.registerCommand(
    'commandButtons.runButton',
    (button: ResolvedButton) => runHandler(button)
  );

  const refreshCmd = vscode.commands.registerCommand('commandButtons.refresh', refresh);

  const addCmd = vscode.commands.registerCommand(
    'commandButtons.addButton',
    createAddHandler(refresh)
  );

  const editCmd = vscode.commands.registerCommand(
    'commandButtons.editButton',
    createEditHandler(refresh)
  );

  const deleteCmd = vscode.commands.registerCommand(
    'commandButtons.deleteButton',
    createDeleteHandler(refresh)
  );

  const moveUpCmd = vscode.commands.registerCommand(
    'commandButtons.moveButtonUp',
    createMoveHandler(refresh, 'up')
  );

  const moveDownCmd = vscode.commands.registerCommand(
    'commandButtons.moveButtonDown',
    createMoveHandler(refresh, 'down')
  );

  // ── Config change watcher ──────────────────────────────────────
  const configListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('commandButtons.buttons')) {
      refresh();
    }
  });

  // ── Workspace file watcher ─────────────────────────────────────
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/.vscode/command-buttons.json');
  fileWatcher.onDidChange(refresh);
  fileWatcher.onDidCreate(refresh);
  fileWatcher.onDidDelete(refresh);

  // ── Dispose ────────────────────────────────────────────────────
  context.subscriptions.push(
    treeView, refreshCmd, runCmd, addCmd, editCmd, deleteCmd,
    moveUpCmd, moveDownCmd, configListener, fileWatcher
  );
}

export function deactivate(): void {
  // Nothing to clean up — all disposables are pushed to context.subscriptions.
}
