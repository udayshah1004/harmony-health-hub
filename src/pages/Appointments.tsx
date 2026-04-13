import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  notes: string | null;
  patients: { full_name: string } | null;
  doctors: { full_name: string; specialization: string } | null;
}

interface Option { id: string; full_name: string; }

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Option[]>([]);
  const [doctors, setDoctors] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: '', doctor_id: '', appointment_date: '', notes: '' });
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    const [appts, pts, docs] = await Promise.all([
      supabase.from('appointments').select('*, patients(full_name), doctors(full_name, specialization)').order('appointment_date', { ascending: false }),
      supabase.from('patients').select('id, full_name').order('full_name'),
      supabase.from('doctors').select('id, full_name').eq('is_available', true).order('full_name'),
    ]);
    setAppointments(appts.data || []);
    setPatients(pts.data || []);
    setDoctors(docs.data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('appointments').insert({
      patient_id: form.patient_id,
      doctor_id: form.doctor_id,
      appointment_date: form.appointment_date,
      notes: form.notes || null,
      created_by: user?.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Appointment scheduled' });
      setOpen(false);
      setForm({ patient_id: '', doctor_id: '', appointment_date: '', notes: '' });
      fetchData();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('appointments').update({ status }).eq('id', id);
    fetchData();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'scheduled': return 'bg-info/10 text-info border-info/20';
      case 'in-progress': return 'bg-warning/10 text-warning border-warning/20';
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return '';
    }
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-description">Schedule and manage appointments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />New Appointment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Schedule Appointment</DialogTitle>
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
                <Label>Doctor *</Label>
                <Select value={form.doctor_id} onValueChange={v => setForm(f => ({ ...f, doctor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date & Time *</Label>
                <Input type="datetime-local" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <Button type="submit" className="w-full" disabled={!form.patient_id || !form.doctor_id}>Schedule</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map(apt => (
                <TableRow key={apt.id}>
                  <TableCell className="font-medium">{apt.patients?.full_name || '—'}</TableCell>
                  <TableCell>
                    <div>
                      <span>{apt.doctors?.full_name || '—'}</span>
                      {apt.doctors?.specialization && (
                        <span className="text-xs text-muted-foreground ml-2">({apt.doctors.specialization})</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                      {new Date(apt.appointment_date).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor(apt.status)}>{apt.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select onValueChange={v => updateStatus(apt.id, v)}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="Update" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {appointments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No appointments yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
