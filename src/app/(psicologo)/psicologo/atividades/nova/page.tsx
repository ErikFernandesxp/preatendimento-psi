"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Toggle } from "@/components/ui/Toggle";
import { ActivityAttachments } from "@/components/activities/ActivityAttachments";
import type { ActivityResponseType } from "@/types/database.types";

const RESPONSE_TYPES: { value: ActivityResponseType; label: string }[] = [
  { value: "free_text", label: "Texto livre" },
  { value: "diary", label: "Diário" },
  { value: "objective_yes_no", label: "Sim / Não" },
  { value: "objective_scale", label: "Escala" },
  { value: "objective_multiple_choice", label: "Múltipla escolha" },
  { value: "objective_single_choice", label: "Seleção única" },
  { value: "image_upload", label: "Upload de imagem" },
  { value: "file_upload", label: "Upload de arquivo" },
];

export default function NovaAtividadePage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [responseType, setResponseType] = useState<ActivityResponseType>("free_text");
  const [choiceOptions, setChoiceOptions] = useState("");
  const [scaleMin, setScaleMin] = useState(1);
  const [scaleMax, setScaleMax] = useState(5);
  const [isRequired, setIsRequired] = useState(true);
  const [allowMessage, setAllowMessage] = useState(true);
  const [allowAttachments, setAllowAttachments] = useState(true);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(20);
  const [dueDateOffsetDays, setDueDateOffsetDays] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Depois que a atividade é criada, mostramos o passo de anexos na
  // mesma página (em vez de já navegar embora), para o psicólogo poder
  // anexar material de apoio (PDF, foto, vídeo...) na hora.
  const [createdActivityId, setCreatedActivityId] = useState<string | null>(null);

  const needsChoiceOptions =
    responseType === "objective_multiple_choice" || responseType === "objective_single_choice";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: profile } = await supabase.auth.getUser();
    if (!profile.user) {
      setError("Sessão expirada. Faça login novamente.");
      setLoading(false);
      return;
    }

    const { data: psychologist } = await supabase
      .from("psychologists")
      .select("id")
      .single();

    if (!psychologist) {
      setError("Perfil de psicólogo não encontrado.");
      setLoading(false);
      return;
    }

    let response_options: Record<string, unknown> | null = null;
    if (needsChoiceOptions) {
      response_options = {
        options: choiceOptions
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean),
      };
    } else if (responseType === "objective_scale") {
      response_options = { min: scaleMin, max: scaleMax };
    }

    const { data: activity, error: insertError } = await supabase
      .from("activities")
      .insert({
        psychologist_id: psychologist.id,
        title,
        description: description || null,
        instructions: instructions || null,
        response_type: responseType,
        response_options,
        allow_message: allowMessage,
        allow_attachments: allowAttachments,
        max_file_size_mb: maxFileSizeMb || 10,
        is_required: isRequired,
        due_date_offset_days: dueDateOffsetDays || null,
        status: "draft",
      })
      .select()
      .single();

    if (insertError || !activity) {
      setError("Erro ao criar a atividade.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setCreatedActivityId(activity.id);
  }

  if (createdActivityId) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Atividade criada</h1>
          <p className="text-sm text-slate-500">
            Se quiser, anexe material de apoio para o paciente usar nesta atividade
            (PDF, foto, vídeo...). Isso é opcional.
          </p>
        </div>

        <Card>
          <ActivityAttachments
            activityId={createdActivityId}
            initialAttachments={[]}
            description="Esses arquivos ficam disponíveis para todos os pacientes que receberem esta atividade."
          />
        </Card>

        <div className="flex gap-3">
          <Button onClick={() => router.push("/psicologo/atividades")}>Concluir</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Nova atividade</h1>
        <p className="text-sm text-slate-500">
          Crie um modelo de atividade para enviar aos seus pacientes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Sobre a atividade
          </p>

          <div>
            <FieldLabel required htmlFor="title">
              Título
            </FieldLabel>
            <input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reflexão semanal"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <FieldLabel htmlFor="description" hint="Um resumo curto que aparece na sua lista de atividades. O paciente também vê.">
              Descrição
            </FieldLabel>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <FieldLabel
              htmlFor="instructions"
              hint="O texto principal que o paciente lê antes de responder — explique aqui o que você quer que ele faça."
            >
              Instruções para o paciente
            </FieldLabel>
            <textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Ex: Como você se sentiu durante esta semana?"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-5 border-t border-slate-100 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Formato da resposta
          </p>

          <div>
            <FieldLabel
              required
              htmlFor="responseType"
              hint="Define o formato principal da resposta (texto, escala, sim/não etc). Mensagem e anexo, logo abaixo, funcionam à parte disso."
            >
              Tipo de resposta principal
            </FieldLabel>
            <select
              id="responseType"
              value={responseType}
              onChange={(e) => setResponseType(e.target.value as ActivityResponseType)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {RESPONSE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {needsChoiceOptions && (
            <div>
              <FieldLabel required htmlFor="choiceOptions">
                Opções (uma por linha)
              </FieldLabel>
              <textarea
                id="choiceOptions"
                value={choiceOptions}
                onChange={(e) => setChoiceOptions(e.target.value)}
                rows={3}
                placeholder={"Ótimo\nBom\nRegular\nRuim"}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          )}

          {responseType === "objective_scale" && (
            <div className="flex gap-4">
              <div>
                <FieldLabel htmlFor="scaleMin">Mínimo</FieldLabel>
                <input
                  id="scaleMin"
                  type="number"
                  value={scaleMin}
                  onChange={(e) => setScaleMin(Number(e.target.value))}
                  className="mt-1.5 w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <FieldLabel htmlFor="scaleMax">Máximo</FieldLabel>
                <input
                  id="scaleMax"
                  type="number"
                  value={scaleMax}
                  onChange={(e) => setScaleMax(Number(e.target.value))}
                  className="mt-1.5 w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <Toggle
              checked={allowMessage}
              onChange={setAllowMessage}
              label="Permitir mensagem na resposta"
              hint="O paciente pode escrever um texto livre além da resposta principal."
            />
            <Toggle
              checked={allowAttachments}
              onChange={setAllowAttachments}
              label="Permitir anexo na resposta"
              hint="O paciente pode enviar fotos, PDF ou outros arquivos junto com a resposta."
            />

            {allowAttachments && (
              <div className="pl-1">
                <FieldLabel htmlFor="maxFileSizeMb">Tamanho máx. por arquivo (MB)</FieldLabel>
                <input
                  id="maxFileSizeMb"
                  type="number"
                  min={1}
                  max={50}
                  value={maxFileSizeMb}
                  onChange={(e) => setMaxFileSizeMb(Number(e.target.value))}
                  className="mt-1.5 w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 border-t border-slate-100 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prazo</p>

          <div className="flex flex-wrap items-end gap-6">
            <div>
              <FieldLabel htmlFor="dueDays" hint="Quantos dias o paciente tem para responder, a partir do envio.">
                Prazo padrão (dias)
              </FieldLabel>
              <input
                id="dueDays"
                type="number"
                min={0}
                value={dueDateOffsetDays}
                onChange={(e) => setDueDateOffsetDays(Number(e.target.value))}
                className="mt-1.5 w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
              />
              Obrigatória
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex gap-3 border-t border-slate-100 pt-6">
          <Button type="submit" loading={loading}>
            Criar atividade
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
