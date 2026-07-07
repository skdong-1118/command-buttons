import * as vscode from 'vscode';
import { ResolvedButton } from '../config/types';
import { resolveTooltip } from '../config/loader';

/**
 * Context value for button tree items. Used by package.json `when` clauses.
 */
export const BUTTON_CONTEXT = 'button';
export const GROUP_CONTEXT = 'group';

/**
 * A leaf tree item representing a clickable button.
 */
export class ButtonItem extends vscode.TreeItem {
  constructor(public readonly button: ResolvedButton) {
    super(button.label, vscode.TreeItemCollapsibleState.None);

    this.contextValue = `${BUTTON_CONTEXT};${button.source}`;
    this.description = button.command;
    this.tooltip = resolveTooltip(button);

    // Parse optional Codicon, e.g. "$(gear)" → icon "gear"
    if (button.icon) {
      const match = button.icon.match(/^\$\((.+)\)$/);
      if (match) {
        this.iconPath = new vscode.ThemeIcon(match[1]);
      }
    }

    this.command = {
      command: 'commandButtons.runButton',
      title: 'Run',
      arguments: [button],
    };
  }
}

/**
 * A parent tree item representing a collapsible group of buttons.
 */
export class GroupItem extends vscode.TreeItem {
  public readonly buttons: ButtonItem[];

  constructor(groupName: string, buttons: ResolvedButton[]) {
    super(groupName, vscode.TreeItemCollapsibleState.Expanded);

    this.contextValue = GROUP_CONTEXT;
    this.buttons = buttons.map(b => new ButtonItem(b));

    // Set icon to folder by default; collapsed/expanded auto-switched by theme
    this.iconPath = new vscode.ThemeIcon('folder');
  }
}

/**
 * An item shown when the button list is empty.
 */
export class EmptyItem extends vscode.TreeItem {
  constructor() {
    super('No buttons configured', vscode.TreeItemCollapsibleState.None);

    this.description = 'Add buttons in settings (commandButtons.buttons) or .vscode/command-buttons.json';
    this.iconPath = new vscode.ThemeIcon('info');
    this.contextValue = 'empty';
    this.command = {
      command: 'workbench.action.openSettings',
      title: 'Open Settings',
      arguments: ['commandButtons.buttons'],
    };
  }
}
