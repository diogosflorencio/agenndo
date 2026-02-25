export const MOCK_USER = {
  id: "1",
  name: "Marcos Oliveira",
  email: "marcos@barbeariaelite.com.br",
  businessName: "Barbearia Elite",
  phone: "(11) 99999-8888",
  slug: "barbearia-elite",
  plan: "growth" as const,
  avatar: null,
  city: "São Paulo",
  segment: "Barbearia",
};

export const MOCK_COLLABORATORS = [
  { id: "1", name: "Carlos Barbeiro", role: "Barbeiro Senior", color: "#3B82F6", services: ["1", "2", "3"], appointments: 23, active: true, avatar: null },
  { id: "2", name: "Lucas Pereira", role: "Barbeiro", color: "#8B5CF6", services: ["1", "2"], appointments: 18, active: true, avatar: null },
  { id: "3", name: "Ana Lima", role: "Manicure", color: "#EC4899", services: ["4", "5"], appointments: 15, active: true, avatar: null },
];

export const MOCK_SERVICES = [
  { id: "1", name: "Corte Masculino", category: "Cabelo", duration: 30, price: 45, active: true, emoji: "✂️", collaborators: ["1", "2"] },
  { id: "2", name: "Corte + Barba", category: "Combo", duration: 60, price: 80, active: true, emoji: "💈", collaborators: ["1", "2"] },
  { id: "3", name: "Barba Tradicional", category: "Barba", duration: 30, price: 40, active: true, emoji: "🪒", collaborators: ["1"] },
  { id: "4", name: "Manicure", category: "Unhas", duration: 45, price: 50, active: true, emoji: "💅", collaborators: ["3"] },
  { id: "5", name: "Pedicure", category: "Unhas", duration: 60, price: 60, active: true, emoji: "🦶", collaborators: ["3"] },
];

export const MOCK_CLIENTS = [
  { id: "1", name: "João Silva", phone: "(11) 98765-4321", email: "joao@email.com", totalAppointments: 18, totalSpent: 1440, lastAppointment: "2024-01-15", rating: 5, noShows: 0 },
  { id: "2", name: "Pedro Costa", phone: "(11) 91234-5678", email: "pedro@email.com", totalAppointments: 12, totalSpent: 960, lastAppointment: "2024-01-18", rating: 5, noShows: 1 },
  { id: "3", name: "Rafael Almeida", phone: "(11) 97654-3210", email: "rafael@email.com", totalAppointments: 8, totalSpent: 640, lastAppointment: "2024-01-10", rating: 4, noShows: 0 },
  { id: "4", name: "Bruno Santos", phone: "(11) 95555-1234", email: "bruno@email.com", totalAppointments: 3, totalSpent: 240, lastAppointment: "2024-01-20", rating: 5, noShows: 0 },
  { id: "5", name: "Thiago Ferreira", phone: "(11) 94444-5678", email: "thiago@email.com", totalAppointments: 1, totalSpent: 80, lastAppointment: "2023-11-10", rating: 0, noShows: 2 },
];

export const MOCK_APPOINTMENTS = [
  { id: "1", clientName: "João Silva", clientId: "1", service: "Corte + Barba", serviceId: "2", collaborator: "Carlos", collaboratorId: "1", date: "2024-01-24", time: "09:00", endTime: "10:00", price: 80, status: "agendado" as const },
  { id: "2", clientName: "Pedro Costa", clientId: "2", service: "Corte Masculino", serviceId: "1", collaborator: "Lucas", collaboratorId: "2", date: "2024-01-24", time: "10:00", endTime: "10:30", price: 45, status: "compareceu" as const },
  { id: "3", clientName: "Rafael Almeida", clientId: "3", service: "Barba Tradicional", serviceId: "3", collaborator: "Carlos", collaboratorId: "1", date: "2024-01-24", time: "11:00", endTime: "11:30", price: 40, status: "agendado" as const },
  { id: "4", clientName: "Bruno Santos", clientId: "4", service: "Corte Masculino", serviceId: "1", collaborator: "Lucas", collaboratorId: "2", date: "2024-01-24", time: "14:00", endTime: "14:30", price: 45, status: "cancelado" as const },
  { id: "5", clientName: "Thiago Ferreira", clientId: "5", service: "Corte + Barba", serviceId: "2", collaborator: "Carlos", collaboratorId: "1", date: "2024-01-24", time: "15:00", endTime: "16:00", price: 80, status: "faltou" as const },
  { id: "6", clientName: "João Silva", clientId: "1", service: "Corte Masculino", serviceId: "1", collaborator: "Carlos", collaboratorId: "1", date: "2024-01-25", time: "09:00", endTime: "09:30", price: 45, status: "agendado" as const },
];

export const MOCK_FINANCIAL_RECORDS = [
  { id: "1", date: "2024-01-24", client: "João Silva", service: "Corte + Barba", collaborator: "Carlos", amount: 80, paid: true },
  { id: "2", date: "2024-01-24", client: "Pedro Costa", service: "Corte Masculino", collaborator: "Lucas", amount: 45, paid: true },
  { id: "3", date: "2024-01-24", client: "Rafael Almeida", service: "Barba Tradicional", collaborator: "Carlos", amount: 40, paid: true },
  { id: "4", date: "2024-01-23", client: "João Silva", service: "Corte Masculino", collaborator: "Carlos", amount: 45, paid: true },
  { id: "5", date: "2024-01-23", client: "Pedro Costa", service: "Corte + Barba", collaborator: "Lucas", amount: 80, paid: false },
  { id: "6", date: "2024-01-22", client: "Bruno Santos", service: "Corte Masculino", collaborator: "Carlos", amount: 45, paid: true },
  { id: "7", date: "2024-01-22", client: "Thiago Ferreira", service: "Barba Tradicional", collaborator: "Lucas", amount: 40, paid: true },
];

export const WEEKLY_CHART_DATA = [
  { day: "Seg", agendamentos: 8, receita: 560 },
  { day: "Ter", agendamentos: 12, receita: 820 },
  { day: "Qua", agendamentos: 10, receita: 700 },
  { day: "Qui", agendamentos: 15, receita: 1050 },
  { day: "Sex", agendamentos: 18, receita: 1260 },
  { day: "Sáb", agendamentos: 22, receita: 1540 },
  { day: "Dom", agendamentos: 0, receita: 0 },
];

export const MONTHLY_CHART_DATA = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  receita: Math.floor(Math.random() * 800 + 200),
  agendamentos: Math.floor(Math.random() * 15 + 3),
}));

export const HEATMAP_DATA = Array.from({ length: 7 }, (_, dayIndex) =>
  Array.from({ length: 12 }, (_, hourIndex) => ({
    day: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dayIndex],
    hour: hourIndex + 8,
    value: dayIndex === 0 || dayIndex === 6 ? (dayIndex === 6 ? Math.floor(Math.random() * 10 + 5) : 0) : Math.floor(Math.random() * 10 + 1),
  }))
).flat();
