import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertTriangle, Clock, CheckCircle2, PhoneCall } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface QueueItem {
  id: string;
  queue_number: number;
  priority: string;
  status: string;
  notes: string | null;
  checked_in_at: string;
  patients: { full_name: string } | null;
  doctors: { full_name: string } | null;
}

interface Option { id: string; full_name: string; }

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [patients, setPatients] = useState<Option[]>([]);
  const [doctors, setDoctors] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: '', doctor_id: '', priority: 'normal', notes: '' });
  const { toast } = useToast();

  const fetchData = async () => {
    const [q, pts, docs] = await Promise.all([
      supabase.from('queue').select('*, patients(full_name), doctors(full_name)').in('status', ['waiting', 'in-progress']).order('priority', { ascending: true }).order('checked_in_at', { ascending: true }),
      supabase.from('patients').select('id, full_name').order('full_name'),
      supabase.from('doctors').select('id, full_name').eq('is_available', true).order('full_name'),
    ]);
    // Sort: emergency first, then urgent, then normal
    const priorityOrder = { emergency: 0, urgent: 1, normal: 2 };
    const sorted = (q.data || []).sort((a, b) => {
      const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
      const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime();
    });
    setQueue(sorted);
    setPatients(pts.data || []);
    setDoctors(docs.data || []);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('queue-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const maxNum = queue.reduce((max, q) => Math.max(max, q.queue_number), 0);
    const { error } = await supabase.from('queue').insert({
      patient_id: form.patient_id,
      doctor_id: form.doctor_id || null,
      priority: form.priority,
      notes: form.notes || null,
      queue_number: maxNum + 1,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Patient added to queue' });
      setOpen(false);
      setForm({ patient_id: '', doctor_id: '', priority: 'normal', notes: '' });
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const updates: { status: string; called_at?: string; completed_at?: string } = { status: newStatus };
    if (newStatus === 'in-progress') updates.called_at = new Date().toISOString();
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
    await supabase.from('queue').update(updates).eq('id', id);
    fetchData();
  };

  const priorityConfig = {
    emergency: { color: 'priority-emergency', icon: AlertTriangle, label: 'Emergency' },
    urgent: { color: 'priority-urgent', icon: Clock, label: 'Urgent' },
    normal: { color: 'priority-normal', icon: CheckCircle2, label: 'Normal' },
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Patient Queue</h1>
          <p className="page-description">Real-time queue management with priority sorting</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add to Queue</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Add Patient to Queue</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>Patient *</Label>
                <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign Doctor</Label>
                <Select value={form.doctor_id} onValueChange={v => setForm(f => ({ ...f, doctor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority *</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <Button type="submit" className="w-full" disabled={!form.patient_id}>Add to Queue</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {queue.map((item, idx) => {
            const config = priorityConfig[item.priority as keyof typeof priorityConfig] || priorityConfig.normal;
            const Icon = config.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={`border-l-4 ${item.priority === 'emergency' ? 'border-l-destructive animate-pulse-soft' : item.priority === 'urgent' ? 'border-l-warning' : 'border-l-secondary'}`}>
                  <CardContent className="py-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center font-heading font-bold text-lg">
                      #{item.queue_number}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.patients?.full_name || 'Unknown'}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className={config.color}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                        {item.doctors?.full_name && (
                          <span className="text-xs text-muted-foreground">Dr. {item.doctors.full_name}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.checked_in_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {item.status === 'waiting' && (
                        <Button size="sm" onClick={() => updateStatus(item.id, 'in-progress')}>
                          <PhoneCall className="w-3.5 h-3.5 mr-1" />
                          Call
                        </Button>
                      )}
                      {item.status === 'in-progress' && (
                        <Button size="sm" variant="secondary" onClick={() => updateStatus(item.id, 'completed')}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Complete
                        </Button>
                      )}
                      <Badge variant={item.status === 'in-progress' ? 'default' : 'outline'}>
                        {item.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {queue.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <ListIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Queue is empty</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ListIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
