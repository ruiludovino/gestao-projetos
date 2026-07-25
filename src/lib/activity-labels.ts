const ACTIVITY_LABELS: Record<string, string> = {
  "projeto.criado": "criou o projeto",
  "projeto.arquivado": "arquivou o projeto",
  "projeto.reativado": "reativou o projeto",
  "membro.adicionado": "adicionou um membro",
  "bug.criado": "reportou um bug",
  "bug.status_alterado": "alterou o estado de um bug",
  "bug.atribuido": "atribuiu um bug",
  "tarefa.criada": "criou uma tarefa",
  "tarefa.status_alterado": "alterou o estado de uma tarefa",
  "tarefa.atribuida": "atribuiu uma tarefa",
  "nota.criada": "criou uma nota",
  "credencial.criada": "adicionou uma credencial",
  "github.repo_ligado": "ligou um repositório GitHub",
};

export function describeActivity(action: string): string {
  return ACTIVITY_LABELS[action] ?? action;
}
