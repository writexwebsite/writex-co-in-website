import { randomInt } from "crypto";

const testIdCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const passwordUppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const passwordLowercase = "abcdefghijkmnopqrstuvwxyz";
const passwordNumbers = "23456789";
const passwordSymbols = "!@#$%*-_+=";
const passwordCharacters =
  passwordUppercase + passwordLowercase + passwordNumbers + passwordSymbols;

function randomCharacter(characters: string) {
  return characters[randomInt(characters.length)];
}

function shuffle(value: string[]) {
  for (let index = value.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [value[index], value[swapIndex]] = [value[swapIndex], value[index]];
  }
  return value;
}

export function generateClientTestId() {
  const suffix = Array.from({ length: 10 }, () =>
    randomCharacter(testIdCharacters)
  ).join("");
  return `WX-TEST-${suffix}`;
}

export function generateClientTestPassword(length = 24) {
  const safeLength = Math.max(16, Math.min(length, 64));
  const characters = [
    randomCharacter(passwordUppercase),
    randomCharacter(passwordLowercase),
    randomCharacter(passwordNumbers),
    randomCharacter(passwordSymbols)
  ];

  while (characters.length < safeLength) {
    characters.push(randomCharacter(passwordCharacters));
  }

  return shuffle(characters).join("");
}

export function isStrongClientTestPassword(value: string) {
  return (
    value.length >= 16 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[!@#$%*\-_+=]/.test(value)
  );
}
