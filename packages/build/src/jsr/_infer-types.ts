import type { CommentStatement, SourceFile, Node as TsNode } from 'ts-morph'
import { join } from 'node:path'

let tsMorph: typeof import('ts-morph') | undefined

const MAGIC_COMMENT = '<deno-infer-type>'

function maybeFixImportedType(file: SourceFile, code: string) {
  // eslint-disable-next-line ts/no-non-null-assertion
  const { ts } = tsMorph!

  // todo: is there a better way to do this?
  // ts-morph (and probably ts compiler host actually) returns import()-ed files as absolute paths
  // we want them to be relative to the file they're imported in + add .ts extension for deno
  if (!code.includes('import(')) return code // fast path

  const project = file.getProject()
  const tmpFile = project.createSourceFile('tmp.ts', `const a: ${code}`, { overwrite: true })
  const expr = tmpFile.getStatements()[0]
    .asKindOrThrow(ts.SyntaxKind.VariableStatement)
    .getDeclarations()[0]
    .getTypeNodeOrThrow()

  let changed = false

  const fixNode = (node: TsNode) => {
    function fixStringLiteral(node: TsNode) {
      if (!node.isKind(ts.SyntaxKind.StringLiteral)) {
        return
      }

      let text = node.getLiteralText()
      let textChanged = false

      if (text[0] !== '.') {
        // relative path
        text = file.getRelativePathAsModuleSpecifierTo(text)
        textChanged = true
      }

      if (!text.match(/\.[a-z0-9]+$/)) {
        text += '.ts'
        textChanged = true
      }

      if (textChanged) {
        node.replaceWithText(JSON.stringify(text))
        changed = true
      }
    }

    switch (true) {
      case node.isKind(ts.SyntaxKind.ImportType): {
        const arg = node.getArgument()
        if (!arg.isKind(ts.SyntaxKind.LiteralType)) break
        fixStringLiteral(arg.getLiteral())
        break
      }
      case node.isKind(ts.SyntaxKind.CallExpression): {
        if (!node.getExpression().isKind(ts.SyntaxKind.ImportKeyword)) break

        const arg = node.getArguments()[0]
        fixStringLiteral(arg)
        break
      }
    }
  }

  fixNode(expr)
  if (!changed) expr.forEachDescendant(fixNode)

  if (changed) {
    const newCode = expr.print()
    project.removeSourceFile(tmpFile)
    return newCode
  }

  project.removeSourceFile(tmpFile)
  return code
}

function processFile(file: SourceFile) {
  // eslint-disable-next-line ts/no-non-null-assertion
  const { ts, CommentStatement } = tsMorph!

  if (!file.getText().includes(MAGIC_COMMENT)) {
    return
  }

  const commentStatementsToRemove: CommentStatement[] = []
  for (const stmt of file.getStatementsWithComments()) {
    if (stmt instanceof CommentStatement && stmt.getText().includes(MAGIC_COMMENT)) {
      commentStatementsToRemove.push(stmt)
      continue
    }

    let skip = true
    for (const comment of stmt.getLeadingCommentRanges()) {
      if (comment.getText().includes(MAGIC_COMMENT)) {
        skip = false
        break
      }
    }
    if (skip) continue

    switch (true) {
      case stmt.isKind(ts.SyntaxKind.VariableStatement): {
        const decls = stmt.getDeclarations()
        for (const decl of decls) {
          decl.setType(maybeFixImportedType(file, decl.getType().getText(decl)))
        }
        break
      }
      default:
        throw new Error(`<deno-infer-type> used on an unsupported statement: ${stmt.getKindName()} (at ${file.getFilePath()}:${stmt.getStartLineNumber()})`)
    }
  }

  for (const stmt of commentStatementsToRemove) {
    stmt.remove()
  }
}

export async function applyInferTypesDirectives(
  packageOutRoot: string,
  tsFiles: string[],
) {
  if (!tsMorph) {
    tsMorph = await import('ts-morph')
  }

  const { Project, ModuleKind, ts, ScriptTarget } = tsMorph

  const project = new Project({
    compilerOptions: {
      allowJs: true,
      esModuleInterop: true,
      experimentalDecorators: false,
      inlineSourceMap: true,
      isolatedModules: true,
      jsx: ts.JsxEmit.React,
      module: ModuleKind.ESNext,
      moduleDetection: ts.ModuleDetectionKind.Force,
      strict: true,
      target: ScriptTarget.ESNext,
      useDefineForClassFields: true,
    },
  })

  const files = project.addSourceFilesAtPaths(tsFiles.map(it => join(packageOutRoot, it)))
  project.resolveSourceFileDependencies()
  for (const file of files) {
    processFile(file)
  }

  await project.save()
}
