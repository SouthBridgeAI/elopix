import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

interface ExistingComparison {
  imageAId: string;
  imageBId: string;
  chosenImageId: string | null;
  timestamp: number;
}

interface Image {
  id: string;
  src: string;
  initialRating: number;
  currentRating: number;
  comparisons: number;
  wins: number;
  losses: number;
  ties: number;
}

interface UserData {
  user: {
    id: string;
    [key: string]: unknown;
  };
  session: {
    id: string;
    [key: string]: unknown;
  };
  comparisons: ExistingComparison[];
  images: Image[]; // Added this line
}

interface ImageMapping {
  [id: string]: string;
}

function getImageHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

function decodeBase64Image(base64String: string): Buffer {
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 string");
  }
  return Buffer.from(matches[2], "base64");
}

function fuzzyMatch(hash1: string, hash2: string, threshold: number): boolean {
  let differences = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      differences++;
    }
    if (differences > threshold) {
      return false;
    }
  }
  return true;
}

function matchImages(
  imageFolderPath: string,
  jsonFilePath: string,
  outputFilePath: string
): void {
  // Read and parse the JSON file
  const jsonData: UserData = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));

  // Get all image files from the folder
  const imageFiles = fs
    .readdirSync(imageFolderPath)
    .filter((file) => /\.(jpg|jpeg|png|gif)$/i.test(file));

  const matchedImages: ImageMapping = {};
  const unmatchedImages: string[] = [];

  // Calculate hashes for all images in the folder
  const folderImageHashes = imageFiles.reduce((acc, file) => {
    const filePath = path.join(imageFolderPath, file);
    acc[file] = getImageHash(filePath);
    return acc;
  }, {} as { [filename: string]: string });

  // Match images from JSON with files in the folder
  for (const image of jsonData.images) {
    const base64Data = decodeBase64Image(image.src);
    const jsonImageHash = crypto
      .createHash("sha256")
      .update(base64Data)
      .digest("hex");

    let matched = false;
    for (const [filename, hash] of Object.entries(folderImageHashes)) {
      if (hash === jsonImageHash) {
        matchedImages[image.id] = filename;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Try fuzzy matching
      for (const [filename, hash] of Object.entries(folderImageHashes)) {
        if (fuzzyMatch(jsonImageHash, hash, 5)) {
          // Allow up to 5 differences
          matchedImages[image.id] = filename;
          matched = true;
          console.log(`Fuzzy matched: ${image.id} to ${filename}`);
          break;
        }
      }
    }

    if (!matched) {
      unmatchedImages.push(image.id);
    }
  }

  // Write the mapping to a new JSON file
  fs.writeFileSync(outputFilePath, JSON.stringify(matchedImages, null, 2));

  console.log("Matching complete. Mapping file created:", outputFilePath);
  console.log("Matched images:", matchedImages);
  console.log("Unmatched images:", unmatchedImages);
  console.log("Number of unmatched images:", unmatchedImages.length);
}

// Usage
const imageFolderPath =
  __dirname + "/../../public/comparison-images/diagen-process";
const jsonFilePath =
  __dirname +
  "/../../public/comparison-images/diagen-process/existing_data.json";
const outputFilePath =
  __dirname + "/../../public/comparison-images/diagen-process/unscramble2.json";
matchImages(imageFolderPath, jsonFilePath, outputFilePath);
