import { z } from "zod";

// Auth
export const signUpSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  phone: z.string().optional(),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof signInSchema>;

// Consultor
export const consultantSchema = z.object({
  name: z.string().min(2),
  company: z.string().min(2),
  product: z.string().min(10),
  audience: z.string().min(10),
  tone: z.enum(["CASUAL", "CONSULTIVE", "DIRECT", "CURIOUS", "COMMERCIAL"]),
  goal: z.enum(["CAPTURE_INTEREST", "QUALIFY", "SCHEDULE_MEETING", "SEND_PROPOSAL"]),
});
export type ConsultantInput = z.infer<typeof consultantSchema>;

export const businessContextSchema = z.object({
  whatYouSell: z.string().min(10),
  whoYouSellTo: z.string().min(10),
  mainBenefit: z.string().min(10),
  differentials: z.string().min(10),
  commonObjections: z.array(
    z.object({
      objection: z.string().min(2),
      idealAnswer: z.string().min(5),
    })
  ),
  conversationGoal: z.string().min(5),
  glossaryAllowed: z.array(z.string()).default([]),
  glossaryBlocked: z.array(z.string()).default([]),
  forbiddenActions: z.array(z.string()).default([]),
  referenceMessages: z
    .array(
      z.object({
        scenario: z.string().min(2),
        message: z.string().min(5),
        lesson: z.string().min(5),
      })
    )
    .default([]),
});
export type BusinessContextInput = z.infer<typeof businessContextSchema>;

export const permissionsSchema = z.object({
  canMentionPrice: z.boolean().default(false),
  canSendLink: z.boolean().default(true),
  canSendPresentation: z.boolean().default(true),
  canSuggestMeeting: z.boolean().default(true),
  canAnswerQuestions: z.boolean().default(true),
  callHumanIfOutOfScope: z.boolean().default(true),
  meetingLink: z.string().url().optional().or(z.literal("")),
  proposalUrl: z.string().url().optional().or(z.literal("")),
});
export type PermissionsInput = z.infer<typeof permissionsSchema>;

// Lista de contatos
export const contactSchema = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const contactListSchema = z.object({
  name: z.string().min(2),
  source: z.enum(["CSV_UPLOAD", "MANUAL_PASTE", "GOOGLE_EXTRACTION", "PAID_TRAFFIC"]),
  contacts: z.array(contactSchema).min(1),
});
export type ContactListInput = z.infer<typeof contactListSchema>;

// Trabalho/Campanha
export const jobSchema = z.object({
  name: z.string().min(2),
  consultantId: z.string().cuid(),
  contactListId: z.string().cuid(),
  channel: z.enum(["WHATSAPP", "EMAIL"]),
  goal: z.enum(["CAPTURE_INTEREST", "QUALIFY", "SCHEDULE_MEETING", "SEND_PROPOSAL"]),
  dailyLimit: z.number().int().min(1).max(1000).default(100),
});
export type JobInput = z.infer<typeof jobSchema>;

// Conta de e-mail (SMTP + IMAP)
export const emailAccountSchema = z.object({
  fromEmail: z.string().email("E-mail inválido"),
  fromName: z.string().min(2, "Nome muito curto"),
  smtpHost: z.string().min(2),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  imapHost: z.string().optional(),
  imapPort: z.coerce.number().int().min(1).max(65535).optional(),
  imapUser: z.string().optional(),
  imapPass: z.string().optional(),
  consultantId: z.string().cuid().optional(),
});
export type EmailAccountInput = z.infer<typeof emailAccountSchema>;

// Classificação de lead (saída estruturada da IA)
export const leadClassificationSchema = z.object({
  status: z.enum(["COLD", "WARM", "HOT"]),
  reason: z.string(),
  triggerHumanAlert: z.boolean(),
  alertReason: z.string().optional(),
});
export type LeadClassification = z.infer<typeof leadClassificationSchema>;
