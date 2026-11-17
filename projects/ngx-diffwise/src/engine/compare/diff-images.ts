import { comparisonImage } from './comparison-image';
import { unchangedTokens } from './diff-words';
import { IMAGE_CHARACTER } from '../html/reader-text';
import {
  ChangeDetailKind,
  type DescribedChanges,
  type DiffOptions,
  type ImageChangeDetail,
  type ImageProperties,
  ImageProperty,
  type LineContent,
  type LineImage,
  type MarkedRange,
  type TextRange,
  type ChangedText,
} from '../model';

const IMAGE_PROPERTIES = Object.values(ImageProperty);

const NO_IMAGE_CHANGES: DescribedChanges = { oldRanges: [], newRanges: [], details: [] };

/** An image of one side and its place among the unchanged words. */
interface ImagePlace {
  readonly image: LineImage;
  /** True when the image is part of the changed text. */
  readonly isChanged: boolean;
  /** Unchanged tokens before the image; the same number on both sides means the same place. */
  readonly unchangedBefore: number;
}

/** An image of the old line and an image of the new line in the same place. */
interface ImagePair {
  readonly oldImage: LineImage;
  readonly newImage: LineImage;
}

/**
 * Describes the images of a changed line pair that differ: the same file with another size or
 * alternative text, and an image removed and another added in the same place.
 */
export function diffImages(
  oldLine: LineContent,
  newLine: LineContent,
  wordChanges: ChangedText,
  options: DiffOptions,
): DescribedChanges {
  if (oldLine.images.length === 0 || newLine.images.length === 0) {
    return NO_IMAGE_CHANGES;
  }

  const oldPlaces = imagePlaces(oldLine, wordChanges.removed);
  const newPlaces = imagePlaces(newLine, wordChanges.added);
  const pairs = [...unchangedPairs(oldPlaces, newPlaces), ...replacedPairs(oldPlaces, newPlaces)];
  const pairsInReadingOrder = pairs.sort(byOldPosition);

  return describePairs(pairsInReadingOrder, options);
}

/** Images of one side with their places among the unchanged tokens. */
function imagePlaces(
  { text, images }: LineContent,
  changedText: readonly TextRange[],
): ImagePlace[] {
  const unchangedStarts = unchangedTokens(text, changedText).map((token) => token.start);

  return images.map((image) => ({
    image,
    isChanged: isInsideAny(image.position, changedText),
    unchangedBefore: countBefore(unchangedStarts, image.position),
  }));
}

/** True when the position lies inside one of the ranges. */
function isInsideAny(position: number, ranges: readonly TextRange[]): boolean {
  return ranges.some((range) => range.start <= position && position < range.end);
}

/** How many of the positions come before the given one. */
function countBefore(positions: readonly number[], position: number): number {
  return positions.filter((start) => start < position).length;
}

/** Images outside the changed text, paired in order; both sides keep the same files. */
function unchangedPairs(
  oldPlaces: readonly ImagePlace[],
  newPlaces: readonly ImagePlace[],
): ImagePair[] {
  const oldImages = unchangedImages(oldPlaces);
  const newImages = unchangedImages(newPlaces);
  const pairCount = Math.min(oldImages.length, newImages.length);

  return Array.from({ length: pairCount }, (_, index) => ({
    oldImage: oldImages[index],
    newImage: newImages[index],
  }));
}

/** Removed and added images in the same place, paired in order: each pair is a replaced image. */
function replacedPairs(
  oldPlaces: readonly ImagePlace[],
  newPlaces: readonly ImagePlace[],
): ImagePair[] {
  const addedImagesByPlace = groupByPlace(changedPlaces(newPlaces));
  const pairs: ImagePair[] = [];

  for (const { image, unchangedBefore } of changedPlaces(oldPlaces)) {
    const newImage = addedImagesByPlace.get(unchangedBefore)?.shift();

    if (newImage !== undefined) {
      pairs.push({ oldImage: image, newImage });
    }
  }

  return pairs;
}

/** The images of the places whose image did not change. */
function unchangedImages(places: readonly ImagePlace[]): LineImage[] {
  return places.filter((place) => !place.isChanged).map((place) => place.image);
}

/** The places whose image changed. */
function changedPlaces(places: readonly ImagePlace[]): ImagePlace[] {
  return places.filter((place) => place.isChanged);
}

/** Images grouped by their place among the unchanged tokens, each group in reading order. */
function groupByPlace(places: readonly ImagePlace[]): Map<number, LineImage[]> {
  const groups = new Map<number, LineImage[]>();

  for (const { image, unchangedBefore } of places) {
    const group = groups.get(unchangedBefore) ?? [];

    group.push(image);
    groups.set(unchangedBefore, group);
  }

  return groups;
}

/** Orders pairs of images by the position of the old image. */
function byOldPosition(first: ImagePair, second: ImagePair): number {
  return first.oldImage.position - second.oldImage.position;
}

/** Details of the pairs that differ, and a range around each of their images. */
function describePairs(pairs: readonly ImagePair[], options: DiffOptions): DescribedChanges {
  const oldRanges: MarkedRange[] = [];
  const newRanges: MarkedRange[] = [];
  const details: ImageChangeDetail[] = [];

  for (const { oldImage, newImage } of pairs) {
    const detail = imageChange(oldImage.properties, newImage.properties, options);

    if (detail === null) {
      continue;
    }

    const detailIndices = [details.length];

    details.push(detail);
    oldRanges.push(imageRange(oldImage, detailIndices));
    newRanges.push(imageRange(newImage, detailIndices));
  }

  return { oldRanges, newRanges, details };
}

/** The change between two images in the same place; `null` when a reader sees no difference. */
function imageChange(
  oldImage: ImageProperties,
  newImage: ImageProperties,
  options: DiffOptions,
): ImageChangeDetail | null {
  const comparedOldImage = comparisonImage(oldImage, options);
  const comparedNewImage = comparisonImage(newImage, options);
  const changedProperties = IMAGE_PROPERTIES.filter(
    (name) => comparedOldImage[name] !== comparedNewImage[name],
  );

  if (changedProperties.length === 0) {
    return null;
  }

  return { kind: ChangeDetailKind.Image, oldImage, newImage, changedProperties };
}

/** A range around the image's character that points to its change detail. */
function imageRange(image: LineImage, detailIndices: readonly number[]): MarkedRange {
  return { start: image.position, end: image.position + IMAGE_CHARACTER.length, detailIndices };
}
