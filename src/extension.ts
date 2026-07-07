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
import { ButtonItem } from './tree/items';

/**
 * Context menu passes a ButtonItem TreeItem, but handlers expect ResolvedButton.
 * Unwrap if needed.
 */
function unwrapButton(arg: unknown): ResolvedButton {
  if (arg instanceof ButtonItem) {
    return arg.button;
  }
  return arg as ResolvedButton;
}

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
    (button: unknown) => runHandler(unwrapButton(button))
  );

  const refreshCmd = vscode.commands.registerCommand('commandButtons.refresh', refresh);

  const addHandler = createAddHandler(refresh);
  const addCmd = vscode.commands.registerCommand(
    'commandButtons.addButton',
    addHandler
  );

  const editHandler = createEditHandler(refresh);
  const editCmd = vscode.commands.registerCommand(
    'commandButtons.editButton',
    (arg: unknown) => editHandler(unwrapButton(arg))
  );

  const deleteHandler = createDeleteHandler(refresh);
  const deleteCmd = vscode.commands.registerCommand(
    'commandButtons.deleteButton',
    (arg: unknown) => deleteHandler(unwrapButton(arg))
  );

  const moveUpHandler = createMoveHandler(refresh, 'up');
  const moveUpCmd = vscode.commands.registerCommand(
    'commandButtons.moveButtonUp',
    (arg: unknown) => moveUpHandler(unwrapButton(arg))
  );

  const moveDownHandler = createMoveHandler(refresh, 'down');
  const moveDownCmd = vscode.commands.registerCommand(
    'commandButtons.moveButtonDown',
    (arg: unknown) => moveDownHandler(unwrapButton(arg))
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
