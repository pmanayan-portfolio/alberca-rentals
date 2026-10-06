import { type FormEvent, useEffect, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';

import { OwnerTitle } from '../../components/OwnerShell';
import { api, mutate } from '../../lib/api';

type Category = {
  id: number;
  name: string;
  description?: string | null;
  sort_order?: number;
  is_active: boolean;
};

type Draft = {
  name: string;
  description: string;
  sort_order: string;
  is_active: boolean;
};

const blank: Draft = {
  name: '',
  description: '',
  sort_order: '0',
  is_active: true,
};

export default function CategoriesPage() {
  const [data, setData] = useState<Category[]>([]);
  const [form, setForm] = useState<Draft>(blank);
  const [editing, setEditing] = useState<Category | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setData(await api<Category[]>('/api/owner/rental-categories'));
  };

  useEffect(() => {
    load().catch((error) => setMessage((error as Error).message));
  }, []);

  const reset = () => {
    setEditing(null);
    setForm(blank);
  };

  const beginEdit = (category: Category) => {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description ?? '',
      sort_order: String(category.sort_order ?? 0),
      is_active: Boolean(category.is_active),
    });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    try {
      setSaving(true);
      const payload = {
        name: form.name,
        description: form.description || null,
        sort_order: Number(form.sort_order || 0),
        is_active: form.is_active,
      };

      if (editing) {
        await mutate(`/api/owner/rental-categories/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setMessage('Category updated.');
      } else {
        await mutate('/api/owner/rental-categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage('Category added.');
      }

      reset();
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (category: Category) => {
    if (!confirm(`Delete category “${category.name}”?`)) return;

    try {
      await mutate(`/api/owner/rental-categories/${category.id}`, { method: 'DELETE' });
      if (editing?.id === category.id) reset();
      await load();
      setMessage('Category deleted.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  return (
    <div className="shell py-10">
      <OwnerTitle
        title="Rental categories"
        description="Organize your rental inventory into categories such as gowns, tables, chairs, linens and decorations."
      />

      <form onSubmit={submit} className="card grid gap-4 p-5 md:grid-cols-2">
        <div className="md:col-span-2 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-[#541214]">
            {editing ? `Update ${editing.name}` : 'Add category'}
          </h2>
          {editing && (
            <button type="button" className="btn btn-secondary" onClick={reset}>
              <X size={16} /> Cancel update
            </button>
          )}
        </div>

        <label>
          <span className="label">Category name</span>
          <input
            className="field"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
        </label>

        <label>
          <span className="label">Display order</span>
          <input
            className="field"
            type="number"
            value={form.sort_order}
            onChange={(event) => setForm({ ...form, sort_order: event.target.value })}
          />
        </label>

        <label className="md:col-span-2">
          <span className="label">Description</span>
          <textarea
            className="field min-h-24"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </label>

        <label className="md:col-span-2 flex items-center gap-3 rounded-2xl bg-[#f4f0e7] p-4">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
          />
          <span>
            <strong>Active category</strong>
            <span className="muted ml-2 text-sm">Visible to customers when enabled.</span>
          </span>
        </label>

        <button className="btn btn-primary md:col-span-2" disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Update category' : 'Add category'}
        </button>

        {message && <p className="md:col-span-2 whitespace-pre-line">{message}</p>}
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((category) => (
          <div className="card p-5" key={category.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong className="text-lg">{category.name}</strong>
                <div className="muted mt-1 text-sm">
                  {category.is_active ? 'Active' : 'Hidden'} · Order {category.sort_order ?? 0}
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  category.is_active
                    ? 'bg-[#efe3c6] text-[#781c1d]'
                    : 'bg-[#ece8e1] text-[#756b65]'
                }`}
              >
                {category.is_active ? 'Active' : 'Hidden'}
              </span>
            </div>

            {category.description && <p className="muted mt-3 text-sm">{category.description}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn btn-secondary" onClick={() => beginEdit(category)}>
                <Pencil size={16} /> Update
              </button>
              <button className="btn btn-danger" onClick={() => remove(category)}>
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
