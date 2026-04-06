/**
 * MathText — renders plain text normally; renders text containing
 * LaTeX delimiters ($…$ or $$…$$) via a KaTeX WebView.
 *
 * Uses the KaTeX auto-render extension to handle mixed math/text strings.
 */
import { StyleSheet, Text, useWindowDimensions } from "react-native";
import WebView from "react-native-webview";

interface Props {
  /** The text (may contain $…$ or $$…$$ LaTeX) */
  text: string;
  /** Base font size — defaults to 15 */
  fontSize?: number;
  /** Text colour — defaults to #333 */
  color?: string;
}

function hasMath(text: string): boolean {
  return text.includes("$");
}

function buildHtml(text: string, fontSize: number, color: string): string {
  // Escape backticks so we can safely embed in a template literal inside the HTML
  const safe = text.replace(/`/g, "&#96;");

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script defer
  src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script defer
  src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"
  onload="renderMathInElement(document.body, {
    delimiters: [
      {left: '$$', right: '$$', display: true},
      {left: '$',  right: '$',  display: false}
    ]
  })">
</script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, sans-serif;
    font-size: ${fontSize}px;
    color: ${color};
    line-height: 1.6;
    padding: 0 2px;
    background: transparent;
  }
  .katex { font-size: 1em; }
</style>
</head>
<body>${safe}</body>
</html>`;
}

export default function MathText({
  text,
  fontSize = 15,
  color = "#333",
}: Props) {
  const { width } = useWindowDimensions();

  if (!hasMath(text)) {
    return (
      <Text style={[s.plain, { fontSize, color }]}>{text}</Text>
    );
  }

  // Height estimate: roughly 28px per line, min 40px
  const estimatedLines = Math.ceil(text.length / 60) + 1;
  const height = Math.max(40, estimatedLines * (fontSize * 1.8));

  return (
    <WebView
      style={[s.webview, { width: width - 40, height }]}
      source={{ html: buildHtml(text, fontSize, color) }}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      originWhitelist={["*"]}
      // Transparent background so it blends with the screen
      // (iOS: set via style; Android: set opacity)
      backgroundColor="transparent"
    />
  );
}

const s = StyleSheet.create({
  plain: { lineHeight: 24 },
  webview: { backgroundColor: "transparent" },
});
