/**
 * Attachments for the demo conversation, generated rather than checked in: the
 * repo stays free of binaries and every file is a real one, so the image bubbles
 * render, the PDF opens and the audio player finds frames to decode.
 */
import { crc32, deflateSync } from "zlib";

export interface Attachment {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_BIT_DEPTH = 8;
const PNG_COLOUR_TYPE_RGB = 2;

function pngChunk(type: string, payload: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), payload]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

type Painter = (x: number, y: number) => [number, number, number];

function encodePng(width: number, height: number, paint: Painter): Buffer {
  // Each scanline is a filter byte (0 = none) followed by RGB triplets.
  const raw = Buffer.alloc(height * (1 + width * 3));
  let cursor = 0;
  for (let y = 0; y < height; y++) {
    raw[cursor++] = 0;
    for (let x = 0; x < width; x++) {
      const [red, green, blue] = paint(x, y);
      raw[cursor++] = red;
      raw[cursor++] = green;
      raw[cursor++] = blue;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = PNG_BIT_DEPTH;
  header[9] = PNG_COLOUR_TYPE_RGB;

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Deterministic speckle, so flat fills read as soil and foliage. */
function grain(x: number, y: number): number {
  return ((x * 7 + y * 13) % 23) - 11;
}

const GARDEN_WIDTH = 640;
const GARDEN_HEIGHT = 420;
const GARDEN_HORIZON = 170;

function paintGarden(x: number, y: number): [number, number, number] {
  if (y < GARDEN_HORIZON) {
    // Sky, paling towards the horizon.
    const depth = y / GARDEN_HORIZON;
    return [150 + depth * 70, 185 + depth * 55, 225 + depth * 25];
  }
  const speckle = grain(x, y);
  const isTilledSquare = y > 250 && x > 150 && x < 490;
  return isTilledSquare
    ? [120 + speckle, 82 + speckle, 54 + speckle]
    : [74 + speckle, 124 + speckle, 58 + speckle];
}

export function gardenPhoto(): Attachment {
  return {
    fileName: "carre-potager.png",
    mimeType: "image/png",
    bytes: encodePng(GARDEN_WIDTH, GARDEN_HEIGHT, paintGarden),
  };
}

const POSTER_WIDTH = 560;
const POSTER_HEIGHT = 740;

interface PosterBlock {
  top: number;
  height: number;
  left: number;
  right: number;
  ink: [number, number, number];
}

// A printed flyer seen as a thumbnail: title block, body lines, illustration.
const POSTER_BLOCKS: PosterBlock[] = [
  { top: 56, height: 54, left: 56, right: 504, ink: [193, 62, 47] },
  { top: 138, height: 20, left: 56, right: 430, ink: [64, 62, 58] },
  { top: 174, height: 20, left: 56, right: 468, ink: [64, 62, 58] },
  { top: 210, height: 20, left: 56, right: 372, ink: [64, 62, 58] },
  { top: 274, height: 190, left: 56, right: 504, ink: [122, 148, 118] },
  { top: 500, height: 20, left: 56, right: 452, ink: [64, 62, 58] },
  { top: 536, height: 20, left: 56, right: 398, ink: [64, 62, 58] },
  { top: 640, height: 10, left: 56, right: 504, ink: [193, 62, 47] },
];

const POSTER_PAPER: [number, number, number] = [246, 241, 230];

function paintPoster(x: number, y: number): [number, number, number] {
  const block = POSTER_BLOCKS.find(
    (candidate) =>
      y >= candidate.top &&
      y < candidate.top + candidate.height &&
      x >= candidate.left &&
      x < candidate.right,
  );
  return block ? block.ink : POSTER_PAPER;
}

export function fleaMarketPoster(): Attachment {
  return {
    fileName: "affiche-troc-plantes.png",
    mimeType: "image/png",
    bytes: encodePng(POSTER_WIDTH, POSTER_HEIGHT, paintPoster),
  };
}

const REPORT_LINES = [
  "Jardin partagé de la rue Lepic",
  "Compte rendu de la réunion du 12 mars",
  "",
  "1. Répartition des parcelles",
  "Les seize carrés restent attribués à l'année. Trois sont libérés",
  "en avril et seront proposés aux foyers inscrits sur liste d'attente.",
  "",
  "2. Compost",
  "La régie de quartier livre gratuitement du compost mûr rue Ordener,",
  "sur présentation d'un justificatif de domicile.",
  "",
  "3. Arrosage",
  "Le tour d'arrosage estival est reconduit : un binôme par semaine,",
  "planning affiché sur le portail et relayé dans la messagerie.",
  "",
  "4. Prochaine réunion",
  "Samedi 6 avril à 10h, dans le local associatif.",
];

const PDF_PAGE_WIDTH = 595;
const PDF_PAGE_HEIGHT = 842;
const PDF_MARGIN = 60;
const PDF_FONT_SIZE = 12;
const PDF_LINE_HEIGHT = 18;

function pdfString(line: string): string {
  return line.replace(/([\\()])/g, "\\$1");
}

function reportContentStream(): string {
  const body = REPORT_LINES.map((line) => `(${pdfString(line)}) Tj T*`).join(
    "\n",
  );
  const firstBaseline = PDF_PAGE_HEIGHT - PDF_MARGIN;
  return [
    "BT",
    `/F1 ${PDF_FONT_SIZE} Tf`,
    `${PDF_MARGIN} ${firstBaseline} Td`,
    `${PDF_LINE_HEIGHT} TL`,
    body,
    "ET",
  ].join("\n");
}

/** Objects are numbered from 1 in array order; object 1 must be the catalog. */
function assemblePdf(objects: string[]): Buffer {
  const parts = [Buffer.from("%PDF-1.4\n", "latin1")];
  const offsets: number[] = [];
  let cursor = parts[0].length;

  objects.forEach((body, index) => {
    const object = Buffer.from(
      `${index + 1} 0 obj\n${body}\nendobj\n`,
      "latin1",
    );
    offsets.push(cursor);
    cursor += object.length;
    parts.push(object);
  });

  const size = objects.length + 1;
  const table = [
    `xref\n0 ${size}\n`,
    "0000000000 65535 f \n",
    ...offsets.map(
      (offset) => `${String(offset).padStart(10, "0")} 00000 n \n`,
    ),
  ].join("");
  parts.push(
    Buffer.from(
      `${table}trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF\n`,
      "latin1",
    ),
  );

  return Buffer.concat(parts);
}

export function meetingReportPdf(): Attachment {
  const stream = reportContentStream();
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] ` +
      "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
  ];
  return {
    fileName: "compte-rendu-reunion-jardin.pdf",
    mimeType: "application/pdf",
    bytes: assemblePdf(objects),
  };
}

// MPEG-1 Layer III, 128 kbps, 44.1 kHz, mono — 417 bytes per 26 ms frame.
const MP3_FRAME_HEADER = [0xff, 0xfb, 0x90, 0xc0];
const MP3_FRAME_BYTES = 417;
const MP3_FRAME_COUNT = 96;

/** Silent frames: a decodable file that stays far below the 5 MB audio cap. */
export function voiceNote(): Attachment {
  const frame = Buffer.alloc(MP3_FRAME_BYTES);
  Buffer.from(MP3_FRAME_HEADER).copy(frame);
  return {
    fileName: "message-vocal.mp3",
    mimeType: "audio/mpeg",
    bytes: Buffer.concat(Array.from({ length: MP3_FRAME_COUNT }, () => frame)),
  };
}

const AVATAR_SIZE = 192;

/** Two hues a third of the wheel apart read as distinct at thumbnail size. */
function hueFromSeed(seed: string): number {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

function hueToRgb(
  hue: number,
  saturation: number,
  lightness: number,
): [number, number, number] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = lightness - chroma / 2;
  const [r, g, b] =
    hue < 60
      ? [chroma, second, 0]
      : hue < 120
        ? [second, chroma, 0]
        : hue < 180
          ? [0, chroma, second]
          : hue < 240
            ? [0, second, chroma]
            : hue < 300
              ? [second, 0, chroma]
              : [chroma, 0, second];
  return [
    Math.round((r + match) * 255),
    Math.round((g + match) * 255),
    Math.round((b + match) * 255),
  ];
}

/**
 * A profile picture per account, derived from the email so a reseed produces the
 * same face. Nobody uploads one during a demo, and a wall of identical initials
 * makes the neighbour lists look unfinished.
 */
export function avatarFor(seed: string): Attachment {
  const hue = hueFromSeed(seed);
  const background = hueToRgb(hue, 0.55, 0.86);
  const foreground = hueToRgb((hue + 120) % 360, 0.5, 0.42);
  const centre = AVATAR_SIZE / 2;
  const headRadius = AVATAR_SIZE * 0.17;
  const headCentreY = AVATAR_SIZE * 0.38;
  const shoulderTop = AVATAR_SIZE * 0.64;
  const shoulderRadius = AVATAR_SIZE * 0.3;

  return {
    fileName: `avatar-${seed.split("@")[0]}.png`,
    mimeType: "image/png",
    bytes: encodePng(AVATAR_SIZE, AVATAR_SIZE, (x, y) => {
      const head =
        (x - centre) ** 2 + (y - headCentreY) ** 2 <= headRadius ** 2;
      const shoulders =
        y >= shoulderTop &&
        (x - centre) ** 2 + (y - shoulderTop) ** 2 <= shoulderRadius ** 2;
      return head || shoulders ? foreground : background;
    }),
  };
}
