import { format, formatDistanceToNow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatDate(value: string | Date, pattern = "dd/MM/yyyy") {
  return format(new Date(value), pattern, { locale: ptBR });
}

export function formatDateTime(value: string | Date) {
  return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatRelative(value: string | Date) {
  return formatDistanceToNow(new Date(value), { locale: ptBR, addSuffix: true });
}

export function isOverdue(dueDate: string | Date | null) {
  if (!dueDate) return false;
  return isPast(new Date(dueDate));
}

export const patientActivityStatusLabel: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  submitted: "Enviada",
  viewed: "Visualizada",
  closed: "Encerrada",
  overdue: "Atrasada",
};

export const activityResponseTypeLabel: Record<string, string> = {
  free_text: "Texto livre",
  objective_yes_no: "Sim / Não",
  objective_scale: "Escala",
  objective_multiple_choice: "Múltipla escolha",
  objective_single_choice: "Seleção única",
  diary: "Diário",
  image_upload: "Upload de imagem",
  file_upload: "Upload de arquivo",
};

export const patientStatusLabel: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

/**
 * Formata o "value" salvo em responses.structured_response (Sim/Não,
 * nota de escala, ou opção(ões) escolhida(s)) para exibição simples.
 */
export function formatStructuredValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}