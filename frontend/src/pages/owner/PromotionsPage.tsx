import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Archive, Pencil, Trash2, X } from 'lucide-react';

import { OwnerTitle } from '../../components/OwnerShell';
import { api, mutate } from '../../lib/api';

type VariantOption = {
  id: number;
  name: string;
  is_active?: boolean;
};

type RentalItemOption = {
  id: number;
  name: string;
  status?: string;
  is_active?: boolean;
  track_variants?: boolean;
  variants?: VariantOption[];
};

type Line = {
  rental_item_id: string;
  rental_item_variant_id: string;
  quantity: number;
};

type PromotionRecord = {
  id: number;
  title: string;
  description?: string | null;
  image_url?: string | null;
  discount_type: 'fixed' | 'percent';
  discount_value: number | string;
  booking_ends_at?: string | null;
  rental_start_date?: string | null;
  rental_end_date?: string | null;
  max_redemptions?: number | null;
  is_active: boolean;
  featured?: boolean;
  items?: Array<{
    id: number;
    rental_item_id: number;
    rental_item_variant_id?: number | null;
    quantity: number;
    item?: RentalItemOption | null;
    variant?: VariantOption | null;
  }>;
};

type Draft = {
  title: string;
  description: string;
  discount_type: 'fixed' | 'percent';
  discount_value: string;
  booking_ends_at: string;
  rental_start_date: string;
  rental_end_date: string;
  max_redemptions: string;
  is_active: boolean;
  lines: Line[];
};

const blankLine = (): Line => ({
  rental_item_id: '',
  rental_item_variant_id: '',
  quantity: 1,
});

const blankDraft = (): Draft => ({
  title: '',
  description: '',
  discount_type: 'fixed',
  discount_value: '200',
  booking_ends_at: '',
  rental_start_date: '',
  rental_end_date: '',
  max_redemptions: '',
  is_active: true,
  lines: [blankLine()],
});

function localDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function draftFromPromotion(promotion: PromotionRecord): Draft {
  return {
    title: promotion.title,
    description: promotion.description ?? '',
    discount_type: promotion.discount_type,
    discount_value: String(promotion.discount_value ?? ''),
    booking_ends_at: localDateTime(promotion.booking_ends_at),
    rental_start_date: promotion.rental_start_date?.slice(0, 10) ?? '',
    rental_end_date: promotion.rental_end_date?.slice(0, 10) ?? '',
    max_redemptions: promotion.max_redemptions ? String(promotion.max_redemptions) : '',
    is_active: Boolean(promotion.is_active),
    lines: promotion.items?.length
      ? promotion.items.map((line) => ({
          rental_item_id: String(line.rental_item_id),
          rental_item_variant_id: line.rental_item_variant_id
            ? String(line.rental_item_variant_id)
            : '',
          quantity: Number(line.quantity || 1),
        }))
      : [blankLine()],
  };
}

