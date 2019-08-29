import * as execa from "execa";
import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  languages,
  TextDocument,
  workspace,
  Range,
  Position
} from "vscode";

type Offence = {
  linter_name: string;
  location: {
    line: number;
  };
  message: string;
  severity: string;
};

type File = {
  path: string;
  offenses: Offence[];
};

export const CODE = "haml-lint";

export default class Linter {
  private collection: DiagnosticCollection = languages.createDiagnosticCollection(
    "haml-lint"
  );
  private processes: WeakMap<
    TextDocument,
    execa.ExecaChildProcess
  > = new WeakMap();

  public dispose() {
    this.collection.dispose();
  }

  public run(document: TextDocument) {
    if (document.languageId !== "haml") {
      return;
    }

    this.lint(document);
  }

  public clear(document: TextDocument) {
    if (document.uri.scheme === "file") {
      this.collection.delete(document.uri);
    }
  }

  private async lint(document: TextDocument) {
    const text = document.getText();
    const oldProcess = this.processes.get(document);
    if (oldProcess) {
      oldProcess.kill();
    }

    const workspaceFolder = workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) {
      return;
    }

    const config = workspace.getConfiguration("hamlLint");
    const args = `--reporter json ${document.uri.fsPath}`;
    const command = config.useBundler
      ? `bundle exec haml-lint ${args}`
      : `${config.executablePath} ${args}`;

    const process = execa.command(command, {
      cwd: workspaceFolder.uri.fsPath,
      reject: false
    });

    this.processes.set(document, process);
    const { exitCode, stdout, stderr } = await process;
    this.processes.delete(document);

    // NOTE: The file was modified since the request was sent to check it.
    if (text !== document.getText()) {
      return;
    }

    this.collection.delete(document.uri);
    if (exitCode === 0) {
      return;
    }

    if (exitCode === 1 && stderr.length > 0) {
      console.error(stderr);
      return;
    }

    this.collection.set(document.uri, this.parse(stdout, document));
  }

  private parse(output: string, document: TextDocument): Diagnostic[] {
    const json = JSON.parse(output) as { files: File[] };
    if (json.files.length < 1) {
      return [];
    }

    return json.files[0].offenses.map(offence => {
      const line = Math.max(offence.location.line - 1, 0);
      const lineText = document.lineAt(line);
      const lineTextRange = lineText.range;
      const range = new Range(
        new Position(
          lineTextRange.start.line,
          lineText.firstNonWhitespaceCharacterIndex
        ),
        lineTextRange.end
      );
      const severity =
        offence.severity === "warning"
          ? DiagnosticSeverity.Warning
          : DiagnosticSeverity.Error;

      const diagnostic = new Diagnostic(
        range,
        `${offence.linter_name}: ${offence.message}`,
        severity
      );
      diagnostic.code = CODE;
      return diagnostic;
    });
  }
}
