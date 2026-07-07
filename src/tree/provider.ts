import * as vscode from 'vscode';
import { loadButtons, groupButtons } from '../config/loader';
import { ButtonItem, GroupItem, EmptyItem } from './items';

/**
 * TreeDataProvider that builds the button list from merged configuration.
 * Top-level items are either GroupItem (collapsible) or ButtonItem (ungrouped).
 */
export class CommandButtonsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly context: vscode.ExtensionContext) {}

  /** Refresh the tree (reload config from settings + workspace file). */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    // Root level: return groups and ungrouped buttons
    if (!element) {
      return this.buildRootChildren();
    }

    // Group level: return buttons inside that group
    if (element instanceof GroupItem) {
      return element.buttons;
    }

    // Leaf: no children
    return [];
  }

  private buildRootChildren(): vscode.TreeItem[] {
    const buttons = loadButtons(this.context);

    if (buttons.length === 0) {
      return [new EmptyItem()];
    }

    const grouped = groupButtons(buttons);
    const children: vscode.TreeItem[] = [];

    for (const g of grouped) {
      if (g.group === null) {
        // Ungrouped buttons go directly at root
        children.push(...g.buttons.map(b => new ButtonItem(b)));
      } else {
        // Grouped buttons go under a GroupItem
        children.push(new GroupItem(g.group, g.buttons));
      }
    }

    return children;
  }
}
