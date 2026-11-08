const LIST_PATTERNS = {
  unordered: /^(?:[-*•])\s+(.+)$/,
  ordered: /^\d+[.)]\s+(.+)$/
};

function inlineToken(type, value) {
  return { type, value };
}

function tokenizeInline(value) {
  const tokens = [];
  let textStart = 0;
  let cursor = 0;

  const pushText = end => {
    if (end > textStart) tokens.push(inlineToken("text", value.slice(textStart, end)));
  };

  while (cursor < value.length) {
    let marker = null;
    let type = null;

    if (value.startsWith("**", cursor)) {
      marker = "**";
      type = "strong";
    } else if (value.startsWith("__", cursor)) {
      marker = "__";
      type = "strong";
    } else if (value[cursor] === "`") {
      marker = "`";
      type = "code";
    } else if ((value[cursor] === "*" || value[cursor] === "_") && value[cursor + 1] !== value[cursor]) {
      marker = value[cursor];
      type = "em";
    }

    if (!marker) {
      cursor += 1;
      continue;
    }

    const closing = value.indexOf(marker, cursor + marker.length);
    if (closing <= cursor + marker.length) {
      cursor += marker.length;
      continue;
    }

    pushText(cursor);
    tokens.push(inlineToken(type, value.slice(cursor + marker.length, closing)));
    cursor = closing + marker.length;
    textStart = cursor;
  }

  pushText(value.length);
  return tokens.length ? tokens : [inlineToken("text", value)];
}

export function formatChatMessage(value) {
  const normalized = String(value ?? "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const blocks = [];
  let paragraphLines = [];
  let list = null;

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push({
      type: "paragraph",
      content: tokenizeInline(paragraphLines.join("\n"))
    });
    paragraphLines = [];
  };

  const flushList = () => {
    if (!list) return;
    blocks.push({
      type: `${list.type}-list`,
      items: list.items
    });
    list = null;
  };

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+?)\s*#*$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        content: tokenizeInline(heading[2])
      });
      continue;
    }

    const listMatch = line.match(LIST_PATTERNS.unordered) ?? line.match(LIST_PATTERNS.ordered);
    if (listMatch) {
      flushParagraph();
      const type = line.match(LIST_PATTERNS.unordered) ? "unordered" : "ordered";
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push(tokenizeInline(listMatch[1]));
      continue;
    }

    flushList();
    paragraphLines.push(rawLine.trimEnd());
  }

  flushParagraph();
  flushList();
  return blocks;
}
