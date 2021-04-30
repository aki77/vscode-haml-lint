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
  Position
} from "vscode";
import { SOURCE } from "./Linter";

export class QuickFixProvider implements CodeActionProvider {
  provideCodeActions(
    document: TextDocument,
    range: Range | Selection,
    context: CodeActionContext,
    token: CancellationToken
  ): CodeAction[] {
    const warnings = context.diagnostics.filter(
      diagnostic =>
        diagnostic.source === SOURCE &&
        diagnostic.severity === DiagnosticSeverity.Warning
    );
    return warnings.length > 0 ? [this.createFix(document, warnings)] : [];
  }

  private createFix(
    document: TextDocument,
    diagnostics: Diagnostic[]
  ): CodeAction {
    const linterNames = diagnostics
      .map(({ code }) => code)
      // TODO: Support for RuboCop
      .filter((code) => code !== "RuboCop")
      .join(", ");
    const fix = new CodeAction("Disable linters", CodeActionKind.QuickFix);
    fix.edit = new WorkspaceEdit();
    fix.edit.insert(
      document.uri,
      new Position(0, 0),
      `-# haml-lint:disable ${linterNames}\n`
    );
    return fix;
  }
}
