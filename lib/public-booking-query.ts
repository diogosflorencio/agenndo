/** Query string do fluxo `/[slug]/agendar/...` para sobreviver à navegação do App Router. */

export type PublicBookingQueryState = {
  serviceId?: string | null;
  collaboratorId?: string | null;
  date?: string | null;
  time?: string | null;
};

export function buildPublicBookingQuery(state: PublicBookingQueryState): string {
  const params = new URLSearchParams();
  if (state.serviceId) params.set("service", state.serviceId);
  if (state.collaboratorId) params.set("collab", state.collaboratorId);
  if (state.date) params.set("date", state.date);
  if (state.time) params.set("time", state.time);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function parsePublicBookingQuery(searchParams: URLSearchParams): PublicBookingQueryState {
  return {
    serviceId: searchParams.get("service"),
    collaboratorId: searchParams.get("collab"),
    date: searchParams.get("date"),
    time: searchParams.get("time"),
  };
}
