import { foldInside, foldNodeProp } from "@codemirror/language";
import { LRLanguage } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";

import { parser } from "./dbml-lezer/parser.ts";

const parserWithMetadata = parser.configure({
  props: [
    styleTags({
      Identifier: t.variableName,
      Boolean: t.bool,
      String: t.string,
      Number: t.number,
      LineComment: t.lineComment,
      BlockComment: t.blockComment,
      "( )": t.paren,
      "{ }": t.brace,
      "[ ]": t.squareBracket,
    }),
    foldNodeProp.add({
      TableDeclaration: foldInside,
    }),
  ],
});

export const dbmlParser = LRLanguage.define({
  parser: parserWithMetadata,
});
