import * as vscode from 'vscode';
import { ButtonConfig, ResolvedButton } from '../config/types';
import {
  ConfigTarget,
  readButtons,
  writeButtons,
  hasWorkspace,
  workspaceFileExists,
  suggestedTarget,
} from '../config/writer';
import { GroupItem } from '../tree/items';

/** Find a button in the list by its unique key (id, falling back to label). */
function findButtonIndex(buttons: ButtonConfig[], button: ResolvedButton): number {
  const key = button.id || button.label;
  return buttons.findIndex(b => (b.id || b.label) === key);
}

// ── Common Codicons for the icon picker ──────────────────────────

const COMMON_ICONS = [
  { label: '$(terminal) Terminal', id: 'terminal' },
  { label: '$(play) Play', id: 'play' },
  { label: '$(debug-start) Debug', id: 'debug-start' },
  { label: '$(gear) Gear', id: 'gear' },
  { label: '$(tools) Tools', id: 'tools' },
  { label: '$(sync) Sync', id: 'sync' },
  { label: '$(cloud-upload) Upload', id: 'cloud-upload' },
  { label: '$(cloud-download) Download', id: 'cloud-download' },
  { label: '$(git-branch) Git Branch', id: 'git-branch' },
  { label: '$(git-commit) Git Commit', id: 'git-commit' },
  { label: '$(repo) Repo', id: 'repo' },
  { label: '$(package) Package', id: 'package' },
  { label: '$(rocket) Rocket', id: 'rocket' },
  { label: '$(beaker) Beaker', id: 'beaker' },
  { label: '$(flame) Flame', id: 'flame' },
  { label: '$(shield) Shield', id: 'shield' },
  { label: '$(key) Key', id: 'key' },
  { label: '$(lock) Lock', id: 'lock' },
  { label: '$(database) Database', id: 'database' },
  { label: '$(server) Server', id: 'server' },
  { label: '$(file-text) File', id: 'file-text' },
  { label: '$(folder) Folder', id: 'folder' },
  { label: '$(search) Search', id: 'search' },
  { label: '$(filter) Filter', id: 'filter' },
  { label: '$(check) Check', id: 'check' },
  { label: '$(x) None', id: '' },
];

// ── Add Button ───────────────────────────────────────────────────

export function createAddHandler(
  onChanged: () => void
): (arg?: string | GroupItem) => Promise<void> {
  return async (arg?: string | GroupItem) => {
    // VSCode passes the GroupItem from group context menu, or a string,
    // or an unexpected object (e.g. TreeView) from the toolbar button.
    let prefillGroup: string | undefined;
    if (arg instanceof GroupItem) {
      prefillGroup = arg.label!.toString();
    } else if (typeof arg === 'string') {
      prefillGroup = arg;
    }

    // Step 1: Group (optional) — always show so user can confirm or change
    const groupName = await vscode.window.showInputBox({
      title: 'Command Buttons — Add Button',
      value: prefillGroup ?? '',
      placeHolder: 'skip to leave ungrouped',
      prompt: 'Enter a group name (optional, press Enter/ESC to skip)',
    });
    // undefined means ESC — user cancelled
    if (groupName === undefined) { return; }

    const stepTitle = groupName?.trim()
      ? `Command Buttons — Add to "${groupName.trim()}"`
      : 'Command Buttons — Add Button';

    // Step 2: Label
    const label = await vscode.window.showInputBox({
      title: stepTitle,
      placeHolder: 'My Button',
      prompt: 'Enter the button label (display text)',
      validateInput: v => (v?.trim() ? undefined : 'Label is required'),
    });
    if (!label) { return; }

    // Step 3: Command
    const command = await vscode.window.showInputBox({
      title: `${stepTitle} — "${label}"`,
      placeHolder: 'echo hello',
      prompt: 'Enter the command text to send to the terminal',
      validateInput: v => (v?.trim() ? undefined : 'Command is required'),
    });
    if (!command) { return; }

    // Step 4: Icon (optional)
    const iconPick = await vscode.window.showQuickPick(
      [
        { label: '$(search) Search for icon...', id: '__search__' },
        { label: '$(x) No icon', id: '' },
        { label: '── Common Icons ──', id: '__sep__', alwaysShow: true },
        ...COMMON_ICONS,
      ],
      {
        title: `${stepTitle} — "${label}"`,
        placeHolder: 'Choose an icon (optional)',
        matchOnDescription: true,
      }
    );
    if (!iconPick) { return; }

    let iconId = iconPick.id;

    // Search for custom icon
    if (iconId === '__search__') {
      const custom = await vscode.window.showInputBox({
        title: `${stepTitle} — Icon for "${label}"`,
        placeHolder: 'rocket',
        prompt: 'Enter a Codicon ID (without $() ) — e.g. "rocket", "flame", "gear"',
      });
      if (custom === undefined) { return; }
      iconId = custom?.trim() ?? '';
    }

    const icon = iconId ? `$(${iconId})` : undefined;

    // Step 5: Target
    const target = await pickTarget();

    // Generate a unique id from label; fall back to timestamp if label is non-Latin
    let id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!id) {
      id = `btn-${Date.now()}`;
    }

    // Build and save
    const button: ButtonConfig = {
      id,
      label: label.trim(),
      command: command.trim(),
      ...(icon ? { icon } : {}),
      ...(groupName?.trim() ? { group: groupName.trim() } : {}),
    };

    const buttons = readButtons(target);
    buttons.push(button);
    await writeButtons(buttons, target);

    vscode.window.showInformationMessage(`Button "${label}" added to ${target === 'global' ? 'global settings' : 'workspace'}`);
    onChanged();
  };
}

