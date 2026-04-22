import { useState } from "react";
import { format, parseISO } from "date-fns";
import { 
  useListClients, 
  useCreateClient, 
  useUpdateClient, 
  useDeleteClient,
  getListClientsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

type Cadence = 'one_time' | 'weekly' | 'monthly' | 'quarterly';

export default function Clients() {
  const { data: clients, isLoading } = useListClients();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Clients</h1>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="shadow-none">
            Add Client
          </Button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <ClientForm onClose={() => setIsAdding(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white/50 animate-pulse rounded-lg border border-border" />
          ))}
        </div>
      ) : clients?.length === 0 && !isAdding ? (
        <div className="text-center py-12 text-muted-foreground">
          No clients yet. Add one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {clients?.map(client => (
            <div key={client.id}>
              {editingId === client.id ? (
                <ClientForm 
                  initialData={client} 
                  onClose={() => setEditingId(null)} 
                />
              ) : (
                <div 
                  onClick={() => setEditingId(client.id)}
                  className="flex items-center justify-between p-4 bg-white border border-border rounded-xl hover:border-primary/30 transition-colors cursor-pointer group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="font-medium text-foreground">{client.name}</span>
                    <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full w-fit">
                      {formatCadence(client.cadence)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {client.nextFollowUpDate 
                      ? format(parseISO(client.nextFollowUpDate), "MMM d, yyyy")
                      : "No follow-up scheduled"
                    }
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientForm({ initialData, onClose }: { initialData?: any, onClose: () => void }) {
  const [name, setName] = useState(initialData?.name || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [cadence, setCadence] = useState<Cadence>(initialData?.cadence || "monthly");
  const [followUpDate, setFollowUpDate] = useState(initialData?.followUpDate ? initialData.followUpDate.split('T')[0] : "");
  
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const queryClient = useQueryClient();

  const isEditing = !!initialData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      notes: notes || null,
      cadence,
      followUpDate: cadence === 'one_time' && followUpDate ? followUpDate : null
    };

    if (isEditing) {
      await updateClient.mutateAsync({ id: initialData.id, data });
    } else {
      await createClient.mutateAsync({ data });
    }
    
    queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
    onClose();
  };

  const handleDelete = async () => {
    if (confirm(`Delete ${initialData.name} and all follow-ups?`)) {
      await deleteClient.mutateAsync({ id: initialData.id });
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
      onClose();
    }
  };

  return (
    <Card className="p-5 bg-white shadow-sm border-border">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Client Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              className="bg-white"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Context about this client or previous discussions"
              className="resize-none h-20 bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label>Follow-up Cadence *</Label>
            <div className="flex flex-wrap gap-2">
              {(['one_time', 'weekly', 'monthly', 'quarterly'] as Cadence[]).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCadence(c)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors border ${
                    cadence === c 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-white border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {formatCadence(c)}
                </button>
              ))}
            </div>
          </div>

          {cadence === 'one_time' && (
            <div className="space-y-2">
              <Label htmlFor="date">Follow-up Date *</Label>
              <Input
                id="date"
                type="date"
                value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
                required={cadence === 'one_time'}
                className="bg-white w-full sm:w-auto"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <Button type="submit" className="shadow-none" disabled={createClient.isPending || updateClient.isPending}>
              {isEditing ? "Save Changes" : "Save Client"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-sm text-destructive-foreground hover:underline"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}

function formatCadence(c: string) {
  if (c === 'one_time') return 'One-time';
  return c.charAt(0).toUpperCase() + c.slice(1);
}
