import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Archive, ImagePlus, Pencil, Trash2, X } from 'lucide-react';

import { OwnerTitle } from '../../components/OwnerShell';
import { api, mutate } from '../../lib/api';
import type { ShowcasePhoto } from '../../types';

export default function ShowcasePage() {
  const [photos, setPhotos] = useState<ShowcasePhoto[]>([]);
  const [editing, setEditing] = useState<ShowcasePhoto | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [image, setImage] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const previewUrl = useMemo(
    () => (image ? URL.createObjectURL(image) : editing?.image_url ?? ''),
    [image, editing],
  );

  useEffect(() => {
    return () => {
      if (image && previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [image, previewUrl]);

  const load = async () => {
    setPhotos(await api<ShowcasePhoto[]>('/api/owner/showcase-photos'));
  };

  useEffect(() => {
    load().catch((error) => setMessage((error as Error).message));
  }, []);

  const reset = () => {
    setEditing(null);
    setTitle('');
    setCaption('');
    setEventDate('');
    setSortOrder('0');
    setImage(null);
  };

  const beginEdit = (photo: ShowcasePhoto) => {
    setEditing(photo);
    setTitle(photo.title ?? '');
    setCaption(photo.caption ?? '');
    setEventDate(photo.event_date?.slice(0, 10) ?? '');
    setSortOrder(String(photo.sort_order ?? 0));
    setImage(null);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (!editing && !image) {
      setMessage('Choose an event photo first.');
      return;
    }

    try {
      setSaving(true);

      const body = new FormData();
      if (image) body.append('image', image);
      if (title.trim()) body.append('title', title.trim());
      if (caption.trim()) body.append('caption', caption.trim());
      if (eventDate) body.append('event_date', eventDate);
      body.append('sort_order', sortOrder || '0');
      body.append('is_active', editing ? (editing.is_active ? '1' : '0') : '1');

      if (editing) {
        body.append('_method', 'PUT');
        await mutate(`/api/owner/showcase-photos/${editing.id}`, {
          method: 'POST',
          body,
        });
        setMessage('Gallery entry updated.');
      } else {
        await mutate('/api/owner/showcase-photos', {
          method: 'POST',
          body,
        });
        setMessage('Event photo added to the homepage showcase.');
      }

      reset();
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const archive = async (photo: ShowcasePhoto) => {
    if (!confirm('Archive this gallery photo? It will disappear from the homepage.')) return;

    try {
      await mutate(`/api/owner/showcase-photos/${photo.id}/archive`, {
        method: 'PATCH',
      });
      if (editing?.id === photo.id) reset();
      await load();
      setMessage('Gallery photo archived.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const remove = async (photo: ShowcasePhoto) => {
    if (!confirm('Permanently delete this archived gallery photo? This cannot be undone.')) return;

    try {
      await mutate(`/api/owner/showcase-photos/${photo.id}`, {
        method: 'DELETE',
      });
      if (editing?.id === photo.id) reset();
      await load();
      setMessage('Archived gallery photo permanently deleted.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  return (
    <div className="shell py-10">
      <OwnerTitle
        title="Event showcase"
        description="Upload real event photos, update their details, archive them from the homepage, or permanently delete archived entries."
      />

      <form onSubmit={submit} className="card grid gap-5 p-6 lg:grid-cols-[1fr_.9fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-[#541214]">
              {editing ? 'Update gallery entry' : 'Add gallery photo'}
            </h2>
            {editing && (
              <button type="button" className="btn btn-secondary" onClick={reset}>
                <X size={16} /> Cancel update
              </button>
            )}
          </div>

          <div>
            <label className="label" htmlFor="showcase-image">
              {editing ? 'Replace event photo (optional)' : 'Event photo'}
            </label>
            <input
              id="showcase-image"
              className="field"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
              required={!editing}
            />
            <p className="muted mt-2 text-xs">
              JPG, PNG or WebP. Maximum file size: 10 MB.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="label">Title (optional)</span>
              <input
                className="field"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Wedding reception setup"
              />
            </label>

            <label>
              <span className="label">Event date (optional)</span>
              <input
                className="field"
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              />
            </label>
          </div>

          <label>
            <span className="label">Caption (optional)</span>
            <textarea
              className="field min-h-28"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Describe the setup, venue, or rental items shown in the photo."
            />
          </label>

          <label className="block max-w-48">
            <span className="label">Display order</span>
            <input
              className="field"
              type="number"
              min="0"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </label>

          <button className="btn btn-primary" disabled={saving || (!editing && !image)}>
            {editing ? <Pencil size={18} /> : <ImagePlus size={18} />}
            {saving ? 'Saving...' : editing ? 'Update gallery entry' : 'Add to showcase'}
          </button>
        </div>

        <div className="rounded-3xl border border-[#e7d8c3] bg-[#fbfaf3] p-4">
          <p className="mb-3 text-sm font-bold text-[#541214]">Photo preview</p>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Selected event preview"
              className="h-72 w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="grid h-72 place-items-center rounded-2xl border border-dashed border-[#c59638]/50 text-center text-[#877266]">
              <div>
                <ImagePlus className="mx-auto mb-3" size={34} />
                <p>Choose a photo to preview it here.</p>
              </div>
            </div>
          )}
        </div>

        {message && <p className="whitespace-pre-line lg:col-span-2">{message}</p>}
      </form>

      <div className="mt-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-[#c59638]">
              Homepage gallery
            </p>
            <h2 className="font-display mt-2 text-3xl">Uploaded event photos</h2>
          </div>
          <span className="muted text-sm">
            {photos.length} photo{photos.length === 1 ? '' : 's'}
          </span>
        </div>

        {photos.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="muted">No event showcase photos have been uploaded yet.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <article key={photo.id} className="card overflow-hidden">
                <img
                  src={photo.image_url}
                  alt={photo.title || 'Alberca Rentals event setup'}
                  className="h-60 w-full object-cover"
                />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-2xl">
                        {photo.title || 'Alberca event setup'}
                      </h3>
                      {photo.event_date && (
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[.16em] text-[#c59638]">
                          {new Date(`${photo.event_date}T00:00:00`).toLocaleDateString('en-PH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        photo.is_active
                          ? 'bg-[#efe3c6] text-[#781c1d]'
                          : 'bg-[#ece8e1] text-[#756b65]'
                      }`}
                    >
                      {photo.is_active ? 'Active' : 'Archived'}
                    </span>
                  </div>

                  {photo.caption && <p className="muted mt-3 text-sm">{photo.caption}</p>}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn btn-secondary" onClick={() => beginEdit(photo)}>
                      <Pencil size={16} /> Update
                    </button>
                    {photo.is_active ? (
                      <button className="btn btn-danger" onClick={() => archive(photo)}>
                        <Archive size={16} /> Archive
                      </button>
                    ) : (
                      <button className="btn btn-danger" onClick={() => remove(photo)}>
                        <Trash2 size={16} /> Delete permanently
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
