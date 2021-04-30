import {
  CodeActionProvider,
  Selection,
  TextDocument,
  Range,
  CodeActionContext,
  CancellationToken,
  CodeAction,
  DiagnosticSeverity,
  Diagnostic,
  CodeActionKind,
  WorkspaceEdit,
  Position,
} from 'vscode';
import { SOURCE } from './Linter';

export class QuickFixProvider implements CodeActionProvider {
  provideCodeActions(
    document: TextDocument,
    range: Range | Selection,
    context: CodeActionContext,
    token: CancellationToken
  ): CodeAction[] {
    const warnings = context.diagnostics.filter(
      (diagnostic) =>
        diagnostic.source === SOURCE &&
        diagnostic.severity === DiagnosticSeverity.Warning
    );
    return warnings.length > 0 ? this.createActions(document, warnings) : [];
  }

  private createActions(
    document: TextDocument,
    diagnostics: Diagnostic[]
  ): CodeAction[] {
    return diagnostics.map((diagnostic) => {
      return diagnostic.code === 'RuboCop'
        ? this.createRubocopAction(document, diagnostic)
        : this.createHamlLintAction(document, diagnostic);
    });
  }

  private createHamlLintAction(
    document: TextDocument,
    diagnostic: Diagnostic
  ): CodeAction {
    const fix = new CodeAction(
      `Disable ${diagnostic.code} for this entire file`,
      CodeActionKind.QuickFix
    );
    fix.edit = new WorkspaceEdit();
    fix.edit.insert(
      document.uri,
      new Position(0, 0),
      `-# haml-lint:disable ${diagnostic.code}\n`
    );
    return fix;
  }

  private createRubocopAction(
    document: TextDocument,
    diagnostic: Diagnostic
  ): CodeAction {
    const rule = diagnostic.message.split(':')[0];
    const fix = new CodeAction(
      `Disable ${rule} for this entire file`,
      CodeActionKind.QuickFix
    );
    fix.edit = new WorkspaceEdit();
    fix.edit.insert(
      document.uri,
      new Position(0, 0),
      `-# rubocop:disable ${rule}\n`
    );
    fix.edit.insert(
      document.uri,
      new Position(document.lineCount + 1, 0),
      `-# rubocop:enable ${rule}\n`
    );
    return fix;
  }
}
