import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Receipt, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Bill {
  id: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
  patients: { full_name: string } | null;
}

export default function Billing() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [patients, setPatients] = useState<{ id: string; full_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: '', amount: '', description: '' });
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    const [b, p] = await Promise.all([
      supabase.from('billing').select('*, patients(full_name)').order('created_at', { ascending: false }),
      supabase.from('patients').select('id, full_name').order('full_name'),
    ]);
    setBills(b.data || []);
    setPatients(p.data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('billing').insert({
      patient_id: form.patient_id,
      amount: parseFloat(form.amount),
      description: form.description || null,
      created_by: user?.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Invoice created' });
      setOpen(false);
      setForm({ patient_id: '', amount: '', description: '' });
      fetchData();
    }
  };

  const markPaid = async (id: string) => {
    await supabase.from('billing').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
    fetchData();
  };

  const totalRevenue = bills.filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.amount), 0);
  const totalPending = bills.filter(b => b.status === 'pending').reduce((s, b) => s + Number(b.amount), 0);

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="page-description">Invoice management and payments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />New Invoice</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Create Invoice</DialogTitle>
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
                <Label>Amount *</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Consultation fee, Lab tests..." />
              </div>
              <Button type="submit" className="w-full" disabled={!form.patient_id || !form.amount}>Create Invoice</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-success" />
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold font-heading">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-warning" />
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold font-heading">${totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map(bill => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">{bill.patients?.full_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{bill.description || '—'}</TableCell>
                  <TableCell className="font-heading font-semibold">${Number(bill.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={bill.status === 'paid' ? 'default' : 'outline'}
                      className={bill.status === 'paid' ? 'bg-success hover:bg-success' : bill.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' : ''}>
                      {bill.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(bill.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {bill.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => markPaid(bill.id)}>Mark Paid</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {bills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No invoices yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
