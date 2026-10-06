import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

import { api } from '../lib/api';
import type {
  EventItem,
  Promotion,
  RentalItem,
  ShowcasePhoto,
} from '../types';
import { PromoCard } from './SpecialOffersPage';

const money = (amount: number | string) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Number(amount));

type ImagePreview = {
  images: string[];
  title: string;
  description?: string | null;
  price?: number | string | null;
};

const rentalImageUrls = (item: RentalItem) =>
  [
    item.image_url,
    ...(item.images ?? []).map((image) => image.image_url),
  ].filter((value): value is string => Boolean(value));

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [rentals, setRentals] = useState<RentalItem[]>([]);
  const [showcase, setShowcase] = useState<ShowcasePhoto[]>([]);
  const [preview, setPreview] = useState<ImagePreview | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const openPreview = (value: ImagePreview) => {
    setPreviewIndex(0);
    setPreview(value);
  };

  const previousPreviewImage = () => {
    if (!preview) return;
    setPreviewIndex((current) =>
      (current - 1 + preview.images.length) % preview.images.length,
    );
  };

  const nextPreviewImage = () => {
    if (!preview) return;
    setPreviewIndex((current) => (current + 1) % preview.images.length);
  };

  useEffect(() => {
    Promise.all([
      api<EventItem[]>('/api/events'),
      api<Promotion[]>('/api/promotions'),
      api<RentalItem[]>('/api/rentals/items'),
      api<ShowcasePhoto[]>('/api/showcase'),
    ]).then(([eventData, promoData, rentalData, showcaseData]) => {
      setEvents(eventData);
      setPromos(promoData);
      setRentals(rentalData);
      setShowcase(showcaseData);
    });
  }, []);

  const steps = [
    'Choose a date',
    'Select an experience or rental items',
    'Add your venue location',
    'Submit and receive booking status updates',
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="shell grid items-center gap-10 py-16 md:grid-cols-[1.2fr_.8fr] md:py-24">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c59638]">
            Events made personal
          </p>

          <h1 className="font-display mt-5 text-6xl leading-[0.95] md:text-7xl">
            Plan the moment.
            <br />
            <em className="text-[#c59638]">Rent what you need.</em>
          </h1>

          <p className="muted mt-6 max-w-2xl text-lg">
            Book an event experience, choose a limited-time package, or build a
            completely custom rental with tables, chairs, gowns, décor and more.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/custom-booking" className="btn btn-primary">
              Build custom booking
            </Link>

            <Link to="/offers" className="btn btn-secondary">
              View special offers
            </Link>
          </div>
        </div>

        {/* How It Works */}
        <div className="card bg-[#781c1d] p-8 text-white">
          <p className="text-xs uppercase tracking-[0.25em] text-[#000]/80">
            How it works
          </p>

          <div className="mt-8 space-y-6">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-4">
                <span className="font-display text-2xl text-[#e6cea0]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-[#000]/80">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rental Item Catalog */}
      <section className="shell py-12">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c59638]">
              What we rent
            </p>
            <h2 className="font-display mt-2 text-4xl">Explore our rental collection</h2>
            <p className="muted mt-2 max-w-2xl">
              Browse the gowns, tables, chairs, linens, décor and party essentials available for your event.
            </p>
          </div>

          <Link to="/custom-booking" className="font-bold text-[#781c1d] transition-opacity hover:opacity-70">
            Build a booking →
          </Link>
        </div>

        {rentals.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="muted">Rental items will appear here once they are added by the owner.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rentals.map((item) => (
              <article key={item.id} className="card group overflow-hidden">
                <button
                  type="button"
                  disabled={!item.image_url}
                  onClick={() =>
                    item.image_url &&
                    openPreview({
                      images: rentalImageUrls(item),
                      title: item.name,
                      description: item.description,
                      price: item.base_price,
                    })
                  }
                  className="block w-full text-left disabled:cursor-default"
                  aria-label={item.image_url ? `View ${item.name} image` : item.name}
                >
                  {item.image_url ? (
                    <div className="overflow-hidden bg-[#f4f0e6]">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-64 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                  ) : (
                    <div className="grid h-64 place-items-center bg-[#f4f0e6] text-[#877266]">
                      <div className="text-center">
                        <ImageIcon className="mx-auto mb-3" size={34} />
                        <span className="text-sm">Photo coming soon</span>
                      </div>
                    </div>
                  )}
                </button>

                <div className="p-6">
                  {item.category?.name && (
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c59638]">
                      {item.category.name}
                    </p>
                  )}
                  <h3 className="font-display mt-2 text-3xl">{item.name}</h3>
                  {item.description && (
                    <p className="muted mt-2 line-clamp-2">{item.description}</p>
                  )}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="muted block text-xs uppercase tracking-[.14em]">From</span>
                      <strong className="text-lg text-[#781c1d]">{money(item.base_price)}</strong>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.image_url && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() =>
                            openPreview({
                              images: rentalImageUrls(item),
                              title: item.name,
                              description: item.description,
                              price: item.base_price,
                            })
                          }
                        >
                          {rentalImageUrls(item).length > 1 ? 'View photos' : 'View image'}
                        </button>
                      )}
                      <Link to="/custom-booking" className="btn btn-primary">
                        Book
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Special Offers */}
      {promos.length > 0 && (
        <section className="shell py-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c59638]">
                Limited time
              </p>
              <h2 className="font-display mt-2 text-4xl">Special offers</h2>
            </div>

            <Link to="/offers" className="font-bold text-[#781c1d] transition-opacity hover:opacity-70">
              View all →
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {promos.slice(0, 3).map((promotion) => (
              <PromoCard key={promotion.id} promotion={promotion} />
            ))}
          </div>
        </section>
      )}

      {/* Real Event Showcase */}
      <section className="py-14">
        <div className="shell">
          <div className="mb-7 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c59638]">
              Real celebrations
            </p>
            <h2 className="font-display mt-2 text-4xl">Our rentals at real event venues</h2>
            <p className="muted mt-2">
              A look at Alberca Rentals in real celebrations, setups and venues from previous customers.
            </p>
          </div>

          {showcase.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="muted">Event photos will appear here after the owner uploads them.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {showcase.slice(0, 6).map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() =>
                    openPreview({
                      images: [photo.image_url],
                      title: photo.title || 'Alberca event setup',
                      description: photo.caption,
                    })
                  }
                  className={`group relative overflow-hidden rounded-[1.75rem] bg-[#f4f0e6] text-left ${
                    index === 0 ? 'md:col-span-2 lg:col-span-1' : ''
                  }`}
                >
                  <img
                    src={photo.image_url}
                    alt={photo.title || 'Alberca Rentals event setup'}
                    className="h-80 w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-5 pt-16 text-white">
                    <h3 className="font-display text-2xl">
                      {photo.title || 'Alberca event setup'}
                    </h3>
                    {photo.caption && (
                      <p className="mt-1 line-clamp-2 text-sm text-white/80">{photo.caption}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Experiences */}
      <section className="shell py-12">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c59638]">
          Experiences
        </p>

        <h2 className="font-display mb-7 mt-2 text-4xl">Choose your celebration</h2>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <article key={event.id} className="card overflow-hidden">
              {event.image_url && (
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="h-48 w-full object-cover"
                />
              )}

              <div className="p-6">
                <h3 className="font-display text-3xl">{event.title}</h3>
                <p className="muted mt-2 line-clamp-3">{event.description}</p>

                <div className="mt-5 flex items-center justify-between">
                  <strong>{money(event.base_price)}</strong>
                  <Link to={`/experience/${event.id}/book`} className="btn btn-primary">
                    Book
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Shared image preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${preview.title} preview`}
          onClick={() => setPreview(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] bg-[#fffdf8] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-[#781c1d] text-2xl font-bold text-white shadow-lg hover:bg-[#541214]"
              aria-label="Close image preview"
            >
              ×
            </button>

            <div className="relative bg-[#f4f0e6]">
              <img
                src={preview.images[previewIndex]}
                alt={`${preview.title} ${previewIndex + 1}`}
                className="max-h-[72vh] w-full object-contain"
              />

              {preview.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={previousPreviewImage}
                    className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-[#781c1d]/90 text-white shadow-lg transition hover:bg-[#541214]"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={26} />
                  </button>
                  <button
                    type="button"
                    onClick={nextPreviewImage}
                    className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-[#781c1d]/90 text-white shadow-lg transition hover:bg-[#541214]"
                    aria-label="Next image"
                  >
                    <ChevronRight size={26} />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
                    {previewIndex + 1} / {preview.images.length}
                  </div>
                </>
              )}
            </div>

            {preview.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-b border-[#e7d8c3] bg-[#fffaf0] p-3">
                {preview.images.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => setPreviewIndex(index)}
                    className={`shrink-0 overflow-hidden rounded-xl border-2 ${
                      index === previewIndex
                        ? 'border-[#c59638]'
                        : 'border-transparent'
                    }`}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img
                      src={src}
                      alt=""
                      className="h-16 w-20 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="p-6 text-center">
              <h3 className="font-display text-3xl text-[#541214]">{preview.title}</h3>
              {preview.description && (
                <p className="muted mx-auto mt-2 max-w-2xl">{preview.description}</p>
              )}
              {preview.price !== undefined && preview.price !== null && (
                <p className="mt-3 text-lg font-bold text-[#781c1d]">{money(preview.price)}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
