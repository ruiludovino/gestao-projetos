import "server-only";

import { Resend } from "resend";
import { ProjectRole } from "@prisma/client";

const FROM_ADDRESS = "Gestão de Projetos <convites@ruiludovino.net>";

const ROLE_LABELS: Record<ProjectRole, string> = {
  ADMIN: "Admin",
  DEVELOPER: "Developer",
  VIEWER: "Viewer",
};

function getAppUrl() {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendProjectInviteEmail({
  to,
  projectName,
  inviterName,
  role,
  hasAccount,
}: {
  to: string;
  projectName: string;
  inviterName: string;
  role: ProjectRole;
  hasAccount: boolean;
}) {
  const resend = getResendClient();
  if (!resend) {
    console.warn("RESEND_API_KEY não definida; email de convite não enviado.");
    return;
  }

  const appUrl = getAppUrl();
  const actionUrl = hasAccount ? `${appUrl}/login` : `${appUrl}/registo`;
  const actionLabel = hasAccount ? "Entrar" : "Criar conta";

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `${inviterName} convidou-te para o projeto "${projectName}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Foste convidado para "${projectName}"</h2>
        <p><strong>${inviterName}</strong> convidou-te para o projeto <strong>${projectName}</strong> na Gestão de Projetos, com o role <strong>${ROLE_LABELS[role]}</strong>.</p>
        ${
          hasAccount
            ? "<p>Já tens conta — basta entrares com este email para teres acesso.</p>"
            : "<p>Ainda não tens conta. Cria uma com este mesmo email para entrares automaticamente no projeto.</p>"
        }
        <p style="margin-top: 24px;">
          <a href="${actionUrl}" style="background:#111827;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
            ${actionLabel}
          </a>
        </p>
      </div>
    `,
  });
}
