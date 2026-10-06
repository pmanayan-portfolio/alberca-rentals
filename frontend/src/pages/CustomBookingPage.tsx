import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { FormEvent } from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  api,
  mutate,
} from '../lib/api';

/* =========================================================
   TYPES
   ========================================================= */

type RentalVariant = {
  id: number;
  name: string;

  price_adjustment?: number | string | null;

  stock_quantity?: number | null;
  available_quantity?: number | null;
  available_stock?: number | null;

  is_active?: boolean;
};

type RentalImage = {
  id: number;
  image_url: string;
  image_path?: string | null;
  sort_order?: number;
};

type RentalItem = {
  id: number;
  name: string;
  description?: string | null;

  base_price: number | string;

  stock_quantity?: number | null;
  available_quantity?: number | null;
  available_stock?: number | null;

  status?: string;
  is_active?: boolean;

  image_url?: string | null;
  image_path?: string | null;
  images?: RentalImage[];

  variants?: RentalVariant[];
};

type SelectedRental = {
  rental_item_id: number;
  rental_item_variant_id: number | null;
  quantity: number;
};

type ScheduleStatus = {
  available: boolean;
  message: string;

  reason?: string | null;
  blocked_start?: string | null;
  blocked_end?: string | null;
};

type LocationValue = {
  address: string;
  latitude: number | null;
  longitude: number | null;
};

/* =========================================================
   HELPERS
   ========================================================= */

function money(
  value:
    | number
    | string
    | null
    | undefined,
) {
  return new Intl.NumberFormat(
    'en-PH',
    {
      style: 'currency',
      currency: 'PHP',
    },
  ).format(Number(value || 0));
}

function formatDateTime(
  value?: string | null,
) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    'en-PH',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  );
}

function getAvailableQuantity(
  item: RentalItem,
  variant?: RentalVariant | null,
) {
  if (variant) {
    return Number(
      variant.available_quantity ??
        variant.available_stock ??
        variant.stock_quantity ??
        0,
    );
  }

  return Number(
    item.available_quantity ??
      item.available_stock ??
      item.stock_quantity ??
      0,
  );
}

function getUnitPrice(
  item: RentalItem,
  variant?: RentalVariant | null,
) {
  return (
    Number(
      item.base_price || 0,
    ) +
    Number(
      variant?.price_adjustment ||
        0,
    )
  );
}

