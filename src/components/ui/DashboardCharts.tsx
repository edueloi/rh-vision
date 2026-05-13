import React from "react";
import { BarChart3, Brain } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { PanelCard } from "@/src/components/ui";

interface DashboardChartsProps {
  compatibilityData: any[];
  discData: any[];
}

const COLORS = ['#07152B', '#C5A04D', '#6CB4E4', '#10B981', '#F5A623', '#8B5CF6'];

export function DashboardCharts({ compatibilityData, discData }: DashboardChartsProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <PanelCard title="Compatibilidade Média" icon={BarChart3} description="Desempenho da IA por vaga aberta">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compatibilityData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" className="dark:stroke-white/5" />
              <XAxis 
                dataKey="name" 
                fontSize={8} 
                fontWeight={700} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#a1a1aa' }} 
              />
              <YAxis 
                fontSize={8} 
                fontWeight={700} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#a1a1aa' }} 
                unit="%" 
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                  fontSize: '10px', 
                  fontWeight: 'bold',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)'
                }}
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {compatibilityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </PanelCard>

      <PanelCard title="Perfis DISC" icon={Brain} description="Distribuição predominante de comportamento">
        <div className="h-[250px] w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={discData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {discData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </PanelCard>
    </div>
  );
}
