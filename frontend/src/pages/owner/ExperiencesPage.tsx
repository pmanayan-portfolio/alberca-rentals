import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Archive, ImagePlus, Pencil, Trash2, X } from 'lucide-react';

import { OwnerTitle } from '../../components/OwnerShell';
import { api, mutate } from '../../lib/api';

type Experience = {
  id: number;
  title: string;
  description?: string | null;
  base_price: number | string;
  duration_hours?: number | null;
  image_url?: string | null;
  is_active: boolean;
  featured?: boolean;
};

type Draft = {
  title: string;
  description: string;
  base_price: string;
  duration_hours: string;
  is_active: boolean;
};

const blank: Draft = {
  title: '',
  description: '',
  base_price: '',
  duration_hours: '8',
  is_active: true,
};

export default function ExperiencesPage() {
  const [data, setData] = useState<Experience[]>([]);
  const [form, setForm] = useState<Draft>(blank);
  const [editing, setEditing] = useState<Experience | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const imagePreview = useMemo(
    () => (image ? URL.createObjectURL(image) : editing?.image_url ?? ''),
    [image, editing],
  );

  useEffect(() => {
    return () => {
      if (image && imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [image, imagePreview]);

  const load = async () => {
    setData(await api<Experience[]>('/api/owner/events'));
  };

  useEffect(() => {
    load().catch((error) => setMessage((error as Error).message));
  }, []);

  const reset = () => {
    setEditing(null);
    setForm(blank);
    setImage(null);
  };

  const beginEdit = (experience: Experience) => {
    setEditing(experience);
    setForm({
      title: experience.title,
      description: experience.description ?? '',
      base_price: String(experience.base_price ?? ''),
      duration_hours: String(experience.duration_hours ?? 8),
      is_active: Boolean(experience.is_active),
    });
    setImage(null);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    try {
      setSaving(true);
      const body = new FormData();
      body.append('title', form.title);
      body.append('description', form.description);
      body.append('base_price', form.base_price);
      body.append('duration_hours', form.duration_hours || '8');
      body.append('is_active', editing ? (editing.is_active ? '1' : '0') : '1');
      body.append('featured', '0');
      if (image) body.append('image', image);

      if (editing) {
        body.append('_method', 'PUT');
        await mutate(`/api/owner/events/${editing.id}`, {
          method: 'POST',
          body,
        });
        setMessage('Experience updated.');
      } else {
        await mutate('/api/owner/events', {
          method: 'POST',
          body,
        });
        setMessage('Experience added.');
      }

      reset();
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const archive = async (experience: Experience) => {
    if (!confirm(`Archive “${experience.title}”? It will disappear from the public website.`)) return;

    try {
      await mutate(`/api/owner/events/${experience.id}/archive`, { method: 'PATCH' });
      if (editing?.id === experience.id) reset();
      await load();
      setMessage('Experience archived.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const permanentlyDelete = async (experience: Experience) => {
    if (!confirm(`Permanently delete “${experience.title}”? This cannot be undone.`)) return;

    try {
      await mutate(`/api/owner/events/${experience.id}`, { method: 'DELETE' });
      if (editing?.id === experience.id) reset();
      await load();
      setMessage('Archived experience permanently deleted.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  return (
    <div className="shell py-10">
      <OwnerTitle
        title="Experiences"
        description="Create, update, archive and permanently delete event experiences."
      />

      <form onSubmit={submit} className="card grid gap-5 p-6 lg:grid-cols-[1fr_.75fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-[#541214]">
              {editing ? 'Update experience' : 'Add experience'}
            </h2>
            {editing && (
              <button type="button" className="btn btn-secondary" onClick={reset}>
                <X size={16} /> Cancel update
              </button>
            )}
          </div>

          <label>
            <span className="label">Experience name</span>
            <input
              className="field"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="label">Base price</span>
              <input
                className="field"
                type="number"
                min="0"
                step="0.01"
                value={form.base_price}
                onChange={(event) => setForm({ ...form, base_price: event.target.value })}
                required
              />
            </label>

            <label>
              <span className="label">Duration hours</span>
              <input
                className="field"
                type="number"
                min="1"
                max="72"
                value={form.duration_hours}
                onChange={(event) => setForm({ ...form, duration_hours: event.target.value })}
              />
            </label>
          </div>

          <label>
            <span className="label">Description</span>
            <textarea
              className="field min-h-28"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>

          <label>
            <span className="label">{editing ? 'Replace image (optional)' : 'Experience image (optional)'}</span>
            <input
              className="field"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            />
          </label>

          <button className="btn btn-primary" disabled={saving}>
            {editing ? <Pencil size={17} /> : <ImagePlus size={17} />}
            {saving ? 'Saving...' : editing ? 'Update experience' : 'Add experience'}
          </button>
        </div>

        <div className="rounded-3xl border border-[#e7d8c3] bg-[#fbfaf3] p-4">
          <p className="mb-3 text-sm font-bold text-[#541214]">Image preview</p>
          {imagePreview ? (
            <img src={imagePreview} alt="Experience preview" className="h-72 w-full rounded-2xl object-cover" />
          ) : (
            <div className="grid h-72 place-items-center rounded-2xl border border-dashed border-[#c59638]/50 text-[#877266]">
              No experience image
            </div>
          )}
        </div>

        {message && <p className="lg:col-span-2 whitespace-pre-line">{message}</p>}
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((experience) => (
          <article className="card overflow-hidden" key={experience.id}>
            {experience.image_url ? (
              <img src={experience.image_url} alt={experience.title} className="h-48 w-full object-cover" />
            ) : (
              <div className="grid h-48 place-items-center bg-[#f4f0e7] text-[#877266]">No image</div>
            )}

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl text-[#541214]">{experience.title}</h3>
                  <p className="mt-1 font-bold text-[#781c1d]">
                    ₱{Number(experience.base_price).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    experience.is_active
                      ? 'bg-[#efe3c6] text-[#781c1d]'
                      : 'bg-[#ece8e1] text-[#756b65]'
                  }`}
                >
                  {experience.is_active ? 'Active' : 'Archived'}
                </span>
              </div>

              {experience.description && <p className="muted mt-3 text-sm">{experience.description}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn btn-secondary" onClick={() => beginEdit(experience)}>
                  <Pencil size={16} /> Update
                </button>
                {experience.is_active ? (
                  <button className="btn btn-danger" onClick={() => archive(experience)}>
                    <Archive size={16} /> Archive
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={() => permanentlyDelete(experience)}>
                    <Trash2 size={16} /> Delete permanently
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