function rentalImageUrls(item: RentalItem) {
  return [
    item.image_url,
    ...(item.images ?? []).map((image) => image.image_url),
  ].filter((value): value is string => Boolean(value));
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function CustomBookingPage() {
  const navigate = useNavigate();

  /* -------------------------------------------------------
     SUCCESS MODAL
     ------------------------------------------------------- */

  const [
    showSuccessModal,
    setShowSuccessModal,
  ] = useState(false);

  /* -------------------------------------------------------
     SCHEDULE
     ------------------------------------------------------- */

  const [
    date,
    setDate,
  ] = useState('');

  const [
    endDate,
    setEndDate,
  ] = useState('');

  const [
    scheduleStatus,
    setScheduleStatus,
  ] =
    useState<ScheduleStatus | null>(
      null,
    );

  const [
    checkingSchedule,
    setCheckingSchedule,
  ] =
    useState(false);

  const scheduleRequestId =
    useRef(0);

  /* -------------------------------------------------------
     RENTAL ITEMS
     ------------------------------------------------------- */

  const [
    items,
    setItems,
  ] =
    useState<RentalItem[]>(
      [],
    );

  const [
    previewItem,
    setPreviewItem,
  ] = useState<RentalItem | null>(null);

  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  const openItemPreview = (item: RentalItem) => {
    setPreviewImageIndex(0);
    setPreviewItem(item);
  };

  const [
    loadingItems,
    setLoadingItems,
  ] =
    useState(false);

  const [
    selected,
    setSelected,
  ] = useState<
    Record<
      string,
      SelectedRental
    >
  >({});

  /* -------------------------------------------------------
     CUSTOMER FORM
     ------------------------------------------------------- */

  const [
    form,
    setForm,
  ] = useState({
    start_time: '14:00',
    end_time: '20:00',

    delivery_method:
      'delivery',

    customer_name: '',
    customer_email: '',
    customer_phone: '',

    notes: '',
  });

  /* -------------------------------------------------------
     LOCATION
     ------------------------------------------------------- */

  const [
    location,
    setLocation,
  ] =
    useState<LocationValue>({
      address: '',
      latitude: null,
      longitude: null,
    });

  const [
    locationMessage,
    setLocationMessage,
  ] =
    useState('');

  /* -------------------------------------------------------
     FORM STATUS
     ------------------------------------------------------- */

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  /* =========================================================
     IMMEDIATE OWNER AVAILABILITY CHECK
     ========================================================= */

  useEffect(() => {
    if (
      !date ||
      !form.start_time ||
      !form.end_time
    ) {
      setScheduleStatus(null);
      setItems([]);
      setSelected({});

      return;
    }

    const currentRequest =
      ++scheduleRequestId.current;

    const timer =
      window.setTimeout(
        async () => {
          try {
            setCheckingSchedule(
              true,
            );

            setMessage('');

            const params =
              new URLSearchParams(
                {
                  booking_date:
                    date,

                  start_time:
                    form.start_time,

                  end_time:
                    form.end_time,
                },
              );

            if (endDate) {
              params.set(
                'rental_end_date',
                endDate,
              );
            }

            const result =
              await api<ScheduleStatus>(
                `/api/booking-schedule/check?${params.toString()}`,
              );

            if (
              currentRequest !==
              scheduleRequestId.current
            ) {
              return;
            }

            setScheduleStatus(
              result,
            );

            if (
              !result.available
            ) {
              setItems([]);
              setSelected({});
            }
          } catch (error) {
            if (
              currentRequest !==
              scheduleRequestId.current
            ) {
              return;
            }

            setScheduleStatus({
              available: false,

              message:
                error instanceof
                Error
                  ? error.message
                  : 'Unable to check schedule availability.',
            });

            setItems([]);
            setSelected({});
          } finally {
            if (
              currentRequest ===
              scheduleRequestId.current
            ) {
              setCheckingSchedule(
                false,
              );
            }
          }
        },
        300,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    date,
    endDate,
    form.start_time,
    form.end_time,
  ]);

  /* =========================================================
     LOAD DATE-BASED RENTAL INVENTORY
     ========================================================= */

  useEffect(() => {
    if (
      !date ||
      scheduleStatus?.available !==
        true
    ) {
      setItems([]);

      return;
    }

    let cancelled = false;

    async function loadItems() {
      try {
        setLoadingItems(
          true,
        );

        const params =
          new URLSearchParams(
            {
              start_date:
                date,

              end_date:
                endDate ||
                date,
            },
          );

        const result =
          await api<
            RentalItem[]
          >(
            `/api/rentals/availability?${params.toString()}`,
          );

        if (!cancelled) {
          setItems(result);
        }
      } catch (error) {
        if (!cancelled) {
          setItems([]);

          setMessage(
            error instanceof
            Error
              ? error.message
              : 'Unable to load rental availability.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingItems(
            false,
          );
        }
      }
    }

    loadItems();

    return () => {
      cancelled = true;
    };
  }, [
    date,
    endDate,
    scheduleStatus?.available,
  ]);

  /* =========================================================
     SELECTED RENTALS
     ========================================================= */

  const lines = useMemo(
    () =>
      Object.values(
        selected,
      ).filter(
        (line) =>
          line.quantity >
          0,
      ),
    [selected],
  );

  /* =========================================================
     TOTAL
     ========================================================= */

  const total =
    useMemo(() => {
      return lines.reduce(
        (
          sum,
          line,
        ) => {
          const item =
            items.find(
              (
                candidate,
              ) =>
                candidate.id ===
                line.rental_item_id,
            );

          if (!item) {
            return sum;
          }

          const variant =
            line.rental_item_variant_id
              ? item.variants?.find(
                  (
                    candidate,
                  ) =>
                    candidate.id ===
                    line.rental_item_variant_id,
                )
              : null;

          return (
            sum +
            getUnitPrice(
              item,
              variant,
            ) *
              line.quantity
          );
        },
        0,
      );
    }, [
      lines,
      items,
    ]);

  /* =========================================================
     QUANTITY HANDLING
     ========================================================= */

  function setQuantity(
    item: RentalItem,
    quantity: number,
    variant: RentalVariant | null = null,
  ) {
    const available =
      getAvailableQuantity(
        item,
        variant,
      );

    const safeQuantity =
      Math.max(
        0,
        Math.min(
          quantity,
          available,
        ),
      );

    const key = `${item.id}:${
      variant?.id ??
      'base'
    }`;

    setSelected(
      (current) => {
        if (
          safeQuantity ===
          0
        ) {
          const copy = {
            ...current,
          };

          delete copy[key];

          return copy;
        }

        return {
          ...current,

          [key]: {
            rental_item_id:
              item.id,

            rental_item_variant_id:
              variant?.id ??
              null,

            quantity:
              safeQuantity,
          },
        };
      },
    );
  }

  function currentQuantity(
    item: RentalItem,
    variant: RentalVariant | null = null,
  ) {
    const key = `${item.id}:${
      variant?.id ??
      'base'
    }`;

    return (
      selected[key]
        ?.quantity ?? 0
    );
  }

  /* =========================================================
     LOCATION
     ========================================================= */

  function useCurrentLocation() {
    setLocationMessage(
      '',
    );

    if (
      !navigator.geolocation
    ) {
      setLocationMessage(
        'Location is not supported by this browser. Please enter the address manually.',
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(
          (current) => ({
            ...current,

            latitude:
              position.coords
                .latitude,

            longitude:
              position.coords
                .longitude,
          }),
        );

        setLocationMessage(
          'Current coordinates captured successfully.',
        );
      },

      () => {
        setLocationMessage(
          'Automatic location is unavailable. Enter the event address manually. GPS normally requires HTTPS on mobile browsers.',
        );
      },

      {
        enableHighAccuracy:
          true,

        timeout: 10000,

        maximumAge: 60000,
      },
    );
  }

  const mapsDestination =
    location.latitude !==
      null &&
    location.longitude !==
      null
      ? `${location.latitude},${location.longitude}`
      : location.address.trim();

  const mapsUrl =
    mapsDestination
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          mapsDestination,
        )}`
      : '';

  /* =========================================================
     SUBMIT
     ========================================================= */

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setMessage('');

    if (
      scheduleStatus?.available !==
      true
    ) {
      setMessage(
        'Please choose an available schedule before submitting.',
      );

      return;
    }

    if (!date) {
      setMessage(
        'Please choose a rental/event date.',
      );

      return;
    }

    if (
      endDate &&
      endDate < date
    ) {
      setMessage(
        'Return date cannot be earlier than the rental date.',
      );

      return;
    }

    if (
      lines.length ===
      0
    ) {
      setMessage(
        'Please select at least one rental item.',
      );

      return;
    }

    if (
      !form.customer_name.trim() ||
      !form.customer_email.trim() ||
      !form.customer_phone.trim()
    ) {
      setMessage(
        'Please complete your customer information.',
      );

      return;
    }

    try {
      setSubmitting(true);

      await mutate(
        '/api/bookings/custom-rental',
        {
          method: 'POST',

          body:
            JSON.stringify(
              {
                ...form,

                booking_date:
                  date,

                rental_end_date:
                  endDate ||
                  date,

                address:
                  location.address,

                latitude:
                  location.latitude,

                longitude:
                  location.longitude,

                items:
                  lines,
              },
            ),
        },
      );

      /*
       * SUCCESS:
       * clear the inline message
       * and open popup instead.
       */

      setMessage('');
      setSelected({});
      setShowSuccessModal(
        true,
      );
    } catch (error) {
      setMessage(
        error instanceof
        Error
          ? error.message
          : 'Booking failed.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =========================================================
     SUCCESS POPUP OK
     ========================================================= */

  function handleSuccessOk() {
    setShowSuccessModal(
      false,
    );

    navigate('/my-bookings');
  }

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="shell py-12 max-w-5xl">
      <p className="text-xs uppercase tracking-[.25em] text-[#c59638] font-bold">
        Build your own
        package
      </p>

      <h1 className="font-display text-5xl mt-2 mb-8">
        Custom booking
      </h1>

      <form
        onSubmit={submit}
        className="space-y-7"
      >
        {/* =================================================
            01 SCHEDULE
            ================================================= */}

        <section className="card p-6">
          <h2 className="font-display text-3xl mb-5">
            01 · Schedule
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <label>
              <span className="label">
                Rental/event
                date
              </span>

              <input
                className="field"
                type="date"
                value={date}
                onChange={(
                  event,
                ) =>
                  setDate(
                    event.target
                      .value,
                  )
                }
                required
              />
            </label>

            <label>
              <span className="label">
                Return date
              </span>

              <input
                className="field"
                type="date"
                min={
                  date ||
                  undefined
                }
                value={
                  endDate
                }
                onChange={(
                  event,
                ) =>
                  setEndDate(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label>
              <span className="label">
                Start time
              </span>

              <input
                className="field"
                type="time"
                value={
                  form.start_time
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      start_time:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                required
              />
            </label>

            <label>
              <span className="label">
                End time
              </span>

              <input
                className="field"
                type="time"
                value={
                  form.end_time
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      end_time:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                required
              />
            </label>
          </div>

          {/* AVAILABILITY RESULT */}

          {date &&
            checkingSchedule && (
              <div className="mt-5 rounded-2xl border border-[#d8d4c7] bg-[#faf8f0] px-5 py-4">
                Checking
                schedule
                availability...
              </div>
            )}

          {date &&
            !checkingSchedule &&
            scheduleStatus?.available ===
              true && (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-green-900">
                <p className="font-bold">
                  ✓ Schedule
                  available
                </p>

                <p className="mt-1 text-sm">
                  Rental
                  inventory is
                  available for
                  checking.
                </p>
              </div>
            )}

          {date &&
            !checkingSchedule &&
            scheduleStatus &&
            !scheduleStatus.available && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-5 text-red-900">
                <p className="font-bold text-lg">
                  ⚠ This
                  schedule is
                  unavailable
                </p>

                <p className="mt-2">
                  {
                    scheduleStatus.message
                  }
                </p>

                {scheduleStatus.reason && (
                  <p className="mt-3">
                    <strong>
                      Reason:
                    </strong>{' '}
                    {
                      scheduleStatus.reason
                    }
                  </p>
                )}

                {scheduleStatus.blocked_start &&
                  scheduleStatus.blocked_end && (
                    <p className="mt-2 text-sm">
                      <strong>
                        Blocked:
                      </strong>{' '}
                      {formatDateTime(
                        scheduleStatus.blocked_start,
                      )}{' '}
                      →{' '}
                      {formatDateTime(
                        scheduleStatus.blocked_end,
                      )}
                    </p>
                  )}

                <p className="mt-3 font-medium">
                  Please choose
                  another date or
                  time.
                </p>
              </div>
            )}
        </section>

        {/* =================================================
            02 RENTAL ITEMS
            ================================================= */}

        <section className="card p-6">
          <h2 className="font-display text-3xl mb-5">
            02 · Rental items
          </h2>

          {!date && (
            <div className="rounded-2xl bg-[#fff4e7] px-5 py-4 text-[#93420f]">
              Choose a date
              first to see real
              availability.
            </div>
          )}

          {date &&
            checkingSchedule && (
              <div className="rounded-2xl bg-[#f6f4ec] px-5 py-4">
                Checking whether
                the owner is
                available...
              </div>
            )}

          {date &&
            !checkingSchedule &&
            scheduleStatus &&
            !scheduleStatus.available && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-5 text-red-900">
                Rental selection
                is unavailable
                for this
                schedule.
              </div>
            )}

          {scheduleStatus?.available &&
            loadingItems && (
              <div className="rounded-2xl bg-[#f6f4ec] px-5 py-4">
                Checking tables,
                chairs, gowns and
                other rental
                inventory...
              </div>
            )}

          {scheduleStatus?.available &&
            !loadingItems &&
            items.length ===
              0 && (
              <div className="rounded-2xl bg-[#fff4e7] px-5 py-4 text-[#93420f]">
                No rental items
                are available
                for the selected
                dates.
              </div>
            )}

          {scheduleStatus?.available &&
            !loadingItems &&
            items.length > 0 && (
              <div className="space-y-5">
                {items.map(
                  (item) => {
                    const variants =
                      (
                        item.variants ??
                        []
                      ).filter(
                        (
                          variant,
                        ) =>
                          variant.is_active !==
                          false,
                      );

                    return (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-3xl border border-[#d9d8ce] p-5"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div>
                            <h3 className="font-display text-2xl">
                              {
                                item.name
                              }
                            </h3>

                            {item.description && (
                              <p className="mt-1 text-sm opacity-70 max-w-xl">
                                {
                                  item.description
                                }
                              </p>
                            )}

                            {rentalImageUrls(item).length > 0 && (
                              <button
                                type="button"
                                onClick={() => openItemPreview(item)}
                                className="mt-4 inline-flex items-center rounded-full border border-[#c59638] bg-[#fffdf8] px-4 py-2 text-sm font-bold text-[#781c1d] transition hover:bg-[#f3e5c8]"
                              >
                                {rentalImageUrls(item).length > 1
                                  ? `View item images (${rentalImageUrls(item).length})`
                                  : 'View item image'}
                              </button>
                            )}
                          </div>

                          <div className="font-bold text-lg">
                            {money(
                              item.base_price,
                            )}

                            {variants.length >
                              0 && (
                              <span className="text-sm font-normal opacity-60">
                                {' '}
                                base
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ITEM WITHOUT VARIANTS */}

                        {variants.length ===
                          0 && (
                          <RentalQuantityRow
                            label={
                              item.name
                            }
                            price={getUnitPrice(
                              item,
                            )}
                            available={getAvailableQuantity(
                              item,
                            )}
                            quantity={currentQuantity(
                              item,
                            )}
                            onChange={(
                              quantity,
                            ) =>
                              setQuantity(
                                item,
                                quantity,
                              )
                            }
                          />
                        )}

                        {/* ITEM WITH VARIANTS */}

                        {variants.length >
                          0 && (
                          <div className="mt-5 space-y-3">
                            {variants.map(
                              (
                                variant,
                              ) => (
                                <RentalQuantityRow
                                  key={
                                    variant.id
                                  }
                                  label={
                                    variant.name
                                  }
                                  price={getUnitPrice(
                                    item,
                                    variant,
                                  )}
                                  available={getAvailableQuantity(
                                    item,
                                    variant,
                                  )}
                                  quantity={currentQuantity(
                                    item,
                                    variant,
                                  )}
                                  onChange={(
                                    quantity,
                                  ) =>
                                    setQuantity(
                                      item,
                                      quantity,
                                      variant,
                                    )
                                  }
                                />
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
        </section>

        {/* =================================================
            03 CUSTOMER & LOCATION
            ================================================= */}

        <section className="card p-6">
          <h2 className="font-display text-3xl mb-5">
            03 · Customer
            &amp; location
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <label>
              <span className="label">
                Customer name
              </span>

              <input
                className="field"
                value={
                  form.customer_name
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      customer_name:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                required
              />
            </label>

            <label>
              <span className="label">
                Email
              </span>

              <input
                className="field"
                type="email"
                value={
                  form.customer_email
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      customer_email:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                required
              />
            </label>

            <label>
              <span className="label">
                Phone
              </span>

              <input
                className="field"
                value={
                  form.customer_phone
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      customer_phone:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                required
              />
            </label>

            <label>
              <span className="label">
                Delivery /
                pickup
              </span>

              <select
                className="field"
                value={
                  form.delivery_method
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      delivery_method:
                        event
                          .target
                          .value,
                    }),
                  )
                }
              >
                <option value="delivery">
                  Delivery
                </option>

                <option value="pickup">
                  Customer
                  pickup
                </option>
              </select>
            </label>
          </div>

          <div className="mt-5">
            <label>
              <span className="label">
                Event /
                delivery address
              </span>

              <textarea
                className="field min-h-24"
                value={
                  location.address
                }
                onChange={(
                  event,
                ) =>
                  setLocation(
                    (
                      current,
                    ) => ({
                      ...current,

                      address:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                placeholder="Enter the complete event or delivery address"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full border border-[#781c1d] px-5 py-3 font-semibold text-[#781c1d]"
              onClick={
                useCurrentLocation
              }
            >
              Use my current
              location
            </button>

            {mapsUrl && (
              <a
                href={
                  mapsUrl
                }
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[#781c1d] px-5 py-3 font-semibold text-[#781c1d]"
              >
                Open in
                Google Maps
              </a>
            )}
          </div>

          {location.latitude !==
            null &&
            location.longitude !==
              null && (
              <p className="mt-3 text-sm opacity-70">
                Coordinates:{' '}
                {location.latitude.toFixed(
                  6,
                )}
                ,{' '}
                {location.longitude.toFixed(
                  6,
                )}
              </p>
            )}

          {locationMessage && (
            <div className="mt-4 rounded-2xl bg-[#fff4e7] px-5 py-4 text-[#93420f]">
              {
                locationMessage
              }
            </div>
          )}

          <div className="mt-5">
            <label>
              <span className="label">
                Notes
              </span>

              <textarea
                className="field min-h-28"
                value={
                  form.notes
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      notes:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                placeholder="Special instructions, setup requests, delivery notes..."
              />
            </label>
          </div>
        </section>

        {/* =================================================
            04 SUMMARY
            ================================================= */}

        <section className="card p-6">
          <h2 className="font-display text-3xl mb-5">
            04 · Booking
            summary
          </h2>

          {lines.length ===
          0 ? (
            <p className="opacity-60">
              No rental items
              selected.
            </p>
          ) : (
            <div className="space-y-3">
              {lines.map(
                (line) => {
                  const item =
                    items.find(
                      (
                        candidate,
                      ) =>
                        candidate.id ===
                        line.rental_item_id,
                    );

                  if (!item) {
                    return null;
                  }

                  const variant =
                    line.rental_item_variant_id
                      ? item.variants?.find(
                          (
                            candidate,
                          ) =>
                            candidate.id ===
                            line.rental_item_variant_id,
                        )
                      : null;

                  const price =
                    getUnitPrice(
                      item,
                      variant,
                    );

                  return (
                    <div
                      key={`${line.rental_item_id}:${line.rental_item_variant_id ?? 'base'}`}
                      className="flex justify-between gap-4 border-b border-[#e0ddd1] pb-3"
                    >
                      <div>
                        <strong>
                          {
                            item.name
                          }
                        </strong>

                        {variant && (
                          <span className="opacity-60">
                            {' '}
                            —{' '}
                            {
                              variant.name
                            }
                          </span>
                        )}

                        <div className="text-sm opacity-60">
                          {
                            line.quantity
                          }{' '}
                          ×{' '}
                          {money(
                            price,
                          )}
                        </div>
                      </div>

                      <strong>
                        {money(
                          price *
                            line.quantity,
                        )}
                      </strong>
                    </div>
                  );
                },
              )}

              <div className="flex justify-between pt-4 text-xl">
                <strong>
                  Total
                </strong>

                <strong>
                  {money(
                    total,
                  )}
                </strong>
              </div>
            </div>
          )}
        </section>

        {/* =================================================
            ERROR / STATUS MESSAGE
            ================================================= */}

        {message && (
          <div className="rounded-2xl bg-[#f3f0e6] px-5 py-4">
            {message}
          </div>
        )}

        {/* =================================================
            SUBMIT
            ================================================= */}

        <button
          type="submit"
          disabled={
            submitting ||
            checkingSchedule ||
            scheduleStatus?.available !==
              true ||
            lines.length ===
              0
          }
          className="w-full rounded-full bg-[#781c1d] px-6 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting
            ? 'Submitting booking...'
            : scheduleStatus?.available !==
                true
              ? 'Choose an available schedule'
              : lines.length ===
                  0
                ? 'Select rental items'
                : `Submit booking · ${money(
                    total,
                  )}`}
        </button>
      </form>

      {/* =================================================
          RENTAL ITEM IMAGE MODAL
          ================================================= */}

      {previewItem && rentalImageUrls(previewItem).length > 0 && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${previewItem.name} images`}
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] bg-[#fffdf8] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewItem(null)}
              className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-[#781c1d] text-2xl font-bold text-white shadow-lg transition hover:bg-[#541214]"
              aria-label="Close item images"
            >
              ×
            </button>

            <div className="relative bg-[#f4f0e6]">
              <img
                src={rentalImageUrls(previewItem)[previewImageIndex]}
                alt={`${previewItem.name} ${previewImageIndex + 1}`}
                className="max-h-[68vh] w-full object-contain"
              />

              {rentalImageUrls(previewItem).length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewImageIndex((current) =>
                        (current - 1 + rentalImageUrls(previewItem).length) %
                        rentalImageUrls(previewItem).length,
                      )
                    }
                    className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-[#781c1d]/90 text-white shadow-lg transition hover:bg-[#541214]"
                    aria-label="Previous item image"
                  >
                    <ChevronLeft size={26} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPreviewImageIndex((current) =>
                        (current + 1) % rentalImageUrls(previewItem).length,
                      )
                    }
                    className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-[#781c1d]/90 text-white shadow-lg transition hover:bg-[#541214]"
                    aria-label="Next item image"
                  >
                    <ChevronRight size={26} />
                  </button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
                    {previewImageIndex + 1} / {rentalImageUrls(previewItem).length}
                  </div>
                </>
              )}
            </div>

            {rentalImageUrls(previewItem).length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-b border-[#e7d8c3] bg-[#fffaf0] p-3">
                {rentalImageUrls(previewItem).map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => setPreviewImageIndex(index)}
                    className={`shrink-0 overflow-hidden rounded-xl border-2 ${
                      index === previewImageIndex
                        ? 'border-[#c59638]'
                        : 'border-transparent'
                    }`}
                    aria-label={`View item image ${index + 1}`}
                  >
                    <img src={src} alt="" className="h-16 w-20 object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="p-6 text-center">
              <h3 className="font-display text-3xl text-[#541214]">
                {previewItem.name}
              </h3>
              {previewItem.description && (
                <p className="muted mx-auto mt-2 max-w-xl">
                  {previewItem.description}
                </p>
              )}
              <p className="mt-3 text-lg font-bold text-[#781c1d]">
                {money(previewItem.base_price)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          SUCCESS MODAL
          ================================================= */}

      {showSuccessModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-success-title"
        >
          <div className="w-full max-w-md rounded-[2rem] bg-[#fffdf8] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#781c1d] text-3xl font-bold text-white">
              ✓
            </div>

            <h2
              id="booking-success-title"
              className="font-display text-3xl text-[#781c1d]"
            >
              Booking
              submitted!
            </h2>

            <p className="mt-4 leading-7 text-[#877266]">
              Your booking has
              been successfully
              sent to the owner.
              You will be
              notified once it
              has been reviewed.
            </p>

            <button
              type="button"
              onClick={
                handleSuccessOk
              }
              className="mt-7 w-full rounded-full bg-[#781c1d] px-6 py-4 font-bold text-white transition hover:opacity-90"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   RENTAL QUANTITY ROW
   ========================================================= */

function RentalQuantityRow({
  label,
  price,
  available,
  quantity,
  onChange,
}: {
  label: string;
  price: number;
  available: number;
  quantity: number;

  onChange: (
    quantity: number,
  ) => void;
}) {
  return (
    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-[#f7f5ed] p-4">
      <div>
        <p className="font-semibold">
          {label}
        </p>

        <p className="text-sm opacity-60">
          {money(price)} each
        </p>

        <p
          className={`text-sm mt-1 ${
            available > 0
              ? 'text-green-700'
              : 'text-red-700'
          }`}
        >
          {available > 0
            ? `${available} available`
            : 'Unavailable'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={
            quantity <= 0
          }
          onClick={() =>
            onChange(
              quantity - 1,
            )
          }
          className="h-10 w-10 rounded-full border border-[#781c1d] text-xl disabled:opacity-30"
        >
          −
        </button>

        <div className="min-w-12 text-center text-lg font-bold">
          {quantity}
        </div>

        <button
          type="button"
          disabled={
            available <= 0 ||
            quantity >=
              available
          }
          onClick={() =>
            onChange(
              quantity + 1,
            )
          }
          className="h-10 w-10 rounded-full border border-[#781c1d] text-xl disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}