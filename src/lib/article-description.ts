export function getArticleDescription(
  description: string,
  imageAlt: string,
  imageCreditUrl: string,
): string {
  const metadataLabel = /(?:^|[\s|•·])(?:alt(?:\s+text)?|texto alternativo|cr[eé]dito(?:\s+da\s+imagem)?|fonte\s+da\s+imagem)\s*:/iu;
  const metadataValues = [imageAlt, imageCreditUrl].filter(Boolean);

  return description
    .split(/\r?\n/)
    .map((line) => {
      const labelMatch = metadataLabel.exec(line);
      const content = labelMatch ? line.slice(0, labelMatch.index).trim() : line;
      return metadataValues.reduce(
        (cleaned, value) => cleaned.replaceAll(value, ""),
        content,
      );
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
