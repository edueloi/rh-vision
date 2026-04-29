export interface Holiday {
  date: string;
  name: string;
}

const holidays: Holiday[] = [
  { date: '2026-01-01', name: 'Confraternização Universal' },
  { date: '2026-04-21', name: 'Tiradentes' },
  { date: '2026-05-01', name: 'Dia do Trabalho' },
  { date: '2026-09-07', name: 'Independência do Brasil' },
  { date: '2026-10-12', name: 'Nossa Senhora Aparecida' },
  { date: '2026-11-02', name: 'Finados' },
  { date: '2026-11-15', name: 'Proclamação da República' },
  { date: '2026-12-25', name: 'Natal' },
];

export function isHoliday(date: Date) {
  const iso = date.toISOString().split('T')[0];
  return holidays.find(h => h.date === iso);
}
