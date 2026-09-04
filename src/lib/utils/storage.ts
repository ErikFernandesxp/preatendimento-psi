// Caminho no projeto: src/lib/utils/storage.ts (arquivo novo)

/**
 * Normaliza um nome de arquivo para ser usado com segurança como CHAVE de
 * objeto no Supabase Storage.
 *
 * Por que isso existe: o Supabase Storage rejeita chaves com acentos e
 * outros caracteres fora do conjunto seguro (erro "Invalid key"). Um nome
 * como "Planejamento diário.pdf" ou "relatório (final) - cópia.docx"
 * quebra o upload mesmo o arquivo estando dentro do tipo/tamanho
 * permitidos — foi exatamente isso que causou o erro em produção.
 *
 * O nome original do arquivo continua sendo salvo sem alteração na coluna
 * file_name (é o que aparece para o usuário); esta função só afeta o
 * caminho interno usado no Storage.
 */
export function sanitizeFileNameForStorage(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  const hasExt = lastDot > 0 && lastDot < fileName.length - 1;
  const base = hasExt ? fileName.slice(0, lastDot) : fileName;
  const ext = hasExt ? fileName.slice(lastDot + 1) : "";

  const stripAccents = (value: string) =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const cleanBase =
    stripAccents(base)
      .replace(/[^a-zA-Z0-9_.-]+/g, "-") // espaços, parênteses, "ç", "ã" (já sem acento) etc viram "-"
      .replace(/-+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 80) || "arquivo";

  const cleanExt = stripAccents(ext)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
    .slice(0, 10);

  return cleanExt ? `${cleanBase}.${cleanExt}` : cleanBase;
}

/**
 * Monta uma chave de objeto única e seguro dentro de uma "pasta" do bucket
 * (ex.: "activity/{activityId}"), a partir do nome original do arquivo.
 * O sufixo aleatório evita colisão quando dois arquivos com o mesmo nome
 * são enviados no mesmo milissegundo.
 */
export function buildStorageObjectPath(folder: string, originalFileName: string): string {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${folder}/${unique}-${sanitizeFileNameForStorage(originalFileName)}`;
}

/**
 * Extrai uma mensagem de erro legível de um erro do Supabase Storage,
 * já traduzindo os casos mais comuns em vez de mostrar um texto genérico
 * que esconde a causa real.
 */
export function describeStorageError(fileName: string, error: { message?: string } | null): string {
  const raw = error?.message ?? "";

  if (/invalid key/i.test(raw)) {
    return `Não foi possível enviar "${fileName}": o nome do arquivo tem um caractere não aceito pelo servidor de armazenamento.`;
  }
  if (/exceeded the maximum allowed size|payload too large/i.test(raw)) {
    return `Não foi possível enviar "${fileName}": o arquivo excede o tamanho máximo permitido.`;
  }
  if (/mime type|not allowed/i.test(raw)) {
    return `Não foi possível enviar "${fileName}": esse tipo de arquivo não é aceito.`;
  }
  if (/duplicate/i.test(raw)) {
    return `Não foi possível enviar "${fileName}": já existe um arquivo com esse nome.`;
  }

  return raw
    ? `Erro ao enviar "${fileName}": ${raw}`
    : `Erro ao enviar "${fileName}". Tente novamente.`;
}
