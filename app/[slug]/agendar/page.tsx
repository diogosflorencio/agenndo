import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** `/[slug]/agendar` → primeira etapa do fluxo */
export default async function AgendarIndexPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/${slug}/agendar/servico`);
}
