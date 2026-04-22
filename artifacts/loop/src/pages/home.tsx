import { useGetMe, useGetTodayFollowUps, useCompleteFollowUp, useListClients } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format, isToday, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { data: user } = useGetMe();
  const { data: followUps, isLoading } = useGetTodayFollowUps();
  const { data: clients } = useListClients();
  const completeFollowUp = useCompleteFollowUp();

  const greeting = getGreeting();
  const hasClients = clients && clients.length > 0;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Today's Follow-ups</h1>
        <p className="text-muted-foreground">{greeting}, {user?.fullName?.split(' ')[0]}</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <Card key={i} className="h-32 bg-white/50 animate-pulse border-border/50" />
          ))}
        </div>
      ) : followUps?.length === 0 ? (
        <div className="py-16 text-center space-y-4">
          <p className="text-muted-foreground text-lg">You're all caught up for today.</p>
          {!hasClients && (
            <Link href="/clients" className="inline-block text-primary hover:text-primary/80 transition-colors">
              Add your first client &rarr;
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {followUps?.map(f => (
              <FollowUpCard key={f.id} followUp={f} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function FollowUpCard({ followUp }: { followUp: any }) {
  const [completedState, setCompletedState] = useState<{message: string} | null>(null);
  const completeFollowUp = useCompleteFollowUp();

  const handleComplete = async () => {
    const res = await completeFollowUp.mutateAsync({ id: followUp.id });
    if (res.nextFollowUpDate) {
      setCompletedState({
        message: `Follow-up logged. Next f/up: ${format(parseISO(res.nextFollowUpDate), "MMM d")}`
      });
    } else {
      setCompletedState({
        message: "Follow-up logged. No further follow-ups scheduled."
      });
    }
  };

  const date = parseISO(followUp.scheduledDate);
  const displayDate = isToday(date) ? "Today" : format(date, "MMM d");

  return (
    <motion.div
      layout
      initial={{ opacity: 1 }}
      animate={{ opacity: completedState ? 0.5 : 1 }}
    >
      <Card className={`p-5 flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-white shadow-sm border-border ${completedState ? 'pointer-events-none' : ''}`}>
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-base truncate">{followUp.clientName}</h3>
            <span className="text-xs text-muted-foreground shrink-0">{displayDate}</span>
          </div>
          {followUp.notesSnapshot && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {followUp.notesSnapshot}
            </p>
          )}
        </div>

        <div className="shrink-0 min-w-[140px] flex justify-end">
          {completedState ? (
            <div className="text-sm text-primary font-medium bg-primary/10 px-3 py-1.5 rounded-md text-right">
              {completedState.message}
            </div>
          ) : (
            <Button 
              onClick={handleComplete}
              disabled={completeFollowUp.isPending}
              className="w-full sm:w-auto shadow-none"
            >
              Followed Up
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
