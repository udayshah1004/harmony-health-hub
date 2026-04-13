import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Stethoscope } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Doctor {
  id: string;
  full_name: string;
  specialization: string;
  phone: string | null;
  email: string | null;
  is_available: boolean | null;
}

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', specialization: '', phone: '', email: '' });
  const { toast } = useToast();

  const fetchDoctors = async () => {
    const { data } = await supabase.from('doctors').select('*').order('full_name');
    setDoctors(data || []);
  };

  useEffect(() => { fetchDoctors(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('doctors').insert(form);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Doctor added successfully' });
      setOpen(false);
      setForm({ full_name: '', specialization: '', phone: '', email: '' });
      fetchDoctors();
    }
  };

  const toggleAvailability = async (id: string, current: boolean | null) => {
    await supabase.from('doctors').update({ is_available: !current }).eq('id', id);
    fetchDoctors();
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Doctors</h1>
          <p className="page-description">Manage doctor profiles and availability</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Doctor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Add New Doctor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Specialization *</Label>
                <Input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} required placeholder="e.g. Cardiology" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <Button type="submit" className="w-full">Add Doctor</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {doctors.map(doctor => (
          <Card key={doctor.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold">{doctor.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                  {doctor.phone && <p className="text-xs text-muted-foreground mt-1">{doctor.phone}</p>}
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant={doctor.is_available ? 'default' : 'secondary'} className={doctor.is_available ? 'bg-success hover:bg-success' : ''}>
                      {doctor.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleAvailability(doctor.id, doctor.is_available)}
                      className="text-xs"
                    >
                      Toggle
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {doctors.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No doctors registered yet
          </div>
        )}
      </div>
    </div>
  );
}
