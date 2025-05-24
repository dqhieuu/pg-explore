import { Program } from "@/lib/codemirror/dbml/language/lezer-parser.terms.ts";
import { parser } from "@/lib/codemirror/dbml/language/lezer-parser.ts";
import { CompletionContext, completeFromList } from "@codemirror/autocomplete";
import {
  LanguageSupport,
  foldInside,
  foldNodeProp,
  syntaxTree,
} from "@codemirror/language";
import { LRLanguage } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { ParserConfig } from "@lezer/lr";

const parserConfig: ParserConfig = {
  props: [
    styleTags({
      // Top level declaration
      Project: t.keyword,
      Table: t.keyword,
      Indexes: t.keyword,
      Ref: t.keyword,
      Enum: t.keyword,
      TablePartial: t.keyword,
      TableGroup: t.keyword,
      Note: t.keyword,

      // Option keywords
      Primary: t.keyword,
      Key: t.keyword,
      Pk: t.keyword,
      Not: t.keyword,
      Null: t.keyword,
      Unique: t.keyword,
      Default: t.keyword,
      Increment: t.keyword,
      Type: t.keyword,
      Color: t.keyword,
      Headercolor: t.keyword,
      Delete: t.keyword,
      Update: t.keyword,

      // Relations
      OneToMany: t.keyword,
      ManyToMany: t.keyword,
      ManyToOne: t.keyword,
      OneToOne: t.keyword,

      // Comments
      LineComment: t.lineComment,
      BlockComment: t.blockComment,

      // Literals
      BooleanType: t.bool,
      String: t.string,
      Number: t.number,

      // Var name
      Identifier: t.variableName,

      // Brackets
      "( )": t.paren,
      "{ }": t.brace,
      "[ ]": t.squareBracket,

      // Others
      TablePartialReferenceKeyword: t.keyword,
      "ColumnDataType/...": t.keyword,
    }),
    foldNodeProp.add({
      ProjectBody: foldInside,
      TableBody: foldInside,
      TableGroupBody: foldInside,
      IndexBody: foldInside,
      NoteBody: foldInside,
    }),
  ],
};

const parserDefinition = LRLanguage.define({
  parser: parser.configure(parserConfig),
});

const autocompletion = parserDefinition.data.of({
  autocomplete: (context: CompletionContext) => {
    const currentNode = syntaxTree(context.state).resolveInner(context.pos, -1);
    const parent = currentNode?.parent?.parent;
    const prevSibling = currentNode?.prevSibling;
    if (!parent) return null;

    if (parent.type.id === Program && prevSibling == null) {
      return topLevelDeclSuggester(context);
    }
  },
});

export const dbmlParser = new LanguageSupport(parserDefinition, [
  autocompletion,
]);

const topLevelDeclSuggester = completeFromList([
  {
    label: "Project",
    type: "keyword",
  },
  {
    label: "Table",
    type: "keyword",
  },
  {
    label: "Ref",
    type: "keyword",
  },
  {
    label: "Enum",
    type: "keyword",
  },
  {
    label: "TablePartial",
    type: "keyword",
  },
  {
    label: "TableGroup",
    type: "keyword",
  },
  {
    label: "Note",
    type: "keyword",
  },
]);
