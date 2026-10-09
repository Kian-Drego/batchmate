import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardList,
  ExternalLink,
  Send,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Application } from '../lib/types';
import { shortDate } from '../lib/format';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Panel,
  Progress,
  SectionHeader,
  Spinner,
  StatusBadge,
} from '../components/ui';

const PIPELINE = ['Not Started', 'In Progress', 'Submitted', 'Verification Pending', 'Awarded'];
const NEXT_ACTIONS: Record<string, { status: string; label: string }[]> = {
  'In Progress': [{ status: 'Submitted', label: 'Mark submitted' }],
  Submitted: [{ status: 'Verification Pending', label: 'Mark verification pending' }],
  'Verification Pending': [
    { status: 'Awarded', label: 'Mark awarded' },
    { status: 'Rejected', label: 'Mark rejected' },
  ],
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ applications: Application[] }>('/applications')
      .then((d) => setApplications(d.applications))
      .finally(() => setLoading(false));
  }, []);

  const replace = (updated: Application) =>
    setApplications((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));

  const toggleItem = async (app: Application, itemId: string, done: boolean) => {
    setError(null);
    try {
      const data = await api.patch<{ application: Application }>(
        `/applications/${app._id}/checklist/${itemId}`,
        { done }
      );
      replace(data.application);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const advance = async (app: Application, status: string) => {
    setError(null);
    try {
      const data = await api.patch<{ application: Application }>(`/applications/${app._id}/status`, {
        status,
      });
      replace(data.application);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const nativeSubmit = async (app: Application) => {
    setError(null);
    try {
      const data = await api.post<{ application: Application }>(`/applications/${app._id}/submit`);
      replace(data.application);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Application tracker"
        title="Tracked applications"
        description="Move each application through the pipeline: Not Started → In Progress → Submitted → Verification Pending → Awarded / Rejected."
      />

      {error && (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {applications.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No applications tracked"
          description="Open a matched scholarship and start an application to see it here."
          action={
            <Link to="/matches">
              <Button variant="secondary" size="sm">
                Browse matches
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const done = app.checklist.filter((c) => c.done).length;
            const pct = app.checklist.length ? (done / app.checklist.length) * 100 : 0;
            const stageIndex = PIPELINE.indexOf(app.status);
            const isOpen = expanded === app._id;
            const actions = NEXT_ACTIONS[app.status] ?? [];

            return (
              <Panel key={app._id}>
                <button
                  className="flex w-full items-center gap-4 p-5 text-left"
                  onClick={() => setExpanded(isOpen ? null : app._id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={app.status} />
                      <Badge tone={app.mode === 'native' ? 'lavender' : 'neutral'}>
                        {app.mode === 'native' ? 'Native application' : 'External portal'}
                      </Badge>
                    </div>
                    <h3 className="mt-2 truncate font-serif text-lg font-semibold text-ink">
                      {app.scholarship?.title}
                    </h3>
                    <div className="mt-0.5 text-xs text-ink-faint">
                      {app.scholarship?.provider} · updated {shortDate(app.updatedAt)}
                    </div>
                  </div>
                  <div className="hidden w-40 sm:block">
                    <Progress value={pct} label={`${done}/${app.checklist.length} steps`} />
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-ink-faint transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-line-faint"
                    >
                      <div className="grid gap-6 p-5 lg:grid-cols-2">
                        <div>
                          <h4 className="mb-3 text-sm font-semibold">Checklist</h4>
                          <ul className="space-y-1">
                            {app.checklist.map((item) => (
                              <li key={item._id}>
                                <button
                                  onClick={() => toggleItem(app, item._id, !item.done)}
                                  className="flex w-full items-start gap-3 rounded-card px-2 py-1.5 text-left hover:bg-paper-sunken"
                                >
                                  {item.done ? (
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-eligible" />
                                  ) : (
                                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                                  )}
                                  <span
                                    className={`text-sm ${item.done ? 'text-ink-faint line-through' : 'text-ink-soft'}`}
                                  >
                                    {item.label}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="mb-3 text-sm font-semibold">Pipeline</h4>
                          <ol className="space-y-2">
                            {PIPELINE.map((stage, i) => (
                              <li key={stage} className="flex items-center gap-3 text-sm">
                                <span
                                  className={`flex h-5 w-5 items-center justify-center rounded-pill border text-[10px] font-bold ${
                                    i <= stageIndex
                                      ? 'border-eligible bg-eligible text-paper'
                                      : 'border-line-faint text-ink-faint'
                                  }`}
                                >
                                  {i + 1}
                                </span>
                                <span className={i <= stageIndex ? 'font-medium text-ink' : 'text-ink-faint'}>
                                  {stage}
                                </span>
                              </li>
                            ))}
                          </ol>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {actions.map((a) => (
                              <Button
                                key={a.status}
                                size="sm"
                                variant={a.status === 'Rejected' ? 'danger' : 'secondary'}
                                onClick={() => advance(app, a.status)}
                              >
                                {a.label}
                              </Button>
                            ))}
                            {app.mode === 'native' && app.status !== 'Submitted' && (
                              <Button size="sm" onClick={() => nativeSubmit(app)}>
                                <Send className="h-3.5 w-3.5" /> Submit
                              </Button>
                            )}
                            <Link to={`/scholarships/${app.scholarship?._id}`}>
                              <Button size="sm" variant="ghost">
                                <ExternalLink className="h-3.5 w-3.5" /> Open scheme
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
