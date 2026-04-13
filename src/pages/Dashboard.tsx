import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, CalendarDays, ListOrdered, Receipt, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['hsl(175,45%,42%)', 'hsl(215,70%,28%)', 'hsl(38,92%,50%)', 'hsl(0,72%,51%)'];

export default function Dashboard() {
  const [stats, setStats] = useState({ patients: 0, appointments: 0, queue: 0, revenue: 0 });
  const [queueByPriority, setQueueByPriority] = useState<{ name: string; value: number }[]>([]);
  const [appointmentsByDay, setAppointmentsByDay] = useState<{ day: string; count: number }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [patients, appointments, queue, billing] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('appointments').select('id', { count: 'exact', head: true }),
        supabase.from('queue').select('id, priority').eq('status', 'waiting'),
        supabase.from('billing').select('amount').eq('status', 'paid'),
      ]);

      const revenue = (billing.data || []).reduce((sum, b) => sum + Number(b.amount), 0);
      setStats({
        patients: patients.count || 0,
        appointments: appointments.count || 0,
        queue: (queue.data || []).length,
        revenue,
      });

      const priorities = { normal: 0, urgent: 0, emergency: 0 };
      (queue.data || []).forEach(q => {
        if (q.priority in priorities) priorities[q.priority as keyof typeof priorities]++;
      });
      setQueueByPriority([
        { name: 'Normal', value: priorities.normal },
        { name: 'Urgent', value: priorities.urgent },
        { name: 'Emergency', value: priorities.emergency },
      ]);

      // Mock weekly data for chart
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      setAppointmentsByDay(days.map(day => ({ day, count: Math.floor(Math.random() * 20) + 5 })));
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Patients', value: stats.patients, icon: Users, color: 'text-primary' },
    { label: 'Appointments', value: stats.appointments, icon: CalendarDays, color: 'text-secondary' },
    { label: 'In Queue', value: stats.queue, icon: ListOrdered, color: 'text-warning' },
    { label: 'Revenue', value: `$${stats.revenue.toLocaleString()}`, icon: Receipt, color: 'text-success' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Overview of hospital operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold font-heading">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-secondary" />
              Weekly Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={appointmentsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Queue by Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={queueByPriority} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label>
                  {queueByPriority.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {queueByPriority.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                  {item.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
