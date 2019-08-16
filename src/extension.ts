"use strict";

import * as vscode from "vscode";
import Linter from "./Linter";
import { QuickFixProvider } from "./QuickFixProvider";

export function activate(context: vscode.ExtensionContext) {
  const linter = new Linter();
  context.subscriptions.push(linter);

  const updateDiagnostics = (document: vscode.TextDocument) => {
    linter.run(document);
  };

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(updateDiagnostics)
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(updateDiagnostics)
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(document => {
      linter.clear(document);
    })
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      "haml",
      new QuickFixProvider(),
      {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
      }
    )
  );

  vscode.workspace.textDocuments.forEach(updateDiagnostics);
}

export function deactivate() {}
