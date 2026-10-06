import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ImagePlus,
  Images,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

import { OwnerTitle } from '../../components/OwnerShell';
import { api, mutate } from '../../lib/api';
import type {
  RentalItem,
  RentalItemImage,
} from '../../types';

type RentalCategory = {
  id: number;
  name: string;
};

type VariantDraft = {
  name: string;
  sku: string;
  stock_quantity: number;
  price_adjustment: number;
};

type RentalDraft = {
  rental_category_id: string;
  name: string;
  description: string;
  base_price: string;
  total_stock: string;
  maximum_quantity: string;
  track_variants: boolean;
  status: string;
  is_active: boolean;
  variants: VariantDraft[];
};

const emptyDraft: RentalDraft = {
  rental_category_id: '',
  name: '',
  description: '',
  base_price: '',
  total_stock: '',
  maximum_quantity: '',
  track_variants: false,
  status: 'available',
  is_active: true,
  variants: [],
};

const money = (amount: number | string) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(amount || 0));

function draftFromItem(item: RentalItem): RentalDraft {
  return {
    rental_category_id: String(item.rental_category_id),
    name: item.name,
    description: item.description ?? '',
    base_price: String(item.base_price ?? ''),
    total_stock: String(item.total_stock ?? 0),
    maximum_quantity:
      item.maximum_quantity === null || item.maximum_quantity === undefined
        ? ''
        : String(item.maximum_quantity),
    track_variants: Boolean(item.track_variants),
    status: item.status === 'archived' ? 'available' : item.status,
    is_active: item.status !== 'archived',
    variants: (item.variants ?? []).map((variant) => ({
      name: variant.name,
      sku: variant.sku ?? '',
      stock_quantity: Number(variant.stock_quantity ?? 0),
      price_adjustment: Number(variant.price_adjustment ?? 0),
    })),
  };
}