export default function PromotionsPage() {
  const [data, setData] = useState<PromotionRecord[]>([]);
  const [items, setItems] = useState<RentalItemOption[]>([]);
  const [form, setForm] = useState<Draft>(blankDraft());
  const [editing, setEditing] = useState<PromotionRecord | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const selectableItems = useMemo(
    () => items.filter((item) => item.is_active !== false && item.status !== 'archived'),
    [items],
  );

  const load = async () => {
    const [promotions, rentalItems] = await Promise.all([
      api<PromotionRecord[]>('/api/owner/promotions'),
      api<RentalItemOption[]>('/api/owner/rental-items'),
    ]);

    setData(promotions);
    setItems(rentalItems);
  };

  useEffect(() => {
    load().catch((error) => setMessage((error as Error).message));
  }, []);

  const updateLine = (index: number, changes: Partial<Line>) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...changes } : line,
      ),
    }));
  };

  const beginEdit = (promotion: PromotionRecord) => {
    setEditing(promotion);
    setForm(draftFromPromotion(promotion));
    setImage(null);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetEditor = () => {
    setEditing(null);
    setForm(blankDraft());
    setImage(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (form.lines.some((line) => !line.rental_item_id)) {
      setMessage('Select a rental item for every package row.');
      return;
    }

    try {
      setSaving(true);

      const body = new FormData();
      body.append('title', form.title);
      body.append('description', form.description);
      body.append('discount_type', form.discount_type);
      body.append('discount_value', String(form.discount_value));
      body.append('is_active', form.is_active ? '1' : '0');
      body.append('featured', '1');

      if (form.booking_ends_at) body.append('booking_ends_at', form.booking_ends_at);
      if (form.rental_start_date) body.append('rental_start_date', form.rental_start_date);
      if (form.rental_end_date || form.rental_start_date) {
        body.append('rental_end_date', form.rental_end_date || form.rental_start_date);
      }
      if (form.max_redemptions) body.append('max_redemptions', form.max_redemptions);

      body.append(
        'items',
        JSON.stringify(
          form.lines.map((line) => ({
            rental_item_id: Number(line.rental_item_id),
            rental_item_variant_id: line.rental_item_variant_id
              ? Number(line.rental_item_variant_id)
              : null,
            quantity: Number(line.quantity),
          })),
        ),
      );

      if (image) body.append('image', image);

      if (editing) {
        body.append('_method', 'PUT');
        await mutate(`/api/owner/promotions/${editing.id}`, {
          method: 'POST',
          body,
        });
        setMessage('Special offer updated.');
      } else {
        await mutate('/api/owner/promotions', {
          method: 'POST',
          body,
        });
        setMessage('Special offer created.');
      }

      resetEditor();
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const archive = async (promotion: PromotionRecord) => {
    if (!confirm(`Archive “${promotion.title}”? It will disappear from the public offers page.`)) return;
    try {
      await mutate(`/api/owner/promotions/${promotion.id}/archive`, { method: 'PATCH' });
      if (editing?.id === promotion.id) resetEditor();
      await load();
      setMessage('Special offer archived.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const permanentlyDelete = async (promotion: PromotionRecord) => {
    if (!confirm(`Permanently delete “${promotion.title}”? This cannot be undone.`)) return;
    try {
      await mutate(`/api/owner/promotions/${promotion.id}`, { method: 'DELETE' });
      if (editing?.id === promotion.id) resetEditor();
      await load();
      setMessage('Archived special offer permanently deleted.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  return (
    <div className="shell py-10">
      <OwnerTitle
        title="Special offers"
        description="Create limited-time rental packages, edit their included items, archive finished offers, and permanently delete archived offers."
      />

      <form onSubmit={submit} className="card grid gap-4 p-6 md:grid-cols-2">
        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-b border-[#e7d8c3] pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-[#c59638]">
              {editing ? 'Update offer' : 'New offer'}
            </p>
            <h2 className="font-display mt-1 text-3xl text-[#541214]">
              {editing ? editing.title : 'Create a special offer'}
            </h2>
          </div>
          {editing && (
            <button type="button" className="btn btn-secondary" onClick={resetEditor}>
              <X size={16} /> Cancel update
            </button>
          )}
        </div>

        <label>
          <span className="label">Offer name</span>
          <input
            className="field"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            required
          />
        </label>

        <label>
          <span className="label">Discount type</span>
          <select
            className="field"
            value={form.discount_type}
            onChange={(event) =>
              setForm({ ...form, discount_type: event.target.value as Draft['discount_type'] })
            }
          >
            <option value="fixed">Fixed ₱ discount</option>
            <option value="percent">Percentage discount</option>
          </select>
        </label>

        <label>
          <span className="label">Discount amount</span>
          <input
            className="field"
            type="number"
            min="0"
            step="0.01"
            value={form.discount_value}
            onChange={(event) => setForm({ ...form, discount_value: event.target.value })}
            required
          />
        </label>

        <label>
          <span className="label">Booking deadline</span>
          <input
            className="field"
            type="datetime-local"
            value={form.booking_ends_at}
            onChange={(event) => setForm({ ...form, booking_ends_at: event.target.value })}
          />
        </label>

        <label>
          <span className="label">Rental/event date</span>
          <input
            className="field"
            type="date"
            value={form.rental_start_date}
            onChange={(event) => setForm({ ...form, rental_start_date: event.target.value })}
          />
        </label>

        <label>
          <span className="label">Return date</span>
          <input
            className="field"
            type="date"
            min={form.rental_start_date || undefined}
            value={form.rental_end_date}
            onChange={(event) => setForm({ ...form, rental_end_date: event.target.value })}
          />
        </label>

        <label>
          <span className="label">Maximum redemptions</span>
          <input
            className="field"
            type="number"
            min="1"
            placeholder="Optional"
            value={form.max_redemptions}
            onChange={(event) => setForm({ ...form, max_redemptions: event.target.value })}
          />
        </label>

        <label>
          <span className="label">Offer image</span>
          <input
            className="field"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
          />
          {editing?.image_url && !image && (
            <p className="muted mt-2 text-xs">Leave blank to keep the current image.</p>
          )}
        </label>

        <label className="md:col-span-2">
          <span className="label">Description</span>
          <textarea
            className="field min-h-24"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </label>

        <div className="md:col-span-2 rounded-2xl bg-[#f4f0e7] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <strong>Package items</strong>
              <p className="muted mt-1 text-xs">
                Choose the exact rental items, optional variant/size, and quantity included in this offer.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, blankLine()] }))}
            >
              Add another item
            </button>
          </div>

          {selectableItems.length === 0 && (
            <div className="mt-4 rounded-xl border border-[#c59638]/40 bg-[#fffaf0] p-4 text-sm text-[#781c1d]">
              No active rental items are available. Add or reactivate items under Rental Items first.
            </div>
          )}

          <div className="mt-4 space-y-3">
            {form.lines.map((line, index) => {
              const selectedItem = items.find(
                (item) => String(item.id) === String(line.rental_item_id),
              );
              const options = editing && selectedItem && !selectableItems.some((x) => x.id === selectedItem.id)
                ? [selectedItem, ...selectableItems]
                : selectableItems;

              return (
                <div
                  className="grid gap-2 md:grid-cols-[1fr_1fr_130px_auto]"
                  key={index}
                >
                  <label>
                    <span className="label">Rental item</span>
                    <select
                      className="field"
                      value={line.rental_item_id}
                      onChange={(event) =>
                        updateLine(index, {
                          rental_item_id: event.target.value,
                          rental_item_variant_id: '',
                        })
                      }
                      required
                    >
                      <option value="">Choose rental item</option>
                      {options.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}{item.status === 'archived' ? ' (Archived)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="label">Variant / size</span>
                    <select
                      className="field"
                      disabled={!selectedItem?.track_variants}
                      value={line.rental_item_variant_id}
                      onChange={(event) =>
                        updateLine(index, { rental_item_variant_id: event.target.value })
                      }
                    >
                      <option value="">
                        {selectedItem?.track_variants ? 'Choose variant' : 'No variant'}
                      </option>
                      {selectedItem?.variants
                        ?.filter((variant) => variant.is_active !== false)
                        .map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label>
                    <span className="label">Quantity</span>
                    <input
                      className="field"
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(index, { quantity: Number(event.target.value) })
                      }
                      required
                    />
                  </label>

                  <button
                    type="button"
                    className="btn btn-danger self-end"
                    disabled={form.lines.length === 1}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
                      }))
                    }
                    aria-label="Remove package item"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <button className="btn btn-primary md:col-span-2" disabled={saving || selectableItems.length === 0}>
          {saving ? 'Saving...' : editing ? 'Update offer' : 'Publish offer'}
        </button>

        {message && <p className="md:col-span-2 whitespace-pre-line">{message}</p>}
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {data.map((promotion) => (
          <article className="card overflow-hidden" key={promotion.id}>
            {promotion.image_url && (
              <img src={promotion.image_url} className="h-44 w-full object-cover" alt={promotion.title} />
            )}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl text-[#541214]">{promotion.title}</h3>
                  <p className="muted mt-1">
                    {promotion.discount_type === 'fixed' ? '₱' : ''}
                    {promotion.discount_value}
                    {promotion.discount_type === 'percent' ? '%' : ''} off
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    promotion.is_active
                      ? 'bg-[#efe3c6] text-[#781c1d]'
                      : 'bg-[#ece8e1] text-[#756b65]'
                  }`}
                >
                  {promotion.is_active ? 'Active' : 'Archived'}
                </span>
              </div>

              <div className="mt-3 text-sm">
                {promotion.items?.map((line) => (
                  <div key={line.id}>
                    • {line.quantity} × {line.item?.name ?? 'Deleted item'}
                    {line.variant ? ` - ${line.variant.name}` : ''}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button className="btn btn-secondary" onClick={() => beginEdit(promotion)}>
                  <Pencil size={16} /> Update
                </button>

                {promotion.is_active ? (
                  <button className="btn btn-danger" onClick={() => archive(promotion)}>
                    <Archive size={16} /> Archive
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={() => permanentlyDelete(promotion)}>
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
