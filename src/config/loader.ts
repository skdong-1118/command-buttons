import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ButtonConfig, CommandButtonsConfig, ResolvedButton } from './types';

/**
 * Merge global settings and workspace config file into a single resolved button list.
 *
 * Merge rules:
 *  1. Global settings are the base.
 *  2. Workspace config entries override by `id`.
 *  3. Unsorted; caller is responsible for grouping/sorting.
 */
export function loadButtons(context: vscode.ExtensionContext): ResolvedButton[] {
  const globalButtons = getGlobalButtons();
  const workspaceButtons = getWorkspaceButtons();

  const merged = new Map<string, ResolvedButton>();

  for (const b of globalButtons) {
    merged.set(b.id, { ...b, source: 'global' } as ResolvedButton);
  }

  for (const b of workspaceButtons) {
    merged.set(b.id, { ...b, source: 'workspace' } as ResolvedButton);
  }

  return Array.from(merged.values());
}

/** Read buttons from VSCode settings (global/user level). */
function getGlobalButtons(): ButtonConfig[] {
  const config = vscode.workspace.getConfiguration('commandButtons');
  const buttons = config.get<ButtonConfig[]>('buttons', []);
  return buttons.filter(b => b.id && b.label && b.command);
}

/** Read buttons from workspace .vscode/command-buttons.json if it exists. */
function getWorkspaceButtons(): ButtonConfig[] {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return [];
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const configPath = path.join(workspaceRoot, '.vscode', 'command-buttons.json');

  if (!fs.existsSync(configPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed: CommandButtonsConfig = JSON.parse(raw);

    if (!parsed || !Array.isArray(parsed.buttons)) {
      vscode.window.showWarningMessage('Command Buttons: Invalid workspace config format. Expected { "version": 1, "buttons": [...] }');
      return [];
    }

    return parsed.buttons.filter(b => b.id && b.label && b.command);
  } catch (err) {
    vscode.window.showWarningMessage(`Command Buttons: Failed to parse workspace config: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

/**
 * Resolve a button's tooltip: use explicit tooltip, fall back to showing command text.
 */
export function resolveTooltip(button: ButtonConfig): string {
  return button.tooltip || button.command;
}

/**
 * Group buttons by their `group` field. Returns an ordered structure:
 *  - Ungrouped buttons first
 *  - Groups sorted alphabetically
 *  - Buttons within each group in config order
 */
export interface GroupedButtons {
  /** Group name, or `null` for ungrouped buttons. */
  group: string | null;
  buttons: ResolvedButton[];
}

export function groupButtons(buttons: ResolvedButton[]): GroupedButtons[] {
  const ungrouped: ResolvedButton[] = [];
  const groups = new Map<string, ResolvedButton[]>();

  for (const b of buttons) {
    if (b.group) {
      const list = groups.get(b.group);
      if (list) {
        list.push(b);
      } else {
        groups.set(b.group, [b]);
      }
    } else {
      ungrouped.push(b);
    }
  }

  const result: GroupedButtons[] = [];

  if (ungrouped.length > 0) {
    result.push({ group: null, buttons: ungrouped });
  }

  const sortedGroupNames = Array.from(groups.keys()).sort();
  for (const name of sortedGroupNames) {
    result.push({ group: name, buttons: groups.get(name)! });
  }

  return result;
}
