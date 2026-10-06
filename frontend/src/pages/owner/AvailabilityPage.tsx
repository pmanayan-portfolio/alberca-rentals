import { type FormEvent, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';

import { OwnerTitle } from '../../components/OwnerShell';
import { api, mutate } from '../../lib/api';

type AvailabilityBlock = {
  id: number;
  start_at: string;
  end_at: string;
  reason?: string | null;
};

export default function AvailabilityPage() {
  const [data, setData] = useState<AvailabilityBlock[]>([]);
  const [form, setForm] = useState({ start_at: '', end_at: '', reason: '' });
  const [message, setMessage] = useState('');

  const load = async () => {
    setData(await api<AvailabilityBlock[]>('/api/owner/availability-blocks'));
  };

  useEffect(() => {
    load().catch((error) => setMessage((error as Error).message));
  }, []);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    try {
      await mutate('/api/owner/availability-blocks', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm({ start_at: '', end_at: '', reason: '' });
      await load();
      setMessage('Schedule block added.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const remove = async (block: AvailabilityBlock) => {
    if (!confirm('Delete this availability block? Customers will be able to book this schedule again.')) return;

    try {
      await mutate(`/api/owner/availability-blocks/${block.id}`, {
        method: 'DELETE',
      });
      await load();
      setMessage('Availability block deleted.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  return (
    <div className="shell py-10">
      <OwnerTitle
        title="Availability blocks"
        description="Prevent bookings during unavailable dates/times, and remove a block whenever the schedule opens again."
      />

      <form onSubmit={add} className="card grid gap-4 p-6 md:grid-cols-3">
        <label>
          <span className="label">Blocked from</span>
          <input
            className="field"
            type="datetime-local"
            value={form.start_at}
            onChange={(event) => setForm({ ...form, start_at: event.target.value })}
            required
          />
        </label>

        <label>
          <span className="label">Blocked until</span>
          <input
            className="field"
            type="datetime-local"
            value={form.end_at}
            onChange={(event) => setForm({ ...form, end_at: event.target.value })}
            required
          />
        </label>

        <label>
          <span className="label">Reason</span>
          <input
            className="field"
            placeholder="Family outing, maintenance, fully booked..."
            value={form.reason}
            onChange={(event) => setForm({ ...form, reason: event.target.value })}
          />
        </label>

        <button className="btn btn-primary md:col-span-3">Block schedule</button>
        {message && <p className="md:col-span-3">{message}</p>}
      </form>

      <div className="mt-6 space-y-3">
        {data.length === 0 ? (
          <div className="card p-6 text-center muted">No blocked schedules.</div>
        ) : (
          data.map((block) => (
            <div
              className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              key={block.id}
            >
              <div>
                <strong>
                  {new Date(block.start_at).toLocaleString()} →{' '}
                  {new Date(block.end_at).toLocaleString()}
                </strong>
                <p className="muted mt-1 text-sm">{block.reason || 'No reason provided'}</p>
              </div>
              <button className="btn btn-danger" onClick={() => remove(block)}>
                <Trash2 size={16} /> Delete block
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
