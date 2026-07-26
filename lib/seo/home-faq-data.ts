/** FAQ da landing: fonte única para UI e JSON-LD (FAQPage). */
import { APP_TRIAL_DAYS } from "@/lib/trial-config";

export const HOME_FAQS = [
  {
    q: "Preciso saber programar?",
    a: "Não. O Agenndo foi feito para ser direto: você configura serviços, horários e equipe sem código. O onboarding guia o essencial.",
  },
  {
    q: "Como funciona o período de teste?",
    a: `Você tem ${APP_TRIAL_DAYS} dias para usar o painel completo, sem cartão no cadastro. Depois, a assinatura é em cartão via Stripe, com valor definido no onboarding conforme seu uso.`,
  },
  {
    q: "O que já consigo fazer no painel?",
    a: "Agenda e disponibilidade, agendamentos com status (compareceu/faltou etc.), serviços e preços, equipe e colaboradores, página pública com link e QR Code, personalização (logo, cores, banner), clientes, financeiro, analytics, notificações e - quando ativado - comissões por profissional com área dedicada ao colaborador.",
  },
  {
    q: "Profissionais da minha equipe veem comissões?",
    a: "Sim, quando você ativa o módulo de comissões e vincula o e-mail da conta Google de cada pessoa na edição do colaborador. Ele entra por uma página pública dedicada e vê um painel unificado se trabalhar em mais de um negócio que use o mesmo vínculo.",
  },
  {
    q: "Posso personalizar minha página pública?",
    a: "Sim: logo, cores, banner, galeria, redes sociais e texto - cada negócio tem sua URL por slug. Clientes agendam por ali 24h.",
  },
  {
    q: "Funciona no celular?",
    a: "Sim. Interface pensada para mobile e uso como PWA (instalar pelo navegador).",
  },
  {
    q: "Quais tipos de negócio podem usar?",
    a: "Qualquer prestador que trabalhe com hora marcada: salão, clínica de estética, barbearia, consultório, estúdio, personal, pet shop, fotógrafo e outros.",
  },
  {
    q: "Posso receber pagamento dos clientes pelo app?",
    a: "Sim. Você pode cadastrar Pix e conectar Mercado Pago para cobrar sinal ou pagamento antecipado no agendamento. Também há templates de WhatsApp para confirmação e lembretes.",
  },
  {
    q: "Como cancelar minha assinatura?",
    a: "No próprio painel (Conta / plano), quando aplicável. Sem fidelidade obrigatória nas condições usuais do produto.",
  },
  {
    q: "Posso comparar o Agenndo com Agendor, Gendo ou outras plataformas?",
    a: "Sim. São produtos da mesma categoria de mercado; o Agenndo é independente dessas marcas. Compare funcionalidades, preço e suporte e use o teste gratuito.",
  },
  {
    q: "O Agenndo funciona fora do Brasil?",
    a: "Sim: interface em português, inglês e espanhol (conforme o idioma do navegador), com agenda, equipe e visão financeira para negócios em qualquer país.",
  },
] as const;
