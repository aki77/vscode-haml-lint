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
import { CODE } from "./Linter";

export class QuickFixProvider implements CodeActionProvider {
  provideCodeActions(
    document: TextDocument,
    range: Range | Selection,
    context: CodeActionContext,
    token: CancellationToken
  ): CodeAction[] {
    const warnings = context.diagnostics.filter(
      diagnostic =>
        diagnostic.code === CODE &&
        diagnostic.severity === DiagnosticSeverity.Warning
    );
    return warnings.length > 0 ? [this.createFix(document, warnings)] : [];
  }

  private createFix(
    document: TextDocument,
    diagnostics: Diagnostic[]
  ): CodeAction {
    const linterNames = diagnostics
      .map(diagnostic => {
        return diagnostic.message.split(":", 2)[0];
      })
      // TODO: Support for RuboCop
      .filter(linterName => linterName !== "RuboCop")
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
