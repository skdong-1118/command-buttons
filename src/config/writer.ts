import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ButtonConfig, CommandButtonsConfig } from './types';

export type ConfigTarget = 'global' | 'workspace';

/**
 * Read the current full button list from the given target.
 */
export function readButtons(target: ConfigTarget): ButtonConfig[] {
  if (target === 'workspace') {
    return readWorkspaceFileButtons();
  }
  return readGlobalButtons();
}

/**
 * Write the full button list to the given target.
 */
export async function writeButtons(buttons: ButtonConfig[], target: ConfigTarget): Promise<void> {
  if (target === 'workspace') {
    await writeWorkspaceFileButtons(buttons);
  } else {
    await writeGlobalButtons(buttons);
  }
}

// ── Global settings ──────────────────────────────────────────────

function readGlobalButtons(): ButtonConfig[] {
  const config = vscode.workspace.getConfiguration('commandButtons');
  return config.get<ButtonConfig[]>('buttons', []);
}

async function writeGlobalButtons(buttons: ButtonConfig[]): Promise<void> {
  const config = vscode.workspace.getConfiguration('commandButtons');
  await config.update('buttons', buttons, vscode.ConfigurationTarget.Global);
}

// ── Workspace file (.vscode/command-buttons.json) ────────────────

function workspaceConfigPath(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return null;
  }
  return path.join(folders[0].uri.fsPath, '.vscode', 'command-buttons.json');
}

function readWorkspaceFileButtons(): ButtonConfig[] {
  const configPath = workspaceConfigPath();
  if (!configPath || !fs.existsSync(configPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed: CommandButtonsConfig = JSON.parse(raw);
    return Array.isArray(parsed.buttons) ? parsed.buttons : [];
  } catch {
    return [];
  }
}

async function writeWorkspaceFileButtons(buttons: ButtonConfig[]): Promise<void> {
  const configPath = workspaceConfigPath();
  if (!configPath) {
    throw new Error('No workspace folder open');
  }

  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content: CommandButtonsConfig = {
    version: 1,
    buttons,
  };

  // Pretty-print with 2-space indent
  fs.writeFileSync(configPath, JSON.stringify(content, null, 2) + '\n', 'utf-8');
}

// ── Helpers ──────────────────────────────────────────────────────

/** Check whether a workspace is open and can be written to. */
export function hasWorkspace(): boolean {
  return workspaceConfigPath() !== null;
}

/** Check whether a workspace config file already exists. */
export function workspaceFileExists(): boolean {
  const p = workspaceConfigPath();
  return p !== null && fs.existsSync(p);
}

/**
 * Determine the suggested write target:
 *  - If workspace file already exists → workspace
 *  - Otherwise → global
 */
export function suggestedTarget(): ConfigTarget {
  return workspaceFileExists() ? 'workspace' : 'global';
}
