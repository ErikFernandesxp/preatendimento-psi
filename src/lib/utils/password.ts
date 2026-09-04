import { randomInt } from "crypto";

const WORDS = [
  "azul", "verde", "sol", "lua", "rio", "flor", "mar", "luz", "paz", "voo",
  "trilha", "campo", "vale", "brisa", "onda", "raiz", "folha", "pedra", "chuva", "aurora",
];

/**
 * Gera uma senha temporária fácil de ler e digitar (para o psicólogo
 * repassar por WhatsApp/SMS), mas com entropia suficiente:
 * "palavra-palavra-1234" (~10^12 combinações).
 */
export function generateTempPassword(): string {
  const w1 = WORDS[randomInt(WORDS.length)];
  const w2 = WORDS[randomInt(WORDS.length)];
  const digits = randomInt(1000, 10000);
  return `${w1}-${w2}-${digits}`;
}