export default function RentalsPage() {
  const [data, setData] = useState<RentalItem[]>([]);
  const [categories, setCategories] = useState<RentalCategory[]>([]);
  const [form, setForm] = useState<RentalDraft>(emptyDraft);
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const imagePreview = useMemo(
    () => (image ? URL.createObjectURL(image) : ''),
    [image],
  );

  const galleryPreviews = useMemo(
    () => galleryImages.map((file) => ({
      file,
      src: URL.createObjectURL(file),
    })),
    [galleryImages],
  );

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    return () => {
      galleryPreviews.forEach((preview) => URL.revokeObjectURL(preview.src));
    };
  }, [galleryPreviews]);

  const load = async () => {
    const [items, cats] = await Promise.all([
      api<RentalItem[]>('/api/owner/rental-items'),
      api<RentalCategory[]>('/api/owner/rental-categories'),
    ]);

    setData(items);
    setCategories(cats);
    return items;
  };

  useEffect(() => {
    load().catch((error) => setMessage((error as Error).message));
  }, []);

  const resetEditor = () => {
    setEditingItem(null);
    setForm(emptyDraft);
    setImage(null);
    setGalleryImages([]);
  };

  const beginEdit = (item: RentalItem) => {
    setEditingItem(item);
    setForm(draftFromItem(item));
    setImage(null);
    setGalleryImages([]);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addVariant = () => {
    setForm((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          name: '',
          sku: '',
          stock_quantity: 1,
          price_adjustment: 0,
        },
      ],
    }));
  };

  const updateVariant = (
    index: number,
    key: keyof VariantDraft,
    value: string | number,
  ) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, currentIndex) =>
        currentIndex === index
          ? { ...variant, [key]: value }
          : variant,
      ),
    }));
  };

  const removeVariant = (index: number) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    try {
      setSaving(true);

      const body = new FormData();
      body.append('rental_category_id', form.rental_category_id);
      body.append('name', form.name);
      body.append('description', form.description);
      body.append('base_price', form.base_price);
      body.append('total_stock', form.total_stock);
      body.append('minimum_quantity', '1');
      body.append('track_variants', form.track_variants ? '1' : '0');
      body.append('status', form.status);
      body.append('is_active', form.status === 'archived' ? '0' : '1');

      if (form.maximum_quantity) {
        body.append('maximum_quantity', form.maximum_quantity);
      }

      if (form.track_variants) {
        body.append('variants', JSON.stringify(form.variants));
      }

      if (image) {
        body.append('image', image);
      }

      galleryImages.forEach((file) => {
        body.append('gallery_images[]', file);
      });

      let saved: RentalItem;

      if (editingItem) {
        // Method spoofing lets Laravel parse multipart uploads correctly on update.
        body.append('_method', 'PUT');

        saved = await mutate<RentalItem>(
          `/api/owner/rental-items/${editingItem.id}`,
          {
            method: 'POST',
            body,
          },
        );
      } else {
        saved = await mutate<RentalItem>('/api/owner/rental-items', {
          method: 'POST',
          body,
        });
      }

      const wasEditing = Boolean(editingItem);
      const items = await load();

      if (wasEditing) {
        const refreshed = items.find((item) => item.id === saved.id) ?? saved;
        setEditingItem(refreshed);
        setForm(draftFromItem(refreshed));
        setImage(null);
        setGalleryImages([]);
        setMessage('Rental item updated successfully.');
      } else {
        resetEditor();
        setMessage('Rental item added successfully.');
      }
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const archive = async (item: RentalItem) => {
    if (!confirm(`Archive ${item.name}?`)) return;

    try {
      await mutate(`/api/owner/rental-items/${item.id}`, {
        method: 'DELETE',
      });

      if (editingItem?.id === item.id) {
        resetEditor();
      }

      await load();
      setMessage(`${item.name} archived.`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const deleteGalleryImage = async (
    item: RentalItem,
    galleryImage: RentalItemImage,
  ) => {
    if (!confirm('Remove this additional image?')) return;

    try {
      await mutate(
        `/api/owner/rental-items/${item.id}/images/${galleryImage.id}`,
        { method: 'DELETE' },
      );

      const items = await load();
      const refreshed = items.find((candidate) => candidate.id === item.id);

      if (editingItem?.id === item.id && refreshed) {
        setEditingItem(refreshed);
      }

      setMessage('Additional image removed.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const currentPrimaryImage = imagePreview || editingItem?.image_url || '';

  return (
    <div className="shell py-10">
      <OwnerTitle
        title="Rental items"
        description="Manage rental details, stock, variants and product photos. Each item can have one main image plus up to 12 additional gallery images."
      />

      <form
        onSubmit={submit}
        className="card grid gap-5 p-6 lg:grid-cols-[1.2fr_.8fr]"
      >
        <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 border-b border-[#e7d8c3] pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#c59638]">
              {editingItem ? 'Update item' : 'New item'}
            </p>
            <h2 className="font-display mt-1 text-3xl text-[#541214]">
              {editingItem ? editingItem.name : 'Add a rental item'}
            </h2>
          </div>

          {editingItem && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetEditor}
            >
              <X size={17} />
              Cancel update
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="label">Category</span>
            <select
              className="field"
              value={form.rental_category_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  rental_category_id: event.target.value,
                }))
              }
              required
            >
              <option value="">Choose category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="label">Item name</span>
            <input
              className="field"
              placeholder="Aurora Wedding Gown"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
          </label>

          <label>
            <span className="label">Rental price</span>
            <input
              className="field"
              type="number"
              min="0"
              step="0.01"
              placeholder="5000"
              value={form.base_price}
              onChange={(event) =>
                setForm((current) => ({ ...current, base_price: event.target.value }))
              }
              required
            />
          </label>

          <label>
            <span className="label">Total stock</span>
            <input
              className="field"
              type="number"
              min="0"
              placeholder="4"
              value={form.total_stock}
              onChange={(event) =>
                setForm((current) => ({ ...current, total_stock: event.target.value }))
              }
              required
            />
          </label>

          <label>
            <span className="label">Maximum per booking</span>
            <input
              className="field"
              type="number"
              min="1"
              placeholder="Optional"
              value={form.maximum_quantity}
              onChange={(event) =>
                setForm((current) => ({ ...current, maximum_quantity: event.target.value }))
              }
            />
          </label>

          <label>
            <span className="label">Status</span>
            <select
              className="field"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value }))
              }
            >
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
              <option value="maintenance">Under maintenance</option>
              <option value="damaged">Damaged</option>
            </select>
          </label>

          <label className="md:col-span-2">
            <span className="label">Description</span>
            <textarea
              className="field min-h-28"
              placeholder="Describe the rental item, material, dimensions, color, style or other useful details."
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-[#e7d8c3] px-4 py-3 md:col-span-2">
            <input
              type="checkbox"
              checked={form.track_variants}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  track_variants: event.target.checked,
                  variants: event.target.checked ? current.variants : [],
                }))
              }
            />
            <span>Track variants / sizes (recommended for gowns and dresses)</span>
          </label>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-[#e7d8c3] bg-[#fbfaf3] p-4">
            <label className="label" htmlFor="rental-image">
              Main item image
            </label>
            <input
              key={`${editingItem?.id ?? 'new'}-${image?.name ?? 'empty'}`}
              id="rental-image"
              className="field"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            />
            <p className="muted mt-2 text-xs">
              Used as the cover image on cards. JPG, PNG or WebP, maximum 5 MB.
            </p>

            <div className="mt-4 overflow-hidden rounded-2xl border border-dashed border-[#c59638]/50">
              {currentPrimaryImage ? (
                <img
                  src={currentPrimaryImage}
                  alt="Rental item preview"
                  className="h-64 w-full object-cover"
                />
              ) : (
                <div className="grid h-64 place-items-center text-center text-[#877266]">
                  <div>
                    <ImagePlus className="mx-auto mb-3" size={34} />
                    <p>Upload the main photo customers see first.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#e7d8c3] bg-[#fbfaf3] p-4">
            <label className="label" htmlFor="rental-gallery-images">
              Additional item images
            </label>
            <input
              key={`${editingItem?.id ?? 'new'}-${galleryImages.length}`}
              id="rental-gallery-images"
              className="field"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) =>
                setGalleryImages(Array.from(event.target.files ?? []))
              }
            />
            <p className="muted mt-2 text-xs">
              Select multiple photos for the customer image slider. Up to 8 can be added at once and 12 stored per item.
            </p>

            {galleryPreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {galleryPreviews.map((preview, index) => (
                  <div
                    key={`${preview.file.name}-${index}`}
                    className="relative overflow-hidden rounded-xl border border-[#e7d8c3]"
                  >
                    <img
                      src={preview.src}
                      alt={`New gallery preview ${index + 1}`}
                      className="h-28 w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {editingItem?.images && editingItem.images.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-bold text-[#541214]">
                  Current additional images
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {editingItem.images.map((galleryImage) => (
                    <div
                      key={galleryImage.id}
                      className="group relative overflow-hidden rounded-xl border border-[#e7d8c3]"
                    >
                      <img
                        src={galleryImage.image_url}
                        alt={`${editingItem.name} additional image`}
                        className="h-28 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => deleteGalleryImage(editingItem, galleryImage)}
                        className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-[#781c1d] text-white shadow-lg transition hover:bg-[#541214]"
                        aria-label="Remove additional image"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {form.track_variants && (
          <div className="rounded-2xl bg-[#f4f0e6] p-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong>Variants / sizes</strong>
                <p className="muted mt-1 text-sm">
                  Give each gown size or item variant its own stock count.
                </p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={addVariant}>
                Add size / variant
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {form.variants.map((variant, index) => (
                <div className="grid gap-2 md:grid-cols-4" key={index}>
                  <input
                    className="field"
                    placeholder="Name, e.g. Medium"
                    value={variant.name}
                    onChange={(event) => updateVariant(index, 'name', event.target.value)}
                    required
                  />
                  <input
                    className="field"
                    placeholder="SKU (optional)"
                    value={variant.sku}
                    onChange={(event) => updateVariant(index, 'sku', event.target.value)}
                  />
                  <input
                    className="field"
                    type="number"
                    min="0"
                    placeholder="Stock"
                    value={variant.stock_quantity}
                    onChange={(event) =>
                      updateVariant(index, 'stock_quantity', Number(event.target.value))
                    }
                  />
                  <div className="flex gap-2">
                    <input
                      className="field"
                      type="number"
                      step="0.01"
                      placeholder="Price +/−"
                      value={variant.price_adjustment}
                      onChange={(event) =>
                        updateVariant(index, 'price_adjustment', Number(event.target.value))
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-danger !px-3"
                      onClick={() => removeVariant(index)}
                      aria-label="Remove variant"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}

              {form.variants.length === 0 && (
                <p className="muted text-sm">
                  Click “Add size / variant” to add the first option.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 lg:col-span-2">
          <button className="btn btn-primary" disabled={saving}>
            {saving
              ? editingItem
                ? 'Updating rental item...'
                : 'Adding rental item...'
              : editingItem
                ? 'Save item updates'
                : 'Add rental item'}
          </button>

          {editingItem && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetEditor}
            >
              Cancel
            </button>
          )}
        </div>

        {message && (
          <p className="whitespace-pre-line lg:col-span-2">{message}</p>
        )}
      </form>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {data.map((item) => (
          <article className="card overflow-hidden" key={item.id}>
            {item.image_url ? (
              <div className="relative">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-52 w-full object-cover"
                />
                {item.images && item.images.length > 0 && (
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white">
                    <Images size={14} />
                    {item.images.length + 1} photos
                  </span>
                )}
              </div>
            ) : (
              <div className="grid h-52 place-items-center bg-[#f4f0e6] text-[#877266]">
                <div className="text-center">
                  <ImagePlus className="mx-auto mb-2" size={30} />
                  <span className="text-sm">No item image</span>
                </div>
              </div>
            )}

            <div className="p-5">
              <div className="text-xs font-bold uppercase tracking-[.18em] text-[#c59638]">
                {item.category?.name}
              </div>
              <h3 className="font-display mt-1 text-2xl">{item.name}</h3>
              <p className="mt-2 font-bold text-[#781c1d]">{money(item.base_price)}</p>
              <p className="muted mt-1 text-sm">
                Stock: {item.total_stock} · {item.status}
              </p>

              {item.variants?.length > 0 && (
                <div className="mt-3 text-sm">
                  {item.variants.map((variant) => (
                    <div key={variant.id}>
                      • {variant.name}: {variant.stock_quantity}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => beginEdit(item)}
                  className="btn btn-primary"
                >
                  <Pencil size={16} />
                  Update
                </button>

                <button
                  type="button"
                  onClick={() => archive(item)}
                  className="btn btn-danger"
                  disabled={item.status === 'archived'}
                >
                  Archive
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