// ── Edit Button ──────────────────────────────────────────────────

export function createEditHandler(
  onChanged: () => void
): (button: ResolvedButton) => Promise<void> {
  return async (button: ResolvedButton) => {
    const target: ConfigTarget = button.source === 'workspace' ? 'workspace' : 'global';

    // Pick which field to edit
    const field = await vscode.window.showQuickPick(
      [
        { label: '$(symbol-field) Label', description: button.label, field: 'label' },
        { label: '$(terminal) Command', description: button.command, field: 'command' },
        { label: '$(symbol-color) Icon', description: button.icon ?? '(none)', field: 'icon' },
        { label: '$(folder) Group', description: button.group ?? '(none)', field: 'group' },
      ],
      {
        title: `Command Buttons — Edit "${button.label}"`,
        placeHolder: 'Choose a field to edit',
      }
    );
    if (!field) { return; }

    const fieldName = (field as any).field as string;
    let newValue: string | undefined;

    if (fieldName === 'icon') {
      const iconPick = await vscode.window.showQuickPick(
        [
          { label: '$(search) Search for icon...', id: '__search__' },
          { label: '$(x) No icon', id: '' },
          { label: '── Common Icons ──', id: '__sep__', alwaysShow: true },
          ...COMMON_ICONS,
        ],
        {
          title: `Command Buttons — Edit "${button.label}" Icon`,
          placeHolder: 'Choose an icon',
        }
      );
      if (!iconPick) { return; }

      if (iconPick.id === '__search__') {
        const custom = await vscode.window.showInputBox({
          placeHolder: 'rocket',
          prompt: 'Enter a Codicon ID (without $() )',
        });
        if (custom === undefined) { return; }
        newValue = custom.trim() ? `$(${custom.trim()})` : '';
      } else {
        newValue = iconPick.id ? `$(${iconPick.id})` : '';
      }
    } else {
      const currentVal = fieldName === 'label' ? button.label
        : fieldName === 'command' ? button.command
        : (button as any)[fieldName] ?? '';
      newValue = await vscode.window.showInputBox({
        title: `Command Buttons — Edit "${button.label}" ${fieldName}`,
        value: currentVal || '',
        placeHolder: fieldName === 'label' ? 'Button label' : fieldName === 'command' ? 'Command text' : 'Group name',
        validateInput: fieldName !== 'group' ? (v => (v?.trim() ? undefined : `${fieldName} is required`)) : undefined,
      });
      if (newValue === undefined) { return; }
    }

    // Apply change
    const buttons = readButtons(target);
    const idx = findButtonIndex(buttons, button);
    if (idx === -1) { return; }

    const updated = { ...buttons[idx] };
    (updated as any)[fieldName] = newValue || undefined;
    buttons[idx] = updated;

    await writeButtons(buttons, target);

    // If label changed and id needs update
    // (Keep id stable for simplicity — id doesn't change on edit)

    vscode.window.showInformationMessage(`"${button.label}" updated`);
    onChanged();
  };
}

// ── Delete Button ────────────────────────────────────────────────

export function createDeleteHandler(
  onChanged: () => void
): (button: ResolvedButton) => Promise<void> {
  return async (button: ResolvedButton) => {
    const target: ConfigTarget = button.source === 'workspace' ? 'workspace' : 'global';

    const answer = await vscode.window.showWarningMessage(
      `Delete button "${button.label}" from ${target === 'global' ? 'global settings' : 'workspace'}?`,
      { modal: true },
      'Delete'
    );
    if (answer !== 'Delete') { return; }

    let buttons = readButtons(target);
    buttons = buttons.filter(b => b.id !== button.id);
    await writeButtons(buttons, target);

    vscode.window.showInformationMessage(`"${button.label}" deleted`);
    onChanged();
  };
}

// ── Move Button ──────────────────────────────────────────────────

export function createMoveHandler(
  onChanged: () => void,
  direction: 'up' | 'down'
): (button: ResolvedButton) => Promise<void> {
  return async (button: ResolvedButton) => {
    const target: ConfigTarget = button.source === 'workspace' ? 'workspace' : 'global';
    const buttons = readButtons(target);
    const idx = findButtonIndex(buttons, button);
    if (idx === -1) { return; }

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= buttons.length) { return; }

    // Swap
    [buttons[idx], buttons[newIdx]] = [buttons[newIdx], buttons[idx]];
    await writeButtons(buttons, target);

    onChanged();
  };
}

// ── Helpers ──────────────────────────────────────────────────────

async function pickTarget(): Promise<ConfigTarget> {
  if (!hasWorkspace()) {
    return 'global';
  }

  // If both available, let user choose
  const suggested = suggestedTarget();
  const pick = await vscode.window.showQuickPick(
    [
      {
        label: '$(settings-gear) Global Settings',
        description: 'Available to all projects',
        target: 'global' as ConfigTarget,
      },
      {
        label: '$(folder) Workspace',
        description: 'Only for this project (.vscode/command-buttons.json)',
        target: 'workspace' as ConfigTarget,
      },
    ],
    {
      title: 'Command Buttons — Save Location',
      placeHolder: suggested === 'global' ? 'Global Settings' : 'Workspace',
    }
  );

  return pick?.target ?? suggested;
}
