import { LocationMethodIcon } from "../components/LocationMethodIcon";
import { useEffect, useState } from "react";
import { useForm, type FieldPath, type FieldPathValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getEvent,
  listGuests,
  listInvitations,
  saveEvent,
} from "../features/events/api";
import { eventSchema, codeSchema, mapLink, slug } from "../lib/domain";
import { errorMessage } from "../lib/supabase";
import type { ClubEvent, EventInput, Guest, Invitation } from "../types/domain";
import { Empty, ErrorState, Loading } from "../components/Feedback";
import { GuestSelection } from "../features/guests/GuestSelection";
import { InvitationManager } from "../features/invitations/InvitationManager";
import { Confirm } from "../components/Confirm";
import { Switch } from "../components/Switch";
import { RangePicker } from "../components/RangePicker";
import { AgendaEditor } from "../components/AgendaEditor";
import { ImageEditor } from "../components/ImageEditor";
import { uploadVenueImage, discardVenueImage } from "../features/events/images";
export default function EventForm() {
  const { eventCode } = useParams();
  const eq = useQuery({
    queryKey: ["event", eventCode],
    enabled: !!eventCode,
    queryFn: () => getEvent(eventCode!),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const guests = useQuery({ queryKey: ["guests"], queryFn: listGuests });
  const iq = useQuery({
    queryKey: ["invitations", eq.data?.id],
    enabled: !!eq.data?.id,
    queryFn: () => listInvitations(eq.data!.id),
  });
  if (
    guests.isPending ||
    (eventCode && (eq.isPending || (eq.data && iq.isPending)))
  )
    return <Loading />;
  const error = guests.error || eq.error || iq.error;
  if (error) return <ErrorState error={error} />;
  if (eventCode && !eq.data) return <Empty>Không tìm thấy sự kiện.</Empty>;
  return (
    <EventEditor
      key={eq.data?.updated_at ?? "new"}
      event={eq.data ?? undefined}
      guests={guests.data!}
      invitations={iq.data ?? []}
    />
  );
}
function EventEditor({
  event,
  guests,
  invitations,
}: {
  event?: ClubEvent;
  guests: Guest[];
  invitations: Invitation[];
}) {
  const navigate = useNavigate(),
    cache = useQueryClient();
  const initialMethod =
    event?.location_method === "place" ||
    (!event?.maps_url && Boolean(event?.place_id))
      ? "place"
      : "url";
  const initial: EventInput = {
    code: "",
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    status: "draft",
    venue_name: "",
    address: "",
    directions: "",
    latitude: null,
    longitude: null,
    place_id: "",
    ...event,
    location_method: initialMethod,
    maps_url:
      initialMethod === "url"
        ? event?.maps_url || (event ? mapLink(event) : "") || ""
        : (event?.maps_url ?? ""),
    agenda: event?.agenda ?? [],
    venue_image_path: event?.venue_image_path ?? null,
  };
  const form = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: initial,
  });
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;
  const [selected, setSelected] = useState(invitations.map((i) => i.guest_id));
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const selectionDirty =
    JSON.stringify([...selected].sort()) !==
    JSON.stringify(invitations.map((i) => i.guest_id).sort());
  const dirty = isDirty || selectionDirty || imageFile !== null;
  const blocker = useBlocker(dirty && !saving);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty && !saving) e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, saving]);
  const change = <K extends FieldPath<EventInput>>(
    key: K,
    value: FieldPathValue<EventInput, K>,
  ) => setValue(key, value, { shouldDirty: true, shouldValidate: true });
  const field = (
    name: "title" | "code" | "venue_name" | "address" | "place_id" | "maps_url",
    label: string,
  ) => (
    <label>
      {label}
      <input
        {...register(name)}
        aria-label={label}
        aria-invalid={!!errors[name]}
      />
      {errors[name] && (
        <span className="field-error">{errors[name]?.message}</span>
      )}
    </label>
  );
  const location = watch("location_method");
  const url = mapLink(watch());
  return (
    <section className="editor" inert={saving}>
      <Link to="/admin/">Về danh sách quản trị</Link>
      <h1>{event ? "Chỉnh sửa sự kiện" : "Thêm sự kiện"}</h1>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          if (event && !values.code) {
            form.setError("code", {
              message: "Mã sự kiện đã tạo không được để trống.",
            });
            return;
          }
          if (!event && !values.code)
            values.code = slug(values.title).slice(0, 80).replace(/-+$/, "");
          const parsedCode = codeSchema.safeParse(values.code);
          if (!parsedCode.success) {
            form.setError("code", {
              message: parsedCode.error.issues[0].message,
            });
            return;
          }
          setSaving(true);
          let uploaded: string | null = null;
          try {
            if (imageFile) {
              uploaded = await uploadVenueImage(imageFile);
              values.venue_image_path = uploaded;
            }
            const saved = await saveEvent(values, selected, event);
            setImageFile(null);
            if (
              event?.venue_image_path &&
              event.venue_image_path !== saved.venue_image_path
            ) {
              try {
                await discardVenueImage(event.venue_image_path);
              } catch {
                toast.error("Sự kiện đã lưu; cần dọn ảnh cũ chưa dùng.");
              }
            }
            form.reset({ ...initial, ...saved });
            setSelected(selected);
            await cache.invalidateQueries();
            toast.success("Đã lưu sự kiện");
            navigate(`/admin/edit/${saved.code}`, { replace: true });
          } catch (error) {
            if (uploaded) {
              try {
                await discardVenueImage(uploaded);
              } catch {
                toast.error(
                  "Ảnh upload chưa gắn được ghi nhận để dọn lại trong danh sách ảnh tạm.",
                );
              }
            }
            toast.error(errorMessage(error));
          } finally {
            setSaving(false);
          }
        })}
      >
        <Switch
          checked={watch("status") === "published"}
          label={
            watch("status") === "published"
              ? "Đã công khai (lưu để áp dụng)"
              : "Bản nháp / Không công khai"
          }
          onChange={(v) => change("status", v ? "published" : "draft")}
        />
        <fieldset>
          <legend>Thông tin sự kiện</legend>
          {field("title", "Tên sự kiện *")}
          <label>
            Mô tả
            <textarea rows={5} {...register("description")} />
            {errors.description && (
              <span className="field-error">{errors.description.message}</span>
            )}
          </label>
          {field("code", "Mã sự kiện")}
          {!event && (
            <small>
              Để trống để tạo mã từ tên khi lưu lần đầu; nếu trùng hãy chỉnh mã.
            </small>
          )}
          <RangePicker
            label="Thời gian sự kiện"
            dateTime
            start={watch("starts_at")}
            end={watch("ends_at")}
            onStart={(v) => change("starts_at", v)}
            onEnd={(v) => change("ends_at", v)}
            error={errors.starts_at?.message || errors.ends_at?.message}
          />
          <p className="footnote">Giờ Việt Nam (UTC+7), 00:00–23:59.</p>
        </fieldset>
        <fieldset>
          <legend>Địa điểm</legend>
          <fieldset>
            <legend>Chọn phương thức liên kết địa điểm</legend>
            <div className="location-choices">
              {(["url", "place"] as const).map((v) => (
                <label
                  className={`location-choice ${location === v ? "selected" : ""}`}
                  key={v}
                >
                  <input
                    type="radio"
                    aria-label={
                      v === "url" ? "Google Maps URL" : "Google Place ID"
                    }
                    name="location-method"
                    checked={location === v}
                    onChange={() => change("location_method", v)}
                  />
                  <LocationMethodIcon method={v} />
                  <span>
                    <strong>
                      {v === "url" ? "Google Maps URL" : "Google Place ID"}
                    </strong>
                    <small>
                      {v === "url"
                        ? "Dán liên kết chia sẻ từ Google Maps, kể cả link rút gọn."
                        : "Dùng mã định danh chính xác của địa điểm trên Google Maps."}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="field-hint">
            {location === "url"
              ? "Mở Google Maps → Chia sẻ → Sao chép liên kết HTTPS."
              : "Nhập Place ID; nút xem trước giúp kiểm tra đúng địa điểm."}
          </p>
          {location === "url" && field("maps_url", "Google Maps URL *")}
          {location === "place" && field("place_id", "Google Place ID *")}
          {field("venue_name", "Tên địa điểm")}
          {field("address", "Địa chỉ")}
          <label>
            Hướng dẫn vị trí
            <textarea {...register("directions")} />
          </label>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer">
              Xem trước vị trí trên Google Maps
            </a>
          )}
        </fieldset>
        <ImageEditor
          file={imageFile}
          path={watch("venue_image_path")}
          disabled={saving}
          onChange={(file, remove) => {
            setImageFile(file);
            if (remove) change("venue_image_path", null);
          }}
        />
        <AgendaEditor
          items={watch("agenda") ?? []}
          onChange={(v) => change("agenda", v)}
        />
        {errors.agenda && (
          <p className="field-error" role="alert">
            Thông tin chương trình chưa hợp lệ.
          </p>
        )}
        <GuestSelection
          guests={guests}
          selected={selected}
          onChange={setSelected}
        />
        {dirty && (
          <div className="save-bar dirty-save-bar">
            <span>Có thay đổi chưa lưu</span>
            <button disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu sự kiện"}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={saving}
              onClick={() => {
                form.reset();
                setImageFile(null);
                setSelected(invitations.map((i) => i.guest_id));
              }}
            >
              Hủy thay đổi
            </button>
          </div>
        )}
      </form>
      {event && (
        <InvitationManager
          invitations={invitations}
          code={event.code}
          eventId={event.id}
        />
      )}
      {blocker.state === "blocked" && (
        <Confirm
          title="Rời trang khi chưa lưu?"
          onClose={() => blocker.reset()}
          onConfirm={() => blocker.proceed()}
        >
          Thay đổi chưa lưu sẽ bị mất.
        </Confirm>
      )}
    </section>
  );
}
